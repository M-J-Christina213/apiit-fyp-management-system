const prisma = require('../config/prisma');
const publisher = require('../services/vivaPublicationService');
const VivaAuditService = require('../services/vivaAuditService');

exports.publicationSummaries = async schedules => {
    let rows;
    try { rows = await publisher.table().findMany({ where: { viva_schedule_id: { in: schedules.map(s => s.id) } } }); }
    catch (error) {
        if (!['P2021', 'PUBLICATION_SCHEMA_REQUIRED'].includes(error.code)) throw error;
        return new Map(schedules.map(s => [s.id, { status: 'FAILED', last_error: 'Apply the canonical viva meeting migration and regenerate Prisma before publishing. Local schedules are retained.' }]));
    }
    return new Map(schedules.map(s => {
        const row = rows.find(r => r.viva_schedule_id === s.id);
        return [s.id, row ? { status: row.status, last_error: row.last_error, organizer_email: row.organizer_email, attendee_responses: row.attendee_responses, updated_at: row.updated_at } : {
            status: s.outlook_event_id ? 'FAILED' : 'NOT_PUBLISHED',
            last_error: s.outlook_event_id ? 'Legacy calendar event: ownership review and deliberate cleanup required. It has not been modified.' : null
        }];
    }));
};

exports.publicationAfterEdit = async scheduleId => {
    const state = await publisher.publicationState(scheduleId);
    const schedule = await prisma.viva_schedules.findUnique({ where: { id: scheduleId } });
    if (state?.graph_event_id) {
        const result = await publisher.publish(scheduleId);
        if (!result.success) await prisma.viva_schedules.update({ where: { id: scheduleId }, data: { outlook_sync_status: result.status, outlook_sync_error: result.error } });
        return result;
    }
    if (schedule?.outlook_event_id) return { success: false, status: 'FAILED', error: 'Legacy event ownership requires deliberate review; the calendar event was not changed.' };
    return state?.schemaRequired ? { success: false, status: 'FAILED', error: state.last_error } : { success: true, status: 'NOT_PUBLISHED', message: 'Local schedule saved; invitation not published.' };
};

async function publishPeriod(req, res, finalize = false) {
    const periodId = Number(req.params.id || req.params.periodId);
    if (!Number.isSafeInteger(periodId) || periodId <= 0) return res.status(400).json({ error: 'Invalid Viva Period ID' });
    try {
        const period = await prisma.viva_periods.findUnique({ where: { id: periodId }, include: { viva_schedules: true } });
        if (!period) return res.status(404).json({ error: 'Viva Period not found' });
        if (period.status === 'CANCELLED') return res.status(409).json({ error: 'Cancelled periods cannot be republished.' });
        const schedules = period.viva_schedules.filter(s => s.status !== 'CANCELLED');
        if (!schedules.length) return res.status(409).json({ error: 'There are no active viva sessions to publish.' });
        if (finalize) {
            await prisma.$transaction([
                prisma.viva_periods.update({ where: { id: periodId }, data: { status: 'FINALIZED' } }),
                prisma.viva_schedules.updateMany({ where: { viva_period_id: periodId, status: { notIn: ['CANCELLED', 'PUBLISHED'] } }, data: { status: 'FINALIZED', finalized_at: new Date() } })
            ]);
        }
        const results = [];
        for (const schedule of schedules) {
            const result = await publisher.publish(schedule.id);
            results.push({ scheduleId: schedule.id, ...result });
            await prisma.viva_schedules.update({ where: { id: schedule.id }, data: {
                outlook_sync_status: result.status, outlook_sync_error: result.success ? null : result.error,
                ...(result.success ? { status: 'PUBLISHED' } : {})
            } });
        }
        const syncSuccessCount = results.filter(r => r.success).length;
        const syncFailedCount = results.length - syncSuccessCount;
        if (!syncFailedCount) await prisma.viva_periods.update({ where: { id: periodId }, data: { status: 'PUBLISHED' } });
        await VivaAuditService.log({ viva_period_id: periodId, action: 'INVITATION_PUBLICATION', performed_by: req.headers['x-user-email'] || 'Admin', role: 'ADMIN',
            details: `${syncSuccessCount} invitation(s) accepted by Microsoft, ${syncFailedCount} failed. Delivery/acceptance not verified.` });
        const message = `${syncSuccessCount} invitation(s) accepted by Microsoft; ${syncFailedCount} failed. Local schedules are retained. Attendee acceptance is not implied.`;
        return res.status(syncFailedCount ? syncSuccessCount ? 207 : 422 : 200).json({ message,
            ...(syncFailedCount ? { error: results.find(r => !r.success).error } : {}),
            syncSuccessCount, syncFailedCount, successCount: syncSuccessCount, failCount: syncFailedCount, results });
    } catch (error) {
        return res.status(500).json({ error: 'Local schedules were retained, but invitation publishing failed.', details: error.message });
    }
}

