const crypto = require('node:crypto');

const TIME_ZONE = 'Asia/Colombo';
const clean = value => String(value ?? '').trim();
const escapeHtml = value => clean(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const email = value => clean(value).toLowerCase();
const validEmail = value => /^[^\s@<>(),;:\\"]+@[^\s@<>(),;:\\"]+\.[a-z]{2,}$/i.test(value) && value.length <= 254;
const normalizedName = value => clean(value).toLowerCase().replace(/\b(professor|prof|doctor|dr|mr|mrs|ms)\.?\s*/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

class PublicationError extends Error {
    constructor(code, message) { super(message); this.code = code; }
}

function teamsLink(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || !['teams.microsoft.com', 'teams.live.com', 'teams.cloud.microsoft', 'teams.microsoft.us', 'teams.microsoftonline.cn'].includes(url.hostname.toLowerCase())) return null;
        return url.href;
    } catch { return null; }
}

// @db.Time is a wall clock, represented by Prisma using UTC components. It is not an instant.
function wallTime(value) {
    if (value instanceof Date) return value.toISOString().slice(11, 19);
    const str = clean(value);
    const match = str.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/) || str.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match || +match[1] > 23 || +match[2] > 59 || +(match[3] || 0) > 59) throw new PublicationError('INVALID_TIME', 'A valid viva start and end time is required.');
    return `${match[1]}:${match[2]}:${match[3] || '00'}`;
}

function scheduleTiming(schedule) {
    const date = schedule.date instanceof Date ? schedule.date.toISOString().slice(0, 10) : clean(schedule.date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new PublicationError('INVALID_DATE', 'Set the viva date before publishing.');
    const startClock = wallTime(schedule.start_time);
    const endClock = wallTime(schedule.end_time);
    const start = new Date(`${date}T${startClock}+05:30`);
    const end = new Date(`${date}T${endClock}+05:30`);
    const duration = (end - start) / 60000;
    if (!(duration > 0 && duration < 24 * 60)) throw new PublicationError('INVALID_TIME', 'Viva end time must be after its start time on the selected Sri Lanka date.');
    if (schedule.duration_mins && Number(schedule.duration_mins) !== duration) throw new PublicationError('DURATION_MISMATCH', 'The viva duration differs from its start/end times. Correct the schedule before publishing.');
    const displayTime = value => new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true }).format(value);
    return { date, startClock, endClock, duration,
        displayDate: new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' }).format(start),
        displayStart: displayTime(start), displayEnd: displayTime(end),
        // UTC is supported by Graph mailboxes. Convert before attaching the UTC label.
        start: { dateTime: start.toISOString().replace(/\.000Z$/, ''), timeZone: 'UTC' },
        end: { dateTime: end.toISOString().replace(/\.000Z$/, ''), timeZone: 'UTC' } };
}

