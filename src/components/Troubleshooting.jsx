import { TROUBLESHOOTING } from '../data/troubleshooting'
import { RevealGroup, RevealItem } from './motion/Reveal'

export default function Troubleshooting() {
  return (
    <RevealGroup as="ol" className="issues">
      {TROUBLESHOOTING.map((item) => (
        <RevealItem as="li" key={item.problem} className="issue">
          <h3 className="issue-problem">{item.problem}</h3>
          <div className="issue-fix">
            <span className="micro">Fix</span>
            <p className="issue-solution">{item.solution}</p>
            <p className="issue-why">{item.why}</p>
          </div>
        </RevealItem>
      ))}
    </RevealGroup>
  )
}
