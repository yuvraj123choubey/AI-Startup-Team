// An example Company Brief so the app opens in a realistic working state.

export const EMPTY_BRIEF = {
  name: '',
  product: '',
  customer: '',
  problem: '',
  budget: '',
  teamSize: '',
  market: '',
  stage: 'Idea',
  goals: '',
  constraints: '',
}

export const SAMPLE_BRIEF = {
  name: 'PhishGuard',
  product:
    'A web service that helps small businesses identify suspicious emails before employees interact with them.',
  customer: 'Small businesses without a dedicated cybersecurity team.',
  problem: 'Employees may not recognize phishing emails quickly enough.',
  budget: '$2,000',
  teamSize: 'One founder',
  market: 'United States',
  stage: 'Prototype',
  goals:
    'Build a basic web application\nProtect customer information\nDetermine whether the business could be financially practical',
  constraints: 'Part-time founder (about 15 hours/week)\nNo outside funding yet\nMust be able to maintain the product alone',
}

export const PRODUCT_STAGES = ['Idea', 'Prototype', 'MVP', 'Beta', 'Launched']

export const BRIEF_FIELDS = [
  { key: 'name', label: 'Startup name', type: 'text', placeholder: 'e.g. PhishGuard' },
  { key: 'product', label: 'Product description', type: 'textarea', placeholder: 'What does the product do?' },
  { key: 'customer', label: 'Target customer', type: 'textarea', placeholder: 'Who is it for?' },
  { key: 'problem', label: 'Problem being solved', type: 'textarea', placeholder: 'What pain does it remove?' },
  { key: 'budget', label: 'Budget', type: 'text', placeholder: 'e.g. $2,000' },
  { key: 'teamSize', label: 'Team size', type: 'text', placeholder: 'e.g. One founder' },
  { key: 'market', label: 'Initial market', type: 'text', placeholder: 'e.g. United States' },
  { key: 'stage', label: 'Product stage', type: 'select', options: PRODUCT_STAGES },
  { key: 'goals', label: 'Current goals', type: 'textarea', placeholder: 'One goal per line' },
  { key: 'constraints', label: 'Important constraints', type: 'textarea', placeholder: 'Time, money, skills, rules…' },
]

// The Company Brief form is split into six steps.
export const BRIEF_SECTIONS = [
  { id: 'company', title: 'Company', intro: 'Name the company, what it makes, and how far along it is.', fields: ['name', 'product', 'stage'] },
  { id: 'customer', title: 'Customer', intro: 'Who buys this, and where you are selling first.', fields: ['customer', 'market'] },
  { id: 'problem', title: 'Problem', intro: 'The pain the product removes. Roles use this to judge what matters.', fields: ['problem'] },
  { id: 'resources', title: 'Resources', intro: 'Money and people. Finance uses these numbers directly.', fields: ['budget', 'teamSize'] },
  { id: 'goals', title: 'Goals', intro: 'What you are trying to achieve right now. One goal per line.', fields: ['goals'] },
  { id: 'constraints', title: 'Constraints', intro: 'Limits on time, money, skills, or rules the team must respect.', fields: ['constraints'] },
]

// Build mode examples: each becomes a real project in workspace-projects/.
export const BUILD_EXAMPLES = [
  { name: 'Secure Login Demo', task: 'Create a React website with registration, login, logout, password validation, and a protected dashboard.' },
  { name: 'Launch Page', task: 'Build a landing page for the startup with a waitlist signup form.' },
  { name: 'PhishGuard Console', task: 'Build a cybersecurity tool interface where staff paste a suspicious email and see the warning signs.' },
  { name: 'Team Admin', task: 'Create an admin panel with login and a user list.' },
  { name: 'Founder Portfolio', task: 'Make a portfolio website with a contact form.' },
]

export const EXAMPLE_TASKS = [
  'Add a user registration and login system to my startup website.',
  'Add paid monthly subscriptions with a free trial.',
  'Collect usage analytics so we can personalize each customer’s dashboard.',
  'Build a landing page with a waitlist signup form.',
]
