import { Reveal, RevealGroup, RevealItem } from './motion/Reveal'

const PRINCIPLES = [
  { label: 'Decisions', text: 'AI does not make the founder’s final decisions.' },
  { label: 'Advice', text: 'AI-generated legal and financial information is research support, not professional advice.' },
  { label: 'Facts', text: 'Important factual claims should be verified before anyone acts on them.' },
  {
    label: 'Review',
    text: 'Decisions involving customer data, security, contracts, financial commitments, or regulatory compliance may require qualified professional review.',
  },
]

// Two uses:
//  <SafetyNotice text="..." />      → a short inline notice (finance / legal disclaimers)
//  <SafetyNotice variant="full" />  → the full operating principles
export default function SafetyNotice({ text, variant = 'inline' }) {
  if (variant === 'inline') {
    return (
      <p className="note" role="note">
        {text}
      </p>
    )
  }

  return (
    <section className="principle" aria-labelledby="principle-title">
      <Reveal className="principle-statement">
        <span className="micro">Operating principle</span>
        <h2 id="principle-title" className="display-l">
          AI recommends.
          <br />
          <span className="principle-em">The founder decides.</span>
        </h2>
      </Reveal>
      <RevealGroup as="ul" className="principle-list">
        {PRINCIPLES.map((p) => (
          <RevealItem as="li" key={p.label}>
            <span className="micro">{p.label}</span>
            <span>{p.text}</span>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  )
}
