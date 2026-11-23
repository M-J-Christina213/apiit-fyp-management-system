const { randomUUID } = require('node:crypto');
const {
    PublicationError, email, validEmail, teamsLink, resolvePeople, meetingDetails,
    renderInvitation, replaceInvitationBody, subjectFor, fingerprint
} = require('./vivaInvitation');

const GRAPH = 'https://graph.microsoft.com/v1.0';
const PROPERTY = 'String {d9d4ad2e-2d76-42a1-9f43-ed07acee9ed1} Name APIITFypVivaPublication';
const include = { students: { include: { batches: true, student_fyp_records: true } }, supervisors: true, assessors: true, viva_periods: true, viva_outlook_events: true };

class VivaMeetingPublisher {
    constructor({ db, getAccessToken, graphFetch = (...args) => fetch(...args), config = process.env }) {
        this.db = db;
        this.getAccessToken = getAccessToken;
        this.graphFetch = graphFetch;
        this.config = config;
    }

    table() {
        if (!this.db.viva_meeting_publications) throw new PublicationError('PUBLICATION_SCHEMA_REQUIRED', 'Apply the canonical viva meeting migration and regenerate Prisma Client before publishing. Local schedules are retained.');
        return this.db.viva_meeting_publications;
    }

    async context(id) {
        const schedule = await this.db.viva_schedules.findUnique({ where: { id: Number(id) }, include });
        if (!schedule) throw new PublicationError('SCHEDULE_NOT_FOUND', 'Viva schedule not found.');
        const participants = await resolvePeople(this.db, schedule);
        return { schedule, period: schedule.viva_periods, ...participants, details: meetingDetails(schedule, schedule.viva_periods) };
    }

    async organizer(context) {
        const mode = this.config.VIVA_ORGANIZER_MODE;
        let address, authUserId;
        if (['assigned_supervisor', 'assigned_assessor'].includes(mode)) {
            const role = mode === 'assigned_supervisor' ? 'Supervisor' : 'Assessor';
            address = context.people.find(p => p.role === role).email;
            const users = await this.db.users.findMany({ where: { email: { equals: address, mode: 'insensitive' }, is_active: true }, select: { id: true } });
            if (users.length !== 1) throw new PublicationError('ORGANIZER_NOT_CONNECTED', `The assigned ${role.toLowerCase()} needs one active local account connected to their own Microsoft calendar.`);
            authUserId = users[0].id;
        } else if (mode === 'scheduling_mailbox') {
            address = email(this.config.VIVA_ORGANIZER_EMAIL);
            authUserId = Number(this.config.VIVA_ORGANIZER_AUTH_USER_ID);
            if (!validEmail(address) || !Number.isSafeInteger(authUserId) || authUserId <= 0) throw new PublicationError('ORGANIZER_NOT_CONFIGURED', 'IT must configure the approved VIVA_ORGANIZER_EMAIL and its explicitly authorized VIVA_ORGANIZER_AUTH_USER_ID. No admin-calendar fallback is allowed.');
        } else {
            throw new PublicationError('ORGANIZER_NOT_CONFIGURED', 'No authorized viva organizer is configured. Choose assigned_supervisor, assigned_assessor, or an institution-approved scheduling_mailbox in VIVA_ORGANIZER_MODE. Local schedules are retained.');
        }
        return { email: address, authUserId, access: this.config.VIVA_ORGANIZER_ACCESS || 'own', calendarId: this.config.VIVA_ORGANIZER_CALENDAR_ID || null };
    }

