const text = value => String(value ?? '').trim();

export function filterBatches(batches, search, stage) {
    const terms = text(search).toLowerCase().split(/\s+/).filter(Boolean);
    return batches.filter(batch => {
        const matchesStage = stage === 'All stages' || text(batch.stage).toLowerCase() === stage.toLowerCase();
        // Intake identifies the cohort; startDate identifies when its FYP begins.
        const intakeYear = text(batch.intake).match(/\b(?:19|20)\d{2}\b/)?.[0] || '';
        const searchable = [batch.batchCode, batch.intake, intakeYear].map(text).join(' ').toLowerCase();
        return matchesStage && terms.every(term => searchable.includes(term));
    });
}

export function getBatchLabels(batches) {
    const base = batch => [batch.batchCode, batch.intake, batch.stage].map(text).filter(Boolean).join(' · ');
    const counts = new Map();
    batches.forEach(batch => {
        const key = base(batch).toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return new Map(batches.map(batch => {
        const label = base(batch);
        return [String(batch.id), !label ? `Batch ID ${batch.id}` : counts.get(label.toLowerCase()) > 1 ? `${label} · ID ${batch.id}` : label];
    }));
}
