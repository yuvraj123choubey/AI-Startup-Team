// Simulated agents for Build mode (AI_MODE=mock). No API key needed.
// The code they write is real and really built; the security review uses the real
// automated scanner. Only the "thinking" is simulated.
import { FIX_DESCRIPTIONS, FIX_FOR_RULE, analyzeTask, describePlan, generateProjectFiles, planPages } from '../mock/mockProjectGenerator.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function parseMoney(value) {
  const n = parseFloat(String(value || '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

export const mockAgents = {
  label: 'Simulated',

  async developerBuild({ project, brief }) {
    await sleep(1200)
    const spec = analyzeTask(project.name, project.task)
    const files = generateProjectFiles(spec, new Set(), brief)
    const pages = planPages(spec.features)
    return {
      summary: `Built a React + Vite app with ${pages.length} page${pages.length === 1 ? '' : 's'} (${pages.map((p) => p.title).join(', ')}), shared layout, and form validation.`,
      plan: describePlan(spec),
      files,
      notes: ['First draft: written quickly to get a working prototype, before the security review.'],
      state: { fixes: [] },
    }
  },

  async developerFix({ project, brief, findings, buildError, state }) {
    await sleep(1100)
    const fixes = new Set(state?.fixes || [])
    const applied = []
    const fixed = []
    for (const finding of findings || []) {
      const flag = FIX_FOR_RULE[finding.rule]
      if (!flag) continue
      if (!fixes.has(flag)) applied.push(FIX_DESCRIPTIONS[flag])
      fixes.add(flag)
      fixed.push(finding.id)
    }
    if (buildError && !applied.length) {
      return { summary: 'Could not find the cause of the build error in simulated mode.', files: [], fixed: [], applied: [], state: { fixes: [...fixes] } }
    }
    const spec = analyzeTask(project.name, project.task)
    return {
      summary: applied.length ? `Applied ${applied.length} fix${applied.length === 1 ? '' : 'es'}.` : 'No automatic fix is available for these findings.',
      files: generateProjectFiles(spec, fixes, brief),
      fixed,
      applied,
      state: { fixes: [...fixes] },
    }
  },

  // The automated scanner already ran; in Simulated mode it is the whole review.
  async securityReview() {
    await sleep(1000)
    return { summary: '', findings: [], resolvedIds: [] }
  },

  async financeReview({ project, brief }) {
    await sleep(900)
    const f = analyzeTask(project.name, project.task).features
    const costs = [
      { item: 'Static hosting for the React build', low: 0, high: 20, period: 'month', note: 'Many hosts have free tiers for small sites' },
      { item: 'Domain name', low: 1, high: 2, period: 'month', note: 'About $12–$20 per year' },
    ]
    if (f.has('auth')) {
      costs.push(
        { item: 'Database for user accounts', low: 0, high: 25, period: 'month', note: 'Needed once accounts move to a server' },
        { item: 'Managed authentication provider (optional)', low: 0, high: 35, period: 'month', note: 'Free tiers often cover the first few thousand users' },
        { item: 'Email service (verification, password reset)', low: 0, high: 15, period: 'month', note: 'Transactional email, low volume' },
      )
    }
    if (f.has('waitlist')) costs.push({ item: 'Email tool for the waitlist', low: 0, high: 20, period: 'month', note: 'Free up to a few hundred contacts on many plans' })
    if (f.has('scanner')) costs.push({ item: 'Threat-intelligence or email-security API (optional)', low: 0, high: 50, period: 'month', note: 'Only if the heuristics are replaced by a paid detection service' })
    if (f.has('api')) costs.push({ item: 'API usage beyond free tier', low: 0, high: 30, period: 'month', note: 'Depends on request volume' })
    if (f.has('admin')) costs.push({ item: 'Audit logging for admin actions', low: 0, high: 15, period: 'month' })
    costs.push({ item: 'Error monitoring', low: 0, high: 10, period: 'month', note: 'Free tiers are usually enough at first' })

    const monthlyLow = costs.reduce((s, c) => s + (c.period === 'month' ? c.low : 0), 0)
    const monthlyHigh = costs.reduce((s, c) => s + (c.period === 'month' ? c.high : 0), 0)
    const budget = parseMoney(brief?.budget)
    return {
      summary: `${costs.length} cost considerations: about ${money(monthlyLow)}–${money(monthlyHigh)} per month to run (estimates).${
        budget ? ` A ${money(budget)} budget covers about ${Math.floor(budget / Math.max(monthlyHigh, 1))} months at the high estimate.` : ''
      }`,
      costs,
      assumptions: ['Fewer than 1,000 users in the first 6 months', 'Free tiers stay available at current limits', 'Prices are typical published ranges and can change'],
    }
  },

  async legalReview({ project, brief }) {
    await sleep(900)
    const f = analyzeTask(project.name, project.task).features
    const q = []
    if (f.has('auth')) {
      q.push(
        { topic: 'Personal information', question: 'Accounts collect names and email addresses. Which fields are truly needed, and how are they protected?', professionalReview: false },
        { topic: 'Privacy policy', question: 'What must a privacy policy say about account data before real users sign up?', professionalReview: true },
        { topic: 'User accounts', question: 'How can a user delete their account and data, and how quickly must that happen?', professionalReview: false },
        { topic: 'Data retention', question: 'How long should inactive accounts be kept?', professionalReview: false },
        { topic: 'Terms of service', question: 'Are terms of service needed before people create accounts?', professionalReview: true },
        { topic: 'Cookies & browser storage', question: 'The prototype keeps sessions in browser storage. Does a cookie or storage notice apply in the target market?', professionalReview: false },
      )
    }
    if (f.has('waitlist')) q.push({ topic: 'Marketing consent', question: 'Does the waitlist consent text and unsubscribe process meet email marketing rules (for example CAN-SPAM in the US)?', professionalReview: true })
    if (f.has('scanner')) {
      q.push(
        { topic: 'Third-party data', question: 'Users may paste emails that contain other people’s personal data. What notice or limits are needed?', professionalReview: true },
        { topic: 'Product claims', question: 'Do marketing claims about detecting phishing match what the heuristic check can actually do?', professionalReview: true },
      )
    }
    if (f.has('api')) q.push({ topic: 'API terms', question: 'Do the terms of the data provider allow this use and display of their data?', professionalReview: false })
    if (f.has('admin')) q.push({ topic: 'Access to user data', question: 'Who may view other users’ information in the admin panel, and is that disclosed?', professionalReview: false })
    if (f.has('portfolio')) q.push({ topic: 'Permissions', question: 'Do you have permission to show each client project, name, or logo?', professionalReview: false })
    if (f.has('contact')) q.push({ topic: 'Contact form data', question: 'Messages contain personal data. Where will they be stored and for how long?', professionalReview: false })
    if (/united states|\bu\.?s\.?a?\b|america/i.test(brief?.market || '')) {
      q.push({ topic: 'State privacy laws', question: 'Could state privacy laws (for example CCPA/CPRA) apply as the user base grows?', professionalReview: true })
    }
    if (!q.length) q.push({ topic: 'Privacy policy', question: 'Does the site collect any personal information that must be disclosed?', professionalReview: false })
    const review = q.filter((x) => x.professionalReview).length
    return {
      summary: `${q.length} question${q.length === 1 ? '' : 's'} to verify, ${review} marked for professional legal review. These are research questions, not legal advice.`,
      questions: q,
    }
  },

  async operationsReport({ project, outcome, facts }) {
    await sleep(700)
    const parts = [
      `${project.name} ${facts.buildPassed ? 'passes its production build' : 'does not build yet'}.`,
      facts.found ? `Security found ${facts.found} issue${facts.found === 1 ? '' : 's'} and ${facts.fixed} ${facts.fixed === 1 ? 'was' : 'were'} fixed${facts.open ? `; ${facts.open} still open` : ''}.` : 'Security found no code issues.',
      facts.notes ? `${facts.notes} prototype limitation${facts.notes === 1 ? ' is' : 's are'} noted for before launch.` : '',
      `Finance lists ${facts.costCount} cost considerations (estimates) and Legal raised ${facts.questionCount} questions, ${facts.reviewCount} for professional review.`,
      'Nothing has been deployed, purchased, or connected to real accounts.',
    ]
    const nextSteps = [
      'Run the project and click through every page yourself',
      ...(outcome === 'review-required' ? ['Review the open items below before continuing'] : []),
      ...(facts.notes ? ['Before real customers: move accounts to a server or a managed auth provider'] : []),
      ...(facts.reviewCount ? [`Book a professional review for ${facts.reviewCount} legal question${facts.reviewCount === 1 ? '' : 's'}`] : []),
      'Decide on the approval items: nothing is deployed or purchased automatically',
    ]
    return { summary: parts.filter(Boolean).join(' '), nextSteps }
  },
}