    async graph(auth, method, route, body) {
        let response;
        try {
            response = await this.graphFetch(GRAPH + route, { method, headers: {
                Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json',
                Prefer: 'IdType="ImmutableId", outlook.timezone="UTC"'
            }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
        } catch (error) {
            const failure = new PublicationError('GRAPH_CONNECTION_FAILED', `Microsoft did not confirm the request (${error.name || 'network error'}). Retry to reconcile the same meeting; no replacement meeting will be created.`);
            failure.uncertain = true;
            throw failure;
        }
        let data;
        try { data = response.status === 204 || response.status === 202 ? {} : await response.json(); }
        catch {
            const failure = new PublicationError('GRAPH_INVALID_RESPONSE', 'Microsoft returned an unreadable response. Reconcile the existing attempt before retrying; no replacement meeting will be created.');
            failure.uncertain = true;
            throw failure;
        }
        if (!response.ok || data.error) {
            const failure = new PublicationError(data.error?.code || 'GRAPH_ERROR', `Microsoft Graph ${response.status}: ${data.error?.message || 'Calendar request failed'}. Check the organizer connection, Exchange calendar delegation and Teams capabilities.`);
            failure.httpStatus = response.status;
            failure.uncertain = response.status >= 500;
            throw failure;
        }
        return data;
    }

    async authorize(organizer, online) {
        const auth = await this.getAccessToken(organizer.authUserId);
        if (!auth?.token) throw new PublicationError('ORGANIZER_NOT_CONNECTED', 'The explicitly configured organizer credential account must connect Microsoft. Attendees do not need to connect Outlook.');
        const me = await this.graph(auth, 'GET', '/me?$select=id,mail,userPrincipalName');
        const identities = [me.mail, me.userPrincipalName].map(email).filter(Boolean);
        if (!identities.includes(email(auth.email))) throw new PublicationError('TOKEN_OWNER_MISMATCH', 'The connected Microsoft identity differs from the saved credential account. Reconnect the configured account.');
        const own = identities.includes(organizer.email);
        let scopes;
        try { scopes = String(JSON.parse(Buffer.from(auth.token.split('.')[1], 'base64url')).scp || '').split(' '); }
        catch { scopes = String(auth.scopes || '').split(' '); }
        if (!own && organizer.access !== 'shared') throw new PublicationError('ORGANIZER_PERMISSION_REQUIRED', 'The token belongs to another mailbox. IT must explicitly authorize shared-calendar access; changing the Graph URL does not grant access.');
        const required = own ? 'Calendars.ReadWrite' : 'Calendars.ReadWrite.Shared';
        if (!scopes.includes(required)) throw new PublicationError('ORGANIZER_SCOPE_REQUIRED', `The connected token lacks ${required}. Grant consent and reconnect the configured credential account. Shared access also requires Exchange calendar delegation.`);
        const mailbox = `/users/${encodeURIComponent(organizer.email)}`;
        const calendarRoute = organizer.calendarId ? `${mailbox}/calendars/${encodeURIComponent(organizer.calendarId)}` : `${mailbox}/calendar`;
        const calendar = await this.graph(auth, 'GET', calendarRoute);
        if (email(calendar.owner?.address) !== organizer.email || calendar.canEdit !== true || !calendar.id) throw new PublicationError('ORGANIZER_PERMISSION_REQUIRED', 'Microsoft did not verify an editable calendar owned by the configured organizer. IT must grant the correct Exchange calendar delegate/editor access.');
        if (online && !calendar.allowedOnlineMeetingProviders?.includes('teamsForBusiness')) throw new PublicationError('TEAMS_NOT_AVAILABLE', 'The organizer calendar cannot provision Teams meetings. IT must enable the organizer mailbox’s Exchange/Teams capabilities and meeting policy.');
        return { auth, organizer: { ...organizer, calendarId: calendar.id, tokenOwner: email(me.mail || me.userPrincipalName) }, events: `${mailbox}/calendars/${encodeURIComponent(calendar.id)}/events` };
    }

    async preview(id) {
        const context = await this.context(id);
        let organizer = null, organizerError = null;
        try { organizer = await this.organizer(context); } catch (error) { organizerError = error.message; }
        return { scheduleId: Number(id), subject: subjectFor(context.schedule, context.details, context.people),
            html: renderInvitation(context.schedule, context.details, context.people),
            participants: context.people, organizer, organizerError, authorization: 'Not checked in dry run',
            start: context.details.start, end: context.details.end, timeZone: 'Asia/Colombo',
            online: context.details.online, note: 'Dry run only. No event, invitation or database record was created. Teams link is provisioned only when publishing.' };
    }

    async save(id, owner, data) {
        const saved = await this.table().updateMany({ where: { viva_schedule_id: id, lease_owner: owner }, data });
        if (saved.count !== 1) throw new PublicationError('PUBLICATION_LOCK_LOST', 'Another publication operation took over. Retry to reconcile the canonical event.');
    }

    async publicationState(id) {
        try { return await this.table().findUnique({ where: { viva_schedule_id: Number(id) } }); }
        catch (error) {
            if (['P2021', 'PUBLICATION_SCHEMA_REQUIRED'].includes(error.code)) return { status: 'FAILED', last_error: 'Canonical meeting database migration/Prisma regeneration required. Existing schedules are retained.', schemaRequired: true };
            throw error;
        }
    }

    async run(id, operation) {
        id = Number(id);
        let owner;
        try {
            const schedule = await this.db.viva_schedules.findUnique({ where: { id }, include: { viva_outlook_events: true } });
            if (!schedule) throw new PublicationError('SCHEDULE_NOT_FOUND', 'Schedule not found.');
            try { await this.table().upsert({ where: { viva_schedule_id: id }, update: {}, create: { viva_schedule_id: id, transaction_id: randomUUID() } }); }
            catch (error) { if (error.code !== 'P2002') throw error; }
            const previous = await this.table().findUnique({ where: { viva_schedule_id: id } });
            if (previous.status === 'CANCELLED') return { success: operation === 'cancel', status: 'CANCELLED', error: operation === 'publish' ? 'Cancelled meetings are not recreated automatically.' : undefined, message: 'Meeting already cancelled.' };
            owner = randomUUID();
            const claim = await this.table().updateMany({ where: { viva_schedule_id: id, OR: [ { lease_expires_at: null }, { lease_expires_at: { lt: new Date() } } ] },
                data: { lease_owner: owner, lease_expires_at: new Date(Date.now() + 120000), status: 'PUBLISHING', last_error: null } });
            if (claim.count !== 1) return { success: false, status: 'PUBLISHING', code: 'PUBLICATION_IN_PROGRESS', error: 'A publication is already in progress. Wait, then refresh; no second meeting was created.' };
            const row = await this.table().findUnique({ where: { viva_schedule_id: id } });
            if (operation === 'cancel') return await this.cancelClaimed(id, owner, row, schedule);
            if (row.cancellation_requested || schedule.status === 'CANCELLED') throw new PublicationError('MEETING_CANCELLED', 'This meeting was cancelled or has a pending cancellation. It will not be recreated automatically.');
            return await this.publishClaimed(id, owner, row);
        } catch (error) {
            const message = ['P2021', 'PUBLICATION_SCHEMA_REQUIRED'].includes(error.code) ? 'Apply the canonical viva meeting migration and regenerate Prisma Client before publishing. Local schedules are retained.' : error.message;
            if (owner) await this.table().updateMany({ where: { viva_schedule_id: id, lease_owner: owner }, data: { status: 'FAILED', last_error: message } }).catch(() => {});
            return { success: false, status: 'FAILED', code: error.code || 'PUBLICATION_FAILED', error: message };
        } finally {
            if (owner) await this.table().updateMany({ where: { viva_schedule_id: id, lease_owner: owner }, data: { lease_owner: null, lease_expires_at: null } }).catch(() => {});
        }
    }

    async publishClaimed(id, owner, row) {
        const context = await this.context(id);
        if (!row.graph_event_id && (context.schedule.outlook_event_id || context.schedule.viva_outlook_events?.length)) throw new PublicationError('LEGACY_EVENT_REVIEW_REQUIRED', 'This viva has legacy calendar entries with unverified ownership. Review/cancel them deliberately in the original organizer calendar before republication. No legacy event was changed or deleted.');
        if (!row.graph_event_id && !['FINALIZED', 'PUBLISHED'].includes(context.schedule.status)) throw new PublicationError('NOT_FINALIZED', 'Finalize the local viva schedule before sending its invitation.');
        const desiredOrganizer = await this.organizer(context);
        if (row.organizer_email && (row.organizer_email !== desiredOrganizer.email || row.auth_user_id !== desiredOrganizer.authUserId || (desiredOrganizer.calendarId && row.organizer_calendar_id !== desiredOrganizer.calendarId))) throw new PublicationError('ORGANIZER_CHANGED', 'This meeting is bound to its saved organizer/calendar. Restore that configuration; it cannot be moved by creating a replacement event.');
        if (row.organizer_calendar_id) desiredOrganizer.calendarId = row.organizer_calendar_id;
        const authorized = await this.authorize(desiredOrganizer, context.details.online);
        const { auth, organizer, events } = authorized;
        await this.save(id, owner, { organizer_email: organizer.email, organizer_calendar_id: organizer.calendarId, auth_user_id: organizer.authUserId, token_owner_email: organizer.tokenOwner });
        let event;
        if (row.graph_event_id) event = await this.graph(auth, 'GET', `${events}/${encodeURIComponent(row.graph_event_id)}`);
        else if (row.creation_uncertain) {
            const filter = `singleValueExtendedProperties/Any(ep: ep/id eq '${PROPERTY}' and ep/value eq '${row.transaction_id}')`;
            const found = await this.graph(auth, 'GET', `${events}?${new URLSearchParams({ '$filter': filter, '$expand': 'singleValueExtendedProperties' })}`);
            if (found.value?.length !== 1) throw new PublicationError('CREATION_RECONCILIATION_REQUIRED', 'A previous create attempt may have reached Microsoft. The canonical event could not be uniquely reconciled; no second create was attempted. Ask IT to review the organizer calendar, then retry.');
            event = found.value[0];
            await this.save(id, owner, { graph_event_id: event.id, creation_uncertain: false });
        }
        const subject = subjectFor(context.schedule, context.details, context.people);
        const attendees = context.unique.filter(p => p.email !== organizer.email).map(p => ({ emailAddress: { name: p.name, address: p.email }, type: 'required' }));
        const common = { subject, start: context.details.start, end: context.details.end,
            location: { displayName: context.details.venue }, showAs: 'busy', isReminderOn: true, reminderMinutesBeforeStart: 15, responseRequested: true };
        if (!event) {
            const payload = { ...common, transactionId: row.transaction_id, body: { contentType: 'HTML', content: renderInvitation(context.schedule, context.details, context.people) },
                // Provision one organizer event first, then invite everyone once its Teams link is ready.
                attendees: [], singleValueExtendedProperties: [{ id: PROPERTY, value: row.transaction_id }],
                ...(context.details.online ? { isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness' } : {}) };
            await this.save(id, owner, { creation_uncertain: true });
            try { event = await this.graph(auth, 'POST', events, payload); }
            catch (error) { if (!error.uncertain) await this.save(id, owner, { creation_uncertain: false }); throw error; }
            if (!event.id) throw new PublicationError('CREATION_RECONCILIATION_REQUIRED', 'Microsoft returned no event ID. Retry reconciliation; no replacement event will be sent.');
            await this.save(id, owner, { graph_event_id: event.id, creation_uncertain: false });
        }
        if (event.isCancelled) throw new PublicationError('MEETING_CANCELLED', 'The canonical organizer event was cancelled. It will not be recreated automatically.');
        if (event.organizer && email(event.organizer.emailAddress?.address) !== organizer.email) throw new PublicationError('ORGANIZER_MISMATCH', 'The returned event organizer does not match the verified calendar owner. No invitation update was sent.');
        if (event.isOrganizer === false) throw new PublicationError('ORGANIZER_MISMATCH', 'Microsoft returned an attendee copy instead of the organizer event.');
        if (context.details.online && !event.isOnlineMeeting) throw new PublicationError('MEETING_MODE_REVIEW_REQUIRED', 'This existing physical event has no Teams meeting. Review the organizer event before changing meeting mode; no unrelated Teams meeting was created.');
        if (context.details.online && !teamsLink(event.onlineMeeting?.joinUrl)) {
            event = await this.graph(auth, 'GET', `${events}/${encodeURIComponent(event.id)}`);
            if (!teamsLink(event.onlineMeeting?.joinUrl)) throw new PublicationError('TEAMS_PROVISIONING', 'The canonical event exists, but Teams is still being provisioned or its URL is invalid. Retry publishing this same event. No attendee invitation was sent yet.');
        }
        const link = context.details.online ? teamsLink(event.onlineMeeting.joinUrl) : null;
        const owned = renderInvitation(context.schedule, context.details, context.people, link);
        const hash = fingerprint({ ...common, attendees, body: owned });
        if (row.content_hash !== hash) {
            const body = replaceInvitationBody(event.body?.content || '', owned, Boolean(event.isOnlineMeeting));
            const updated = await this.graph(auth, 'PATCH', `${events}/${encodeURIComponent(event.id)}`, { ...common, attendees, body: { contentType: 'HTML', content: body } });
            event = { ...event, ...updated, id: event.id };
        }
        const responses = (event.attendees || []).map(a => ({ email: email(a.emailAddress?.address), name: a.emailAddress?.name, response: a.status?.response || 'notResponded', time: a.status?.time || null }));
        await this.save(id, owner, { status: 'INVITATION_SENT', last_error: null, content_hash: hash, attendee_responses: responses, teams_join_url: link });
        await this.db.viva_schedules.update({ where: { id }, data: { outlook_event_id: event.id, teams_join_url: link, outlook_sync_status: 'INVITATION_SENT', outlook_sync_error: null } });
        return { success: true, status: 'INVITATION_SENT', eventId: event.id, organizer: organizer.email, teamsJoinUrl: link, responses,
            unchanged: row.content_hash === hash, message: 'Microsoft accepted the meeting invitation/update. Delivery and attendee acceptance are not verified.' };
    }

    async cancelClaimed(id, owner, row, schedule) {
        if (!row.graph_event_id) {
            if (schedule.outlook_event_id || schedule.viva_outlook_events?.length) throw new PublicationError('LEGACY_EVENT_REVIEW_REQUIRED', 'Legacy calendar event ownership is unknown. Cancel it deliberately in its original organizer calendar; no admin event was deleted.');
            if (row.creation_uncertain) throw new PublicationError('CREATION_RECONCILIATION_REQUIRED', 'Reconcile the uncertain organizer event before cancellation. No calendar entry was deleted.');
            await this.save(id, owner, { status: 'CANCELLED', cancellation_requested: true });
            return { success: true, status: 'CANCELLED', message: 'Unpublished local viva cancelled.' };
        }
        const organizer = { email: row.organizer_email, authUserId: row.auth_user_id, calendarId: row.organizer_calendar_id, access: this.config.VIVA_ORGANIZER_ACCESS || 'own' };
        const { auth, events } = await this.authorize(organizer, false);
        await this.save(id, owner, { cancellation_requested: true });
        try {
            const event = await this.graph(auth, 'GET', `${events}/${encodeURIComponent(row.graph_event_id)}`);
            if (email(event.organizer?.emailAddress?.address) !== organizer.email || event.isOrganizer === false) throw new PublicationError('ORGANIZER_MISMATCH', 'Cancellation requires the saved organizer’s event and authorization.');
            if (!event.isCancelled) await this.graph(auth, 'POST', `${events}/${encodeURIComponent(row.graph_event_id)}/cancel`, { comment: 'This FYP viva has been cancelled. Please refer to the FYP Management System for further scheduling information.' });
        } catch (error) { if (error.httpStatus !== 404) throw error; }
        await this.save(id, owner, { status: 'CANCELLED', last_error: null });
        return { success: true, status: 'CANCELLED', message: 'Microsoft accepted cancellation of the canonical organizer meeting.' };
    }

    publish(id) { return this.run(id, 'publish'); }
    cancel(id) { return this.run(id, 'cancel'); }
}

module.exports = { VivaMeetingPublisher, PROPERTY };
