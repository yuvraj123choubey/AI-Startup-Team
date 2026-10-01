import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'

// A faint, slowly drifting network of nodes drawn on a canvas behind the whole app.
// - Nodes near each other are joined by thin lines (an "AI network").
// - The field shifts slightly with the cursor; nearer nodes move more (depth).
// - While the AI team is running, the network glows a little brighter.
// - With reduced motion it is drawn once and never animates.
export default function InteractiveBackground({ active = false }) {
  const canvasRef = useRef(null)
  const activeRef = useRef(active)
  const reduced = useReducedMotion()

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    let width = 0
    let height = 0
    let nodes = []
    let frame = 0
    let glow = 0
    const pointer = { x: 0, y: 0 }
    const eased = { x: 0, y: 0 }

    function setup() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(60, Math.max(18, (width * height) / 24000)))
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        depth: 0.25 + Math.random() * 0.75,
        accent: i % 11 === 0,
      }))
    }

    function draw() {
      ctx.clearRect(0, 0, width, height)
      glow += ((activeRef.current ? 1 : 0) - glow) * 0.03
      eased.x += (pointer.x - eased.x) * 0.04
      eased.y += (pointer.y - eased.y) * 0.04

      const points = nodes.map((n) => {
        if (!reduced) {
          n.x += n.vx
          n.y += n.vy
          if (n.x < -20) n.x = width + 20
          if (n.x > width + 20) n.x = -20
          if (n.y < -20) n.y = height + 20
          if (n.y > height + 20) n.y = -20
        }
        return { x: n.x + eased.x * 18 * n.depth, y: n.y + eased.y * 18 * n.depth, depth: n.depth, accent: n.accent }
      })

      const maxDistance = 150
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i]
          const b = points[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < maxDistance) {
            const alpha = (1 - d / maxDistance) * (0.07 + glow * 0.07) * Math.min(a.depth, b.depth) * 1.6
            ctx.strokeStyle = `rgba(214, 222, 235, ${alpha})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      points.forEach((p) => {
        ctx.fillStyle = p.accent ? `rgba(150, 185, 245, ${0.35 + glow * 0.35})` : `rgba(230, 226, 218, ${0.1 + p.depth * 0.18})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.accent ? 1.8 : 0.6 + p.depth * 0.9, 0, Math.PI * 2)
        ctx.fill()
      })

      if (!reduced) frame = requestAnimationFrame(draw)
    }

    function handlePointer(event) {
      pointer.x = (event.clientX / width - 0.5) * 2
      pointer.y = (event.clientY / height - 0.5) * 2
    }

    function handleVisibility() {
      cancelAnimationFrame(frame)
      if (!document.hidden) draw()
    }

    function handleResize() {
      cancelAnimationFrame(frame)
      setup()
      draw()
    }

    setup()
    draw()
    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibility)
    if (finePointer && !reduced) window.addEventListener('pointermove', handlePointer)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pointermove', handlePointer)
    }
  }, [reduced])

  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-glow" />
      <div className="backdrop-grid" />
      <canvas ref={canvasRef} className="backdrop-canvas" />
    </div>
  )
}
