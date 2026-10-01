import AnimatedPage from '../components/motion/AnimatedPage'
import { Reveal } from '../components/motion/Reveal'
import Troubleshooting from '../components/Troubleshooting'
import DecisionTree from '../components/DecisionTree'

export default function TroubleshootingPage() {
  return (
    <AnimatedPage className="page-trouble">
      <header className="page-intro">
        <span className="micro">When things go wrong</span>
        <h1 className="display-l">Troubleshooting</h1>
        <p className="lede">Multi-role AI fails in predictable ways. Start with the question below, or scan the common problems.</p>
      </header>

      <section className="block">
        <DecisionTree />
      </section>

      <section className="block">
        <Reveal className="block-head">
          <span className="micro">Common problems</span>
          <h2 className="display-m">Symptoms and fixes</h2>
        </Reveal>
        <Troubleshooting />
      </section>
    </AnimatedPage>
  )
}
