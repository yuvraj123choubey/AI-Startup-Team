// Human-readable worker status, e.g. "Reviewing…" for the Security role while it works.
// Statuses: ready · waiting · working · done · failed
export function statusLabel(role, status) {
  if (status === 'working') return `${role.activeVerb}…`
  if (status === 'waiting') return 'Queued'
  if (status === 'done') return 'Complete'
  if (status === 'failed') return 'Failed'
  return 'Ready'
}