async function resolvePeople(db, schedule) {
    const student = schedule.students;
    if (!student?.cb_no) throw new PublicationError('STUDENT_EMAIL_MISSING', 'Student ID is missing. Correct the assigned student record.');
    const studentUsers = await db.users.findMany({ where: { role: { equals: 'student', mode: 'insensitive' }, email: { startsWith: `${student.cb_no}@`, mode: 'insensitive' } }, select: { id: true, email: true, name: true } });
    const matches = studentUsers.filter(u => email(u.email).split('@')[0] === clean(student.cb_no).toLowerCase());
    if (matches.length !== 1) throw new PublicationError('STUDENT_EMAIL_MISSING', `Student ${student.student_name} (${student.cb_no}) needs one registered student account with an unambiguous email address. No invitation was sent.`);
    const people = [{ role: 'Student', id: student.id, name: clean(student.student_name), email: email(matches[0].email) }];
    for (const [role, id, record] of [['Supervisor', schedule.supervisor_id, schedule.supervisors], ['Assessor', schedule.assessor_id, schedule.assessors]]) {
        if (!id || !record || record.id !== id) throw new PublicationError('PARTICIPANT_MISSING', `Assigned ${role.toLowerCase()} is missing or does not match this viva's assignment.`);
        const address = email(record.email);
        if (!validEmail(address)) throw new PublicationError('PARTICIPANT_EMAIL_MISSING', `${role} ${record.name || `#${id}`} needs a valid email address. Correct the assigned ${role.toLowerCase()} record.`);
        const accounts = await db.users.findMany({ where: { email: { equals: address, mode: 'insensitive' } }, select: { id: true, email: true, name: true } });
        if (accounts.length > 1) throw new PublicationError('PARTICIPANT_AMBIGUOUS', `${role} email ${address} matches multiple accounts. Correct the duplicate accounts.`);
        const accountName = clean(accounts[0]?.name);
        if (accountName && normalizedName(accountName) !== normalizedName(record.name)) {
            throw new PublicationError('PARTICIPANT_IDENTITY_MISMATCH', `${role} record #${id} is named "${record.name}" but ${address} belongs to account "${accountName}". Correct the name/email assignment before publishing.`);
        }
        people.push({ role, id, name: clean(record.name), email: address });
    }
    for (const person of people) {
        if (!person.name || !validEmail(person.email)) throw new PublicationError('PARTICIPANT_EMAIL_MISSING', `${person.role} needs a correct name and valid email address.`);
    }
    const byEmail = new Map();
    for (const person of people) {
        const existing = byEmail.get(person.email);
        if (existing && normalizedName(existing.name) !== normalizedName(person.name)) throw new PublicationError('PARTICIPANT_IDENTITY_MISMATCH', `Email ${person.email} is assigned to different participant names. Correct the participant records.`);
        if (!existing) byEmail.set(person.email, person);
    }
    return { people, unique: [...byEmail.values()] };
}

function meetingDetails(schedule, period) {
    const timing = scheduleTiming(schedule);
    const requestedMode = clean(schedule.attendance_mode || schedule.mode || 'PHYSICAL').toUpperCase();
    const remoteAcademic = [schedule.supervisor_attendance_mode, schedule.assessor_attendance_mode].some(v => clean(v).toUpperCase() === 'ONLINE');
    const online = ['ONLINE', 'HYBRID'].includes(requestedMode) || remoteAcademic;
    const mode = requestedMode === 'PHYSICAL' && remoteAcademic ? 'HYBRID' : requestedMode;
    const venue = online && mode === 'ONLINE' ? 'Microsoft Teams' : clean(schedule.venue);
    if (mode !== 'ONLINE' && (!venue || /^(tba|pending|microsoft teams)$/i.test(venue))) throw new PublicationError('VENUE_MISSING', 'Set the physical viva room/venue before publishing.');
    const stage = clean(period.type || schedule.students?.batches?.stage || 'Assessment').replace(/\s*viva\s*$/i, '') || 'Assessment';
    const projects = [...new Set((schedule.students?.student_fyp_records || []).map(r => clean(r.tentative_topic)).filter(Boolean))];
    return { ...timing, online, mode, venue, stage,
        assessmentName: clean(period.name) || `${stage} Viva`,
        batch: clean(schedule.batch_code || schedule.students?.batches?.batch_code || schedule.students?.batches?.batch_intake) || 'Not recorded',
        project: projects.length === 1 ? projects[0] : null };
}

const START = '<!-- FYP_VIVA_DETAILS_START -->';
const END = '<!-- FYP_VIVA_DETAILS_END -->';
function renderInvitation(schedule, details, people, joinUrl = null) {
    const student = people.find(p => p.role === 'Student');
    const staff = role => { const p = people.find(v => v.role === role); return `${p.name} (${p.email})`; };
    const rows = [ ['Assessment', details.assessmentName], ['Student', `${student.name} (${schedule.students.cb_no})`],
        ['Batch', details.batch], ...(details.project ? [['Project title', details.project]] : []),
        ['Date', details.displayDate], ['Time', `${details.displayStart} – ${details.displayEnd}`], ['Duration', `${details.duration} minutes`],
        ['Time zone', 'Sri Lanka time (UTC+05:30)'], ['Supervisor', staff('Supervisor')], ['Assessor', staff('Assessor')],
        ['Mode', details.mode], ...(details.mode !== 'ONLINE' ? [['Venue / room', details.venue]] : []) ];
    const link = details.online && joinUrl ? teamsLink(joinUrl) : null;
    if (joinUrl && details.online && !link) throw new PublicationError('INVALID_TEAMS_URL', 'Microsoft returned an unsupported or invalid Teams join URL.');
    return `${START}<div style="margin:0;padding:16px;background-color:#f3f5f8;color:#18283b;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background-color:#ffffff;border:1px solid #dce2ea;border-radius:8px"><tr><td style="padding:24px"><p style="margin:0 0 8px;color:#36516e;font-size:12px;font-weight:bold;letter-spacing:1px">APIIT · FYP MANAGEMENT SYSTEM</p><h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#142f4d">FYP Viva Assessment</h1><p style="margin:0 0 20px">Your FYP viva has been scheduled. Please review the details below and respond to this meeting invitation.</p><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;table-layout:fixed">${rows.map(([label,value]) => `<tr><th scope="row" align="left" valign="top" width="30%" style="padding:10px 8px;border-bottom:1px solid #e2e7ee;background-color:#f5f7fa;color:#344b63;overflow-wrap:anywhere">${escapeHtml(label)}</th><td valign="top" style="padding:10px 8px;border-bottom:1px solid #e2e7ee;color:#18283b;overflow-wrap:anywhere;word-wrap:break-word">${escapeHtml(value)}</td></tr>`).join('')}</table>${link ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 12px"><tr><td bgcolor="#173f68" style="border-radius:5px;text-align:center"><a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 18px;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none">Join Microsoft Teams Meeting</a></td></tr></table>` : ''}<p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #e2e7ee;font-size:12px;color:#52677d">Scheduled through the APIIT FYP Management System. Please use Outlook’s invitation response options to accept, decline, or propose a new time.</p></td></tr></table></div>${END}`;
}

// Keep Microsoft's generated meeting blob byte-for-byte; replace only our owned section.
function replaceInvitationBody(existing, replacement, online) {
    if (!online) return replacement;
    const start = existing.indexOf(START), end = existing.indexOf(END);
    if (start < 0 || end < start) throw new PublicationError('MEETING_BODY_REVIEW_REQUIRED', 'Cannot safely replace the invitation body while preserving Microsoft Teams meeting information. Review the organizer event; no replacement meeting was created.');
    return existing.slice(0, start) + replacement + existing.slice(end + END.length);
}

function subjectFor(schedule, details, people) {
    return `FYP ${details.stage} Viva – ${people.find(p => p.role === 'Student').name} (${schedule.students.cb_no})`.replace(/[\r\n]/g, ' ');
}
const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

module.exports = { PublicationError, TIME_ZONE, email, validEmail, teamsLink, wallTime, scheduleTiming, resolvePeople, meetingDetails, renderInvitation, replaceInvitationBody, subjectFor, fingerprint };
