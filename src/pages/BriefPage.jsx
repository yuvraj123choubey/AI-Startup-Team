import AnimatedPage from '../components/motion/AnimatedPage'
import CompanyBrief from '../components/CompanyBrief'

export default function BriefPage({ brief, onSave }) {
  return (
    <AnimatedPage className="page-brief">
      <header className="page-intro">
        <span className="micro">Shared context</span>
        <h1 className="display-l">Configure your AI organization.</h1>
        <p className="lede">
          Six short sections. Every role reads this brief before it works on a task, so a complete brief keeps the team from inventing facts about your company.
        </p>
      </header>
      <CompanyBrief brief={brief} onSave={onSave} />
    </AnimatedPage>
  )
}
