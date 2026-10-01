// Common problems when working with a multi-role AI team, and what to do about them.

export const TROUBLESHOOTING = [
  {
    problem: 'Two AI workers contradict each other',
    solution: 'Ask both workers to explain their assumptions.',
    why: 'Roles optimize for different goals. Seeing the assumptions shows which goal matters more for this decision.',
  },
  {
    problem: 'AI invents company information',
    solution: 'Provide the Company Brief again.',
    why: 'Models fill gaps with plausible guesses. A complete brief leaves fewer gaps to fill.',
  },
  {
    problem: 'Answers are too generic',
    solution: 'Break the problem into a more specific question.',
    why: '“Improve security” gets a checklist. “Review our password reset flow” gets a real review.',
  },
  {
    problem: 'Developer suggests something insecure',
    solution: 'Send the proposal to the Cybersecurity Reviewer before implementation.',
    why: 'This is why Security runs right after the Developer in the workflow.',
  },
  {
    problem: 'Finance estimate seems unrealistic',
    solution: 'Require the Finance worker to list all assumptions.',
    why: 'A wrong estimate usually comes from one wrong assumption, such as user count or price.',
  },
  {
    problem: 'Legal worker sounds too certain',
    solution: 'Ask for questions requiring professional verification instead of definitive legal conclusions.',
    why: 'Legal outcomes depend on details an AI cannot confirm. Questions are safer than answers.',
  },
  {
    problem: 'Workers repeat each other',
    solution: 'Rewrite the responsibilities for each role.',
    why: 'Overlapping system prompts produce overlapping answers. Each role should own different questions.',
  },
  {
    problem: 'Live AI says the API key is missing or rejected',
    solution: 'Put OPENAI_API_KEY in the .env file, restart the backend, or switch to Simulated mode.',
    why: 'The key is read only by the backend when it starts. The browser never sees it, so it cannot be entered on the page.',
  },
  {
    problem: 'The backend is unavailable',
    solution: 'Start it with “npm run server” (or “npm run dev:all” for both apps).',
    why: 'Analyze mode still works in Simulated mode without it, but Live AI and Build mode need the backend.',
  },
  {
    problem: 'A role timed out or returned an invalid answer',
    solution: 'Run the task again. That role’s section is marked as failed, and nothing is filled in on its behalf.',
    why: 'Model replies are validated before they are shown. An invalid reply is retried once, then reported instead of guessed.',
  },
  {
    problem: 'A built project needs founder review',
    solution: 'Open the project report: it lists the failing build step or the security issues still open after three repair rounds.',
    why: 'The repair loop is capped so the agents cannot loop forever. What they could not fix is handed to you.',
  },
  {
    problem: 'Final recommendation is confusing',
    solution: 'Ask the Operations Lead to summarize conflicts and next actions.',
    why: 'The founder needs a short list of decisions, not four long reports.',
  },
]

// Decision tree: each node is either a question (with yes/no branches) or an end step.
export const DECISION_TREE = {
  start: {
    question: 'Is the AI answer useful?',
    yes: 'useful',
    no: 'missingInfo',
  },
  useful: {
    steps: ['Verify important claims', 'Continue'],
    tone: 'good',
  },
  missingInfo: {
    question: 'Is information missing?',
    yes: 'addContext',
    no: 'tooBroad',
  },
  addContext: {
    steps: ['Add Company Brief / context', 'Try again'],
    tone: 'retry',
  },
  tooBroad: {
    question: 'Is the request too broad?',
    yes: 'narrow',
    no: 'askAnother',
  },
  narrow: {
    steps: ['Break it into one specific task', 'Try again'],
    tone: 'retry',
  },
  askAnother: {
    steps: ['Ask another AI role to review the answer'],
    tone: 'review',
  },
}
