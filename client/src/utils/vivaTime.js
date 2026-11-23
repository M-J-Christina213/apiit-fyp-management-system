// Prisma @db.Time contains the Colombo wall clock in UTC components, not an instant.
export function formatVivaTime(value) {
    if (!value) return 'TBA';
    const text = String(value);
    const clock = /^\d{2}:\d{2}/.test(text) ? text.slice(0, 8) : new Date(value).toISOString().slice(11, 19);
    const instant = new Date(`2000-01-01T${clock.length === 5 ? clock + ':00' : clock}+05:30`);
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', hour: 'numeric', minute: '2-digit', hour12: true }).format(instant);
}

export function formatVivaDate(value) {
    if (!value) return 'TBA';
    const day = String(value).slice(0, 10);
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${day}T12:00:00+05:30`));
}