exports.finalizeVivaPeriod = (req, res) => publishPeriod(req, res, true);
exports.publishVivaPeriod = (req, res) => publishPeriod(req, res);
exports.retryOutlookSync = async (req, res) => {
    const scheduleId = req.params.scheduleId ? Number(req.params.scheduleId) : null;
    const periodId = Number(req.params.periodId || req.query.periodId);
    if (!scheduleId) return publishPeriod({ ...req, params: { ...req.params, periodId } }, res);
    if (!Number.isSafeInteger(scheduleId) || scheduleId <= 0) return res.status(400).json({ error: 'Invalid schedule ID' });
    const result = await publisher.publish(scheduleId);
    await prisma.viva_schedules.update({ where: { id: scheduleId }, data: { outlook_sync_status: result.status, outlook_sync_error: result.success ? null : result.error } });
    return res.status(result.success ? 200 : result.status === 'PUBLISHING' ? 409 : 422).json({ ...result, message: result.message || result.error });
};
exports.previewVivaInvitation = async (req, res) => {
    const id = Number(req.params.scheduleId);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid schedule ID' });
    try { return res.json(await publisher.preview(id)); }
    catch (error) { return res.status(422).json({ error: error.message, code: error.code }); }
};

exports.deleteSchedule = async (req, res) => {
    const id = Number(req.params.scheduleId);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid schedule ID' });
    try {
        const result = await publisher.cancel(id);
        if (!result.success) return res.status(409).json({ error: result.error, code: result.code });
        await prisma.viva_schedules.update({ where: { id }, data: { status: 'CANCELLED', outlook_sync_status: 'CANCELLED', outlook_sync_error: null } });
        return res.json({ message: result.message, status: 'CANCELLED' });
    } catch (error) { return res.status(500).json({ error: error.message }); }
};

exports.deleteVivaPeriod = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid period ID' });
    try {
        const schedules = await prisma.viva_schedules.findMany({ where: { viva_period_id: id }, include: { viva_outlook_events: true } });
        for (const schedule of schedules) {
            const publication = await publisher.publicationState(schedule.id);
            if (publication || schedule.outlook_event_id || schedule.viva_outlook_events.length) return res.status(409).json({ error: 'This period has publication history or requires schema verification. Cancel its meetings explicitly and retain their history. Review legacy calendar events separately.' });
        }
        await prisma.viva_periods.delete({ where: { id } });
        return res.json({ message: 'Unpublished Viva Period deleted.' });
    } catch (error) { return res.status(500).json({ error: error.message }); }
};

exports.cancelPeriodMeetings = async schedules => {
    // Validate legacy ownership before issuing any cancellation.
    for (const schedule of schedules) {
        const row = await publisher.publicationState(schedule.id);
        if (row?.schemaRequired || (!row?.graph_event_id && schedule.outlook_event_id)) return { success: false, error: row?.last_error || 'Legacy organizer ownership needs deliberate review. No automatic admin-calendar cleanup is permitted.' };
    }
    const results = [];
    for (const schedule of schedules) {
        const result = await publisher.cancel(schedule.id);
        results.push({ scheduleId: schedule.id, ...result });
        if (result.success) await prisma.viva_schedules.update({ where: { id: schedule.id }, data: { status: 'CANCELLED', outlook_sync_status: 'CANCELLED' } });
    }
    return { success: results.every(r => r.success), error: results.find(r => !r.success)?.error, results };
};
