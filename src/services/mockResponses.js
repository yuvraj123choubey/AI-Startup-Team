// Simulated AI responses.
// Each role gets its own generator. The generators read the Company Brief, the task,
// and the earlier roles' outputs, so the answers change with the startup and the task.
// Used in Simulated mode (in the browser, and by the backend when AI_MODE=mock).

import { detectConflicts } from './conflictDetector.js'

// ---------- Helpers ----------

// Pick one main topic for the task using simple keyword rules.
export function detectTopic(task) {
  const text = task.toLowerCase()
  if (/\b(waitlist|landing page|newsletter)\b/.test(text)) return 'general'
  if (/\b(pay\w*|billing|subscriptions?|checkout|invoic\w*|trial|pricing)\b/.test(text)) return 'payments'
  if (/\b(log ?in|sign ?in|sign ?up|register|registration|accounts?|passwords?|auth\w*)\b/.test(text)) return 'auth'
  if (/\b(analytics|personali\w*|track\w*|collect\w*|surveys?|usage)\b/.test(text)) return 'data'
  return 'general'
}

export const TOPIC_LABELS = {
  auth: 'Accounts & login',
  payments: 'Payments & subscriptions',
  data: 'Customer data & analytics',
  general: 'General product work',
}

function parseMoney(value) {
  const number = parseFloat(String(value || '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(number) ? number : null
}

function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function companyName(brief) {
  return brief.name?.trim() || 'your startup'
}

// ---------- Software Developer ----------

const DEVELOPER = {
  auth: (brief) => ({
    summary: `Build email-and-password registration and login for ${companyName(brief)}, with hashed passwords and server-side sessions.`,
    sections: [
      {
        title: 'Implementation',
        items: [
          'Registration form: email, password, confirm password',
          'Login form with clear error messages',
          'Logout and “forgot password” flow',
          'Protected pages that require a signed-in user',
        ],
      },
      {
        title: 'Architecture',
        items: [
          'React frontend → Node.js/Express API → PostgreSQL database',
          'Server-side sessions stored in the database and sent as a cookie',
          'Hash passwords with bcrypt (cost factor 12) before saving',
        ],
      },
      {
        title: 'Database',
        items: [
          'users: id, email (unique), password_hash, created_at, last_login',
          'sessions: id, user_id, expires_at',
          'Profile fields for personalization: full name, company, job title, phone',
        ],
      },
      {
        title: 'APIs',
        items: ['POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/logout', 'GET /api/auth/me'],
      },
      {
        title: 'Technical requirements',
        items: [
          'HTTPS on every page',
          'An email service to send password reset links',
          'Input validation on both the client and the server',
          'Estimated build time: 20–30 hours',
        ],
      },
    ],
    assumptions: ['Users sign in with email and password (no Google/Microsoft login yet)', 'One account per employee'],
    recommendations: [
      { text: 'Build an authentication prototype (register, login, logout)', priority: 'high' },
      { text: 'Hash passwords with bcrypt before storing them', priority: 'high' },
      { text: 'Add a password reset flow by email', priority: 'medium' },
      { text: 'Add Google/Microsoft sign-in in a later version', priority: 'low' },
    ],
    positions: {
      dataCollection: {
        value: 'expand',
        statement: 'Store additional profile fields (name, company, job title, phone) to improve personalization.',
      },
      authApproach: {
        value: 'custom',
        statement: 'Build our own login system for full control and no monthly fee.',
      },
    },
  }),

  payments: (brief) => ({
    summary: `Add monthly subscriptions to ${companyName(brief)} using a hosted checkout page and webhooks.`,
    sections: [
      {
        title: 'Implementation',
        items: [
          'Pricing page with plan options and a free-trial button',
          'Hosted checkout page from a payment processor (for example Stripe Checkout)',
          'Billing page where customers upgrade, downgrade, or cancel',
          'Trial-ending reminder emails',
        ],
      },
      {
        title: 'Architecture',
        items: [
          'Frontend redirects to the processor’s checkout page',
          'Webhook endpoint receives “payment succeeded/failed” events',
          'App checks subscription status before showing paid features',
        ],
      },
      {
        title: 'Database',
        items: [
          'plans: id, name, monthly_price',
          'subscriptions: id, customer_id, plan_id, status, trial_ends_at',
          'Saved card details for one-click upgrades',
        ],
      },
      { title: 'APIs', items: ['POST /api/billing/checkout', 'POST /api/billing/webhook', 'GET /api/billing/status'] },
      {
        title: 'Technical requirements',
        items: ['Payment processor account', 'Test mode for development', 'Estimated build time: 25–40 hours'],
      },
    ],
    assumptions: ['One paid plan plus a 14-day free trial', 'Customers pay by card'],
    recommendations: [
      { text: 'Build hosted checkout with a 14-day free trial', priority: 'high' },
      { text: 'Add a billing page for cancel and upgrade', priority: 'medium' },
      { text: 'Add annual billing later', priority: 'low' },
    ],
    positions: {
      paymentData: {
        value: 'store',
        statement: 'Save customers’ card details in our own database for faster one-click upgrades.',
      },
      launchTiming: { value: 'now', statement: 'Launch the paid plan as soon as checkout works.' },
    },
  }),

  data: (brief) => ({
    summary: `Add event tracking and a personalized dashboard for each ${companyName(brief)} customer.`,
    sections: [
      {
        title: 'Implementation',
        items: [
          'Track key events: sign-in, email scanned, email reported, warning clicked',
          'Dashboard widgets based on each customer’s activity',
          'Weekly summary email for account owners',
        ],
      },
      {
        title: 'Architecture',
        items: ['Small tracking helper in the frontend', 'events API that writes to the database', 'Nightly job that builds dashboard totals'],
      },
      {
        title: 'Database',
        items: [
          'events: id, user_id, type, metadata, created_at',
          'Store full email metadata (sender, subject, recipients) for richer insights',
        ],
      },
      { title: 'APIs', items: ['POST /api/events', 'GET /api/dashboard/summary'] },
      { title: 'Technical requirements', items: ['Database indexes on user_id and created_at', 'Estimated build time: 15–25 hours'] },
    ],
    assumptions: ['Customers want insights about their own team', 'Event volume stays under 1 million per month at first'],
    recommendations: [
      { text: 'Build event tracking for 4–5 key actions', priority: 'high' },
      { text: 'Build the personalized dashboard', priority: 'medium' },
      { text: 'Add weekly summary emails', priority: 'low' },
    ],
    positions: {
      dataCollection: {
        value: 'expand',
        statement: 'Track detailed per-user activity and full email metadata to personalize dashboards.',
      },
    },
  }),

  general: (brief, task) => ({
    summary: `Break “${task}” into a small first version ${companyName(brief)} can ship and test quickly.`,
    sections: [
      {
        title: 'Implementation',
        items: ['Define the smallest useful version', 'Build the page or feature as reusable components', 'Connect it to a simple API endpoint if data must be saved'],
      },
      { title: 'Architecture', items: ['React frontend, one small API service, one database', 'Deploy to a free or low-cost host'] },
      { title: 'Database', items: ['Add only the tables this feature needs', 'Record created_at on every row'] },
      { title: 'Technical requirements', items: ['Works on mobile', 'Basic error handling', 'Estimated build time: 10–20 hours'] },
    ],
    assumptions: ['The feature is not business-critical on day one', 'Existing hosting can be reused'],
    recommendations: [
      { text: 'Build a first version of the feature', priority: 'high' },
      { text: 'Collect feedback from 3–5 target customers', priority: 'medium' },
      { text: 'Write short documentation for the feature', priority: 'low' },
    ],
    positions: {
      releaseSpeed: { value: 'fast', statement: 'Ship a small version this week and add tests after getting feedback.' },
    },
  }),
}

// ---------- Cybersecurity Reviewer ----------

const SECURITY = {
  auth: () => ({
    sections: [
      {
        title: 'Findings in the Developer’s plan',
        items: [
          'HIGH: No rate limiting on /api/auth/login, so attackers can guess passwords at scale',
          'HIGH: Session cookie must be HttpOnly, Secure, and SameSite=Lax',
          'MEDIUM: Password reset tokens need a short expiry (15–30 minutes) and single use',
          'MEDIUM: Login errors should not reveal whether an email is registered',
          'LOW: Log sign-in events, but never passwords or tokens',
        ],
      },
      { title: 'Agrees with the Developer', items: ['bcrypt password hashing is appropriate', 'Server-side sessions are a good choice'] },
      {
        title: 'Sensitive data',
        items: [
          'Email addresses and password hashes',
          'Phone and job title add risk without adding security value',
          'Customers are businesses, so a breach also exposes their employees',
        ],
      },
      {
        title: 'Security improvements',
        items: [
          'Offer multi-factor authentication (MFA), at least for admin accounts',
          'Require passwords of 12+ characters and block known breached passwords',
          'Validate and sanitize all input on the server',
          'Consider a managed auth provider instead of custom code',
        ],
      },
    ],
    assumptions: ['The app is reachable from the public internet', 'Attackers will target a security product first'],
    recommendations: [
      { text: 'Add rate limiting and temporary lockout to login', priority: 'high' },
      { text: 'Set secure cookie flags (HttpOnly, Secure, SameSite)', priority: 'high' },
      { text: 'Add MFA for admin accounts', priority: 'medium' },
      { text: 'Log sign-in events for auditing', priority: 'low' },
    ],
    positions: {
      dataCollection: {
        value: 'minimize',
        statement: 'Reduce the amount of stored personal information. Login only needs an email and a password.',
      },
      authApproach: {
        value: 'managed',
        statement: 'Use a proven managed authentication provider instead of hand-written login code.',
      },
    },
  }),

  payments: () => ({
    sections: [
      {
        title: 'Findings in the Developer’s plan',
        items: [
          'HIGH: Storing card details makes the app responsible for card-data security (PCI DSS scope)',
          'HIGH: Webhook endpoint must verify the processor’s signature, or anyone can fake a payment',
          'MEDIUM: Paid features must be checked on the server, not only hidden in the UI',
          'LOW: Keep payment API keys in server environment variables, never in frontend code',
        ],
      },
      { title: 'Agrees with the Developer', items: ['A hosted checkout page keeps card entry off our servers'] },
      { title: 'Sensitive data', items: ['Card numbers (should never touch our database)', 'Billing names and addresses'] },
      { title: 'Security improvements', items: ['Store only the processor’s customer ID and subscription ID', 'Alert the founder on repeated failed payments'] },
    ],
    assumptions: ['A major payment processor is used', 'No card data is entered on our own pages'],
    recommendations: [
      { text: 'Verify webhook signatures', priority: 'high' },
      { text: 'Check subscription status on the server for every paid feature', priority: 'high' },
      { text: 'Move all payment keys to server-side environment variables', priority: 'medium' },
    ],
    positions: {
      paymentData: {
        value: 'tokenize',
        statement: 'Never store card numbers. Let the payment processor keep them and store only a token.',
      },
    },
  }),

  data: () => ({
    sections: [
      {
        title: 'Findings in the Developer’s plan',
        items: [
          'HIGH: Full email metadata (senders, subjects, recipients) is sensitive business information',
          'MEDIUM: The events API needs authentication, or anyone can write fake events',
          'MEDIUM: Third-party analytics scripts can read everything on the page',
          'LOW: Set a retention limit so old events are deleted automatically',
        ],
      },
      { title: 'Sensitive data', items: ['Email subjects and sender addresses', 'Per-employee behavior that could identify individuals'] },
      { title: 'Security improvements', items: ['Store counts and categories instead of raw email data', 'Delete events older than 90 days', 'Encrypt the database at rest'] },
    ],
    assumptions: ['Customer emails may contain confidential information'],
    recommendations: [
      { text: 'Require authentication on the events API', priority: 'high' },
      { text: 'Replace raw email metadata with counts and categories', priority: 'high' },
      { text: 'Add a 90-day event retention limit', priority: 'medium' },
    ],
    positions: {
      dataCollection: {
        value: 'minimize',
        statement: 'Track aggregated, anonymized events only. Do not store email content or full metadata.',
      },
    },
  }),

  general: () => ({
    sections: [
      {
        title: 'Findings in the Developer’s plan',
        items: [
          'MEDIUM: Forms need server-side validation and spam protection',
          'MEDIUM: Any new API endpoint needs authentication and rate limiting',
          'LOW: Keep dependencies up to date and remove unused packages',
        ],
      },
      { title: 'Security improvements', items: ['Run a 10-minute security checklist before each release', 'Use HTTPS and secure headers on the host'] },
    ],
    assumptions: ['The feature is public-facing'],
    recommendations: [
      { text: 'Add server-side validation and rate limiting', priority: 'high' },
      { text: 'Create a short pre-release security checklist', priority: 'medium' },
    ],
    positions: {
      releaseSpeed: { value: 'careful', statement: 'Run a short security checklist before anything goes live.' },
    },
  }),
}

function securityResponse(brief, task, topic, previous) {
  const base = SECURITY[topic](brief, task)
  const devPlan = previous.developer
  const findings = base.sections[0].items.length
  return {
    ...base,
    summary: `Reviewed the Developer’s ${devPlan ? devPlan.sections.length + '-part' : ''} plan and found ${findings} issues to address before real ${companyName(brief)} customers use it.`,
  }
}

// ---------- Finance Research Assistant ----------

const FINANCE_ROWS = {
  auth: [
    { item: 'Web hosting (frontend + API)', low: 0, high: 20, period: 'month', note: 'Several hosts offer free tiers' },
    { item: 'Managed PostgreSQL database', low: 0, high: 25, period: 'month' },
    { item: 'Managed auth provider (optional)', low: 0, high: 35, period: 'month', note: 'Often free for the first few thousand users' },
    { item: 'Email service for password resets', low: 0, high: 15, period: 'month' },
    { item: 'Domain name + SSL', low: 1, high: 2, period: 'month', note: '$12–$20 per year; SSL usually free' },
    { item: 'Founder build time (20–30 hrs at $50/hr)', low: 1000, high: 1500, period: 'one-time', note: 'Time cost, not cash' },
  ],
  payments: [
    { item: 'Card processing fees', display: '~2.9% + $0.30 per charge', period: 'per charge', note: 'Typical US rate; check current pricing' },
    { item: 'Web hosting', low: 0, high: 20, period: 'month' },
    { item: 'Database', low: 0, high: 25, period: 'month' },
    { item: 'Receipt and reminder emails', low: 0, high: 15, period: 'month' },
    { item: 'Sales tax tool (may be needed)', low: 0, high: 50, period: 'month', note: 'Depends on where you must collect tax' },
    { item: 'Founder build time (25–40 hrs at $50/hr)', low: 1250, high: 2000, period: 'one-time', note: 'Time cost, not cash' },
  ],
  data: [
    { item: 'Analytics tool', low: 0, high: 50, period: 'month', note: 'Free tiers usually cap monthly events' },
    { item: 'Extra database storage', low: 5, high: 25, period: 'month' },
    { item: 'Cookie consent tool', low: 0, high: 15, period: 'month' },
    { item: 'Founder build time (15–25 hrs at $50/hr)', low: 750, high: 1250, period: 'one-time', note: 'Time cost, not cash' },
  ],
  general: [
    { item: 'Web hosting', low: 0, high: 20, period: 'month' },
    { item: 'Domain name + SSL', low: 1, high: 2, period: 'month' },
    { item: 'Email / form tool', low: 0, high: 20, period: 'month' },
    { item: 'Founder build time (10–20 hrs at $50/hr)', low: 500, high: 1000, period: 'one-time', note: 'Time cost, not cash' },
  ],
}

const ASSUMED_PRICE = 15 // dollars per customer per month

function financeResponse(brief, task, topic) {
  const rows = FINANCE_ROWS[topic]
  const monthly = rows.filter((r) => r.period === 'month')
  const monthlyLow = monthly.reduce((sum, r) => sum + r.low, 0)
  const monthlyHigh = monthly.reduce((sum, r) => sum + r.high, 0)
  const oneTime = rows.find((r) => r.period === 'one-time')
  const budget = parseMoney(brief.budget)

  // Net revenue per customer after card fees (only relevant when charging cards).
  const netPrice = topic === 'payments' ? ASSUMED_PRICE - (ASSUMED_PRICE * 0.029 + 0.3) : ASSUMED_PRICE
  const breakEven = Math.max(1, Math.ceil(monthlyHigh / netPrice))

  const runwayLine =
    budget === null
      ? 'The Company Brief has no budget, so runway cannot be estimated.'
      : `A budget of ${money(budget)} covers about ${Math.floor(budget / Math.max(monthlyHigh, 1))} months of these costs at the high estimate.`

  const sections = [
    {
      title: 'Budget check',
      items: [
        `Estimated running cost: ${money(monthlyLow)}–${money(monthlyHigh)} per month (estimate)`,
        runwayLine,
        `Build time is the biggest cost: ${money(oneTime.low)}–${money(oneTime.high)} of founder time (estimate)`,
      ],
    },
    {
      title: 'Pricing considerations',
      items: [
        `At an assumed price of ${money(ASSUMED_PRICE)} per business per month, about ${breakEven} paying customer${breakEven === 1 ? '' : 's'} would cover the high monthly estimate`,
        'Test willingness to pay with 5–10 target customers before fixing a price',
      ],
    },
  ]

  if (topic === 'auth') {
    sections.push({
      title: 'Build vs. buy',
      items: [
        'Custom login: $0 extra per month, about 10 more build hours (estimate)',
        'Managed auth: $0–$35 per month, faster and fewer security mistakes (estimate)',
      ],
    })
  }
  if (topic === 'payments') {
    sections.push({
      title: 'Trial assumptions',
      items: ['Assumes 15–25% of free trials convert to paid (estimate)', 'Card fees reduce each $15 payment to about $14.27'],
    })
  }

  return {
    summary: `Estimated ${money(monthlyLow)}–${money(monthlyHigh)} per month to run, plus ${money(oneTime.low)}–${money(oneTime.high)} of founder time to build. All figures are estimates.`,
    estimates: { rows, monthlyLow, monthlyHigh },
    sections,
    assumptions: [
      'Fewer than 1,000 users in the first 6 months',
      'Free tiers stay available at current limits',
      'Prices are typical published ranges and can change',
      'Founder time valued at $50/hour',
      `Price of ${money(ASSUMED_PRICE)} per customer per month is a placeholder, not market research`,
    ],
    recommendations: [
      { text: 'Confirm free-tier limits and estimate hosting/service costs', priority: 'medium' },
      { text: 'Validate the price with 5–10 target customers', priority: 'medium' },
      { text: 'Review actual costs after the first month', priority: 'low' },
    ],
    positions:
      topic === 'payments'
        ? { launchTiming: { value: 'now', statement: 'Launch the paid plan soon to learn whether customers will pay.' } }
        : {},
  }
}

// ---------- Legal Research Assistant ----------

function marketRegulations(market) {
  const m = (market || '').toLowerCase()
  const items = []
  if (/united states|\bu\.?s\.?a?\b|america/.test(m)) {
    items.push(
      'State privacy laws (for example California’s CCPA/CPRA) may apply depending on revenue and user-count thresholds',
      'State data breach notification laws cover most businesses that store personal information',
      'FTC rules on unfair or deceptive practices: privacy and security claims must match what the product actually does',
    )
  }
  if (/europe|\beu\b|germany|france|spain|italy|netherlands/.test(m)) {
    items.push('GDPR likely applies to personal data of people in the EU')
  }
  if (/united kingdom|\buk\b|england|britain/.test(m)) items.push('UK GDPR and the Data Protection Act 2018 may apply')
  if (/canada/.test(m)) items.push('PIPEDA and provincial privacy laws may apply')
  if (items.length === 0) items.push(`Privacy laws in ${market || 'your market'}: confirm which apply before launch`)
  return items
}

const LEGAL = {
  auth: {
    privacy: [
      'Accounts collect personal information (emails, possibly names). What is the minimum needed?',
      'Who at the customer business can see employee accounts?',
    ],
    policies: ['Privacy Policy: what is collected and why', 'Terms of Service for account use', 'Data retention rule for inactive accounts'],
    review: [
      'Does the privacy policy meet the rules in every state where customers are?',
      'What must we do, and how fast, if account data is breached?',
      'Do business customers need a Data Processing Agreement?',
    ],
    recommendations: [
      { text: 'Decide what user information is truly necessary', priority: 'high' },
      { text: 'Draft privacy requirements and a data retention rule', priority: 'medium' },
      { text: 'Privacy policy and breach-response obligations', priority: 'review' },
      { text: 'Whether a Data Processing Agreement is needed with business customers', priority: 'review' },
    ],
    positions: {
      dataCollection: { value: 'minimize', statement: 'Collecting less personal data reduces privacy obligations and breach exposure.' },
    },
  },
  payments: {
    privacy: ['Billing data (names, addresses) is personal information', 'Payment processor becomes a data processor to list in the privacy policy'],
    policies: [
      'Terms of Service with billing, renewal, and cancellation terms',
      'Refund policy',
      'Clear free-trial disclosure: when the card will be charged',
    ],
    extraRegulations: [
      'Many US states have automatic-renewal laws requiring clear disclosure and easy cancellation',
      'Sales tax on software subscriptions varies by state',
      'PCI DSS is a card-industry standard (not a law) that the processor agreement will require',
    ],
    review: ['Do our trial and auto-renewal terms meet state requirements?', 'Do we need to collect sales tax, and in which states?'],
    recommendations: [
      { text: 'Write clear trial and cancellation terms before charging cards', priority: 'high' },
      { text: 'Publish a refund policy', priority: 'medium' },
      { text: 'Auto-renewal disclosures and sales tax obligations', priority: 'review' },
    ],
    positions: {
      launchTiming: { value: 'wait', statement: 'Hold the paid launch until the terms, refund policy, and renewal disclosures are reviewed.' },
    },
  },
  data: {
    privacy: [
      'Tracking employee behavior may require notice to those employees',
      'Email metadata may include information about people who are not customers',
      'Is any data shared with or sold to third-party analytics providers?',
    ],
    policies: ['Privacy Policy section on analytics and cookies', 'Cookie/consent notice if non-essential cookies are used', 'Data retention schedule'],
    review: ['Does our tracking count as “sharing” under state privacy laws?', 'What notice must customers give their employees?'],
    recommendations: [
      { text: 'List every data field tracked and why', priority: 'high' },
      { text: 'Add an analytics section to the privacy policy', priority: 'medium' },
      { text: 'Employee monitoring notice and data-sharing rules', priority: 'review' },
    ],
    positions: {
      dataCollection: { value: 'minimize', statement: 'Collect only the data you can clearly justify in the privacy policy.' },
    },
  },
  general: {
    privacy: ['Does this feature collect any personal information? If so, it must be in the privacy policy.'],
    policies: ['Terms of Service and Privacy Policy linked from every page', 'Consent checkbox if emails will be used for marketing'],
    review: ['Are the Terms of Service suitable for business customers?'],
    recommendations: [
      { text: 'Check whether the feature collects personal information', priority: 'medium' },
      { text: 'Terms of Service suitability for business customers', priority: 'review' },
    ],
    positions: {},
  },
}

function legalResponse(brief, task, topic) {
  const content = LEGAL[topic]
  const regulations = [...marketRegulations(brief.market), ...(content.extraRegulations || [])]
  return {
    summary: `Found ${content.privacy.length} privacy concerns and ${content.review.length} questions that may need review by a qualified attorney. These are research questions, not legal conclusions.`,
    sections: [
      { title: 'Privacy & user-data concerns', items: content.privacy },
      { title: 'Regulations that may apply', items: regulations },
      { title: 'Terms & policies to consider', items: content.policies },
      { title: 'Questions for professional legal review', items: content.review },
    ],
    assumptions: [`Initial market: ${brief.market || 'not stated in the Company Brief'}`, 'Customers are businesses, not individual consumers'],
    recommendations: content.recommendations,
    positions: content.positions,
  }
}

// ---------- Business & Operations Lead ----------

const PRIORITY_KEYS = ['high', 'medium', 'low', 'review']

function operationsResponse(brief, task, topic, previous) {
  const conflicts = detectConflicts(previous)
  const priorities = { high: [], medium: [], low: [], review: [] }

  // Every unresolved conflict becomes a high-priority founder decision.
  conflicts.forEach((c) => priorities.high.push({ text: `Decide: ${c.label}`, from: c.sides.map((s) => s.roleId), isDecision: true }))

  // Merge all four roles' recommendations into one list, grouped by priority.
  ;['developer', 'security', 'finance', 'legal'].forEach((roleId) => {
    previous[roleId]?.recommendations.forEach((rec) => {
      const bucket = PRIORITY_KEYS.includes(rec.priority) ? rec.priority : 'medium'
      priorities[bucket].push({ text: rec.text, from: [roleId] })
    })
  })

  const name = companyName(brief)
  const firstTask = priorities.high.find((p) => !p.isDecision)
  const nextSteps = [
    ...(conflicts.length ? [`Resolve ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''} between roles`] : []),
    ...priorities.high.filter((p) => !p.isDecision).slice(0, 2).map((p) => p.text),
    ...(priorities.review.length ? ['Book a professional review for flagged legal/compliance items'] : []),
    'Record your final decision below',
  ]

  const facts = [brief.stage, brief.teamSize, brief.budget && `budget ${brief.budget}`].filter(Boolean).join(', ')

  const briefing = `For ${name}${facts ? ` (${facts})` : ''}, the team suggests starting with: ${firstTask ? firstTask.text.toLowerCase() : 'a small first version'}. ${
    conflicts.length
      ? `The roles disagree on ${conflicts.length === 1 ? 'one question' : `${conflicts.length} questions`}: ${conflicts.map((c) => `“${c.label}”`).join(' and ')}. That choice belongs to you.`
      : 'The roles did not raise any direct conflicts.'
  } ${priorities.review.length} item${priorities.review.length === 1 ? '' : 's'} should be checked by a qualified professional before launch.`

  return {
    summary: `Combined 4 reports into ${Object.values(priorities).flat().length} actions. ${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} need the founder’s decision.`,
    briefing,
    founderSummary: briefing,
    roleSummaries: ['developer', 'security', 'finance', 'legal'].map((roleId) => ({ roleId, summary: previous[roleId]?.summary })),
    priorities,
    highPriority: priorities.high,
    mediumPriority: priorities.medium,
    lowPriority: priorities.low,
    professionalReview: priorities.review,
    conflicts,
    nextSteps,
    sections: [],
    assumptions: ['All four reports are based on the same Company Brief', 'Nothing here has been verified by a human yet'],
    risks: conflicts.map((c) => `Unresolved disagreement: ${c.label}`),
    recommendations: [],
    positions: {},
  }
}

// ---------- Risks (part of the common response structure) ----------

const DEVELOPER_RISKS = {
  auth: ['Hand-written authentication code is easy to get subtly wrong', 'Password reset emails depend on a third-party email service'],
  payments: ['Missed or duplicated webhooks can leave subscriptions in the wrong state', 'Billing bugs directly affect customer trust'],
  data: ['Event volume can grow faster than expected', 'Dashboards are only as accurate as the tracked events'],
  general: ['Shipping without tests may hide regressions', 'Scope can grow beyond the time available'],
}

function risksFor(roleId, topic, response) {
  switch (roleId) {
    case 'developer':
      return DEVELOPER_RISKS[topic]
    case 'security':
      return response.sections[0].items.filter((item) => item.startsWith('HIGH:')).map((item) => item.replace(/^HIGH:\s*/, ''))
    case 'finance':
      return ['Free-tier limits and prices can change without notice', 'Founder time is the largest cost and the easiest to underestimate']
    case 'legal':
      return response.sections.find((s) => s.title.includes('professional'))?.items.map((q) => `Unverified: ${q}`) ?? []
    default:
      return response.risks || []
  }
}

// ---------- Entry point ----------

export function generateMockResponse(roleId, { brief, task, previous }) {
  const topic = detectTopic(task)
  let response
  switch (roleId) {
    case 'developer':
      response = DEVELOPER[topic](brief, task)
      break
    case 'security':
      response = securityResponse(brief, task, topic, previous)
      break
    case 'finance':
      response = financeResponse(brief, task, topic)
      break
    case 'legal':
      response = legalResponse(brief, task, topic)
      break
    case 'operations':
      response = operationsResponse(brief, task, topic, previous)
      break
    default:
      throw new Error(`Unknown role: ${roleId}`)
  }
  return { topic, ...response, risks: risksFor(roleId, topic, response) }
}
