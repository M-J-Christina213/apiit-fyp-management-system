import React from 'react';

export default function VivaPublicationStatus({ schedule }) {
    const publication = schedule.publication;
    const status = publication?.status || (schedule.outlook_sync_status === 'INVITATION_SENT' ? 'INVITATION_SENT' : schedule.outlook_event_id ? 'FAILED' : 'NOT_PUBLISHED');
    const labels = { NOT_PUBLISHED: 'Not published', PUBLISHING: 'Publishing', INVITATION_SENT: 'Invitation sent', FAILED: 'Failed', CANCELLED: 'Cancelled' };
    const error = publication?.last_error || schedule.outlook_sync_error || (schedule.outlook_event_id && !publication ? 'Legacy event ownership needs review.' : null);
    return <div className="space-y-1 text-xs">
        <span className={`inline-flex rounded px-2 py-1 font-semibold ${status === 'INVITATION_SENT' ? 'bg-emerald-50 text-emerald-800' : status === 'FAILED' ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-700'}`}>{labels[status] || 'Not published'}</span>
        {publication?.organizer_email && <p className="break-all text-slate-600">Organizer: {publication.organizer_email}</p>}
        {error && <p role="status" className="max-w-sm text-red-700">{error}</p>}
        {status === 'INVITATION_SENT' && <p className="text-slate-500">Microsoft accepted the invitation. Delivery and acceptance are not verified.</p>}
        {publication?.attendee_responses?.map(p => <p key={p.email} className="text-slate-600">{p.name || p.email}: {p.response || 'notResponded'}</p>)}
    </div>;
}
