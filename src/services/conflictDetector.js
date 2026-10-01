// Conflict detection.
// Each role's response can include "positions": its stance on a shared decision topic, e.g.
//   { releaseSpeed: { value: 'fast', statement: 'Ship this week…', optimizesFor: 'Speed and early feedback' } }
// If two roles take different stances on the same topic, that is a conflict.
// Nothing here is invented: the sides, statements, and "optimizes for" come from the role outputs.
// The topic list only fixes the vocabulary, so a real model and the mock engine can be compared.
//
// This file has no imports, so the Node backend (server/) uses it too.

export const CONFLICT_TOPICS = {
  releaseSpeed: {
    label: 'Ship fast or review first',
    stances: { fast: 'Ship quickly to learn', careful: 'Review before release' },
    stakes: 'Shipping early gets real feedback sooner; shipping unreviewed can expose customers to preventable risk.',
    question: 'What is the smallest check that still lets you ship on your timeline?',
    defaults: { developer: 'Speed and early feedback', security: 'Avoiding preventable risk', legal: 'Launching without open compliance gaps' },
  },
  dataCollection: {
    label: 'How much customer data to collect',
    stances: { expand: 'Collect more for features', minimize: 'Collect as little as possible' },
    stakes: 'Every extra field can improve the product, but it is also data that can leak and that you must disclose and protect.',
    question: 'Which fields does the first version truly need?',
    defaults: { developer: 'Personalization', security: 'Data minimization', legal: 'Fewer privacy obligations', finance: 'Lower storage and compliance cost' },
  },
  authApproach: {
    label: 'Build login in-house or use a managed provider',
    stances: { custom: 'Build it ourselves', managed: 'Use a managed provider' },
    stakes: 'Authentication mistakes are the most common way small products get breached, but managed providers add a monthly cost and a dependency.',
    question: 'Is saving the provider’s monthly fee worth owning password security yourself?',
    defaults: { developer: 'Control and zero monthly cost', security: 'Proven, tested security', finance: 'Monthly cost' },
  },
  paymentData: {
    label: 'Where card details are stored',
    stances: { store: 'Store card details ourselves', tokenize: 'Let the processor store them' },
    stakes: 'Storing card data puts the whole app in scope for card-industry security rules.',
    question: 'Can the processor’s saved-card feature give the same experience?',
    defaults: { developer: 'Faster upgrades', security: 'Card data off our servers', legal: 'Smaller compliance scope' },
  },
  launchTiming: {
    label: 'When to launch',
    stances: { now: 'Launch as soon as it works', wait: 'Wait for reviews first' },
    stakes: 'Launching early produces a revenue or demand signal; launching before terms are reviewed can create obligations you cannot undo.',
    question: 'Can a small, invite-only beta run while the open items are reviewed?',
    defaults: { developer: 'Speed to launch', finance: 'Early revenue signal', legal: 'Compliant terms first', security: 'Reviewed release' },
  },
  spending: {
    label: 'How much to spend now',
    stances: { invest: 'Pay for tools now', lean: 'Stay on free tiers' },
    stakes: 'Paid services save founder time and reduce risk, but they shorten the runway of a small budget.',
    question: 'Which paid service, if any, is worth it before the first paying customer?',
    defaults: { developer: 'Saving build time', security: 'Reducing risk', finance: 'Protecting the runway' },
  },
  scope: {
    label: 'How much to build in the first version',
    stances: { broad: 'Build the full feature', narrow: 'Build the smallest useful slice' },
    stakes: 'A broader first version may impress customers but takes longer and adds more to secure, pay for, and disclose.',
    question: 'What is the smallest version that tests the idea?',
    defaults: { developer: 'Feature completeness', finance: 'Lower build cost', operations: 'Faster learning' },
  },
}

// Keep only positions that use a known topic and one of its stances.
// Unknown or misspelled stances are dropped rather than guessed, so they cannot create false conflicts.
export function sanitizePositions(positions) {
  const clean = {}
  if (!positions || typeof positions !== 'object') return clean
  const entries = Array.isArray(positions) ? positions.map((p) => [p?.topic, p]) : Object.entries(positions)
  entries.forEach(([key, position]) => {
    const topic = CONFLICT_TOPICS[key]
    if (!topic || !position || typeof position !== 'object') return
    const value = String(position.value || position.stance || '').trim().toLowerCase()
    if (!topic.stances[value]) return
    const statement = String(position.statement || '').trim()
    if (!statement) return
    clean[key] = { value, statement, ...(position.optimizesFor ? { optimizesFor: String(position.optimizesFor).trim() } : {}) }
  })
  return clean
}

const ROLE_NAMES = {
  developer: 'Developer',
  security: 'Security Reviewer',
  finance: 'Finance',
  legal: 'Legal',
  operations: 'Operations',
}

function joinNames(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// Group every stated position by topic and report topics where roles took different stances.
export function detectConflicts(responses) {
  const byTopic = {}
  Object.entries(responses || {}).forEach(([roleId, response]) => {
    if (!response || response.failed) return
    Object.entries(sanitizePositions(response.positions)).forEach(([key, position]) => {
      const topic = CONFLICT_TOPICS[key]
      byTopic[key] = byTopic[key] || []
      byTopic[key].push({
        roleId,
        value: position.value,
        stance: topic.stances[position.value],
        statement: position.statement,
        optimizesFor: position.optimizesFor || topic.defaults[roleId] || topic.stances[position.value],
      })
    })
  })

  const conflicts = []
  Object.entries(byTopic).forEach(([key, sides]) => {
    const values = [...new Set(sides.map((s) => s.value))]
    if (values.length < 2) return
    const topic = CONFLICT_TOPICS[key]

    // "Developer (Speed and early feedback) wants to ship quickly to learn; Security Reviewer (…) wants to review before release."
    const camps = values.map((value) => {
      const members = sides.filter((s) => s.value === value)
      const who = joinNames(members.map((m) => `the ${ROLE_NAMES[m.roleId] || m.roleId}`))
      const goals = [...new Set(members.map((m) => m.optimizesFor.toLowerCase()))].join(' and ')
      return `${who} ${members.length > 1 ? 'are' : 'is'} optimizing for ${goals} (“${topic.stances[value].toLowerCase()}”)`
    })
    const why = `${camps.join('; ')}. ${topic.stakes}`

    conflicts.push({
      key,
      label: topic.label,
      why,
      stakes: topic.stakes,
      question: topic.question,
      roles: sides.map((s) => s.roleId),
      optimizes: Object.fromEntries(sides.map((s) => [s.roleId, s.optimizesFor])),
      sides,
    })
  })
  return conflicts
}

// Text description of the allowed topics, used in real-model prompts.
export function describeTopicsForPrompt() {
  return Object.entries(CONFLICT_TOPICS)
    .map(([key, topic]) => `- ${key} (${topic.label}): ${Object.keys(topic.stances).map((v) => `"${v}" = ${topic.stances[v]}`).join(', ')}`)
    .join('\n')
}
