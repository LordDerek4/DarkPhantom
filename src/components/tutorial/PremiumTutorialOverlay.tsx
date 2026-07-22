import React, { useLayoutEffect, useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Sparkles, Bot, ChevronRight, ArrowRight } from 'lucide-react'
import { cn } from '@/utils/helpers'

interface Step {
  id: string
  target?: string
  title: string
  description: string
  icon: React.ReactNode
  position?: 'right' | 'left' | 'top' | 'bottom' | 'center'
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: "You're now a Premium member!",
    description: 'Your subscription is active. Here\'s a quick look at what you\'ve unlocked.',
    icon: <Crown size={28} className="text-yellow-400" />,
    position: 'center',
  },
  {
    id: 'badge',
    target: '[data-tutorial="user-panel"]',
    title: 'Your Premium Badge',
    description: 'A gold crown now appears next to your name in chat and on your profile — visible to everyone.',
    icon: <Crown size={20} className="text-yellow-400" />,
    position: 'top',
  },
  {
    id: 'ai',
    target: '[data-tutorial="ai-btn"]',
    title: 'AI Companion',
    description: 'Click the sparkles icon to open your personal AI assistant. Summarise conversations, get smart replies, and draft announcements.',
    icon: <Bot size={20} className="text-pulse-brand" />,
    position: 'bottom',
  },
  {
    id: 'done',
    title: 'Start exploring!',
    description: 'Go to Settings → Premium any time to manage your subscription or check your benefits.',
    icon: <Sparkles size={28} className="text-pulse-brand" />,
    position: 'center',
  },
]

const PAD = 10
const GAP = 12
const MARGIN = 12

interface Rect { top: number; left: number; width: number; height: number }

function calcPos(spotlight: Rect, pos: Step['position'], cw: number, ch: number) {
  const vw = window.innerWidth, vh = window.innerHeight
  const cl = (l: number) => Math.max(MARGIN, Math.min(l, vw - cw - MARGIN))
  const ct = (t: number) => Math.max(MARGIN, Math.min(t, vh - ch - MARGIN))
  const s = spotlight
  if (pos === 'right') {
    const l = s.left + s.width + GAP
    return { top: ct(s.top + s.height / 2 - ch / 2), left: l + cw + MARGIN > vw ? cl(s.left - cw - GAP) : cl(l) }
  }
  if (pos === 'left') {
    const l = s.left - cw - GAP
    return { top: ct(s.top + s.height / 2 - ch / 2), left: l < MARGIN ? cl(s.left + s.width + GAP) : cl(l) }
  }
  if (pos === 'top') {
    const t = s.top - ch - GAP
    return { top: t < MARGIN ? ct(s.top + s.height + GAP) : ct(t), left: cl(s.left + s.width / 2 - cw / 2) }
  }
  if (pos === 'bottom') {
    return { top: ct(s.top + s.height + GAP), left: cl(s.left + s.width / 2 - cw / 2) }
  }
  return { top: Math.max(MARGIN, (vh - ch) / 2), left: Math.max(MARGIN, (vw - cw) / 2) }
}

interface Props { onComplete: () => void }

export function PremiumTutorialOverlay({ onComplete }: Props) {
  const [idx, setIdx] = useState(0)
  const [spotlight, setSpotlight] = useState<Rect | null>(null)
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const step = STEPS[idx]
  const isFirst = idx === 0
  const isLast = idx === STEPS.length - 1
  const progress = (idx / (STEPS.length - 1)) * 100

  const getRect = useCallback((sel: string): Rect | null => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
  }, [])

  const measure = useCallback(() => {
    setSpotlight(step.target ? getRect(step.target) : null)
  }, [step.target, getRect])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  useLayoutEffect(() => {
    if (!cardRef.current) return
    const r = cardRef.current.getBoundingClientRect()
    const cw = r.width || 300, ch = r.height || 200
    if (!spotlight || !step.target || step.position === 'center') {
      setCardPos({ top: Math.max(MARGIN, (window.innerHeight - ch) / 2), left: Math.max(MARGIN, (window.innerWidth - cw) / 2) })
      return
    }
    setCardPos(calcPos(spotlight, step.position ?? 'right', cw, ch))
  }, [spotlight, step])

  const isCentered = !spotlight || !step.target || step.position === 'center'

  return createPortal(
    <div className="fixed inset-0 z-[9999] select-none">
      {spotlight ? (
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
          <defs>
            <mask id="premium-tutorial-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect x={spotlight.left} y={spotlight.top} width={spotlight.width} height={spotlight.height} rx={8} fill="black" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.80)" mask="url(#premium-tutorial-mask)" />
          <rect x={spotlight.left} y={spotlight.top} width={spotlight.width} height={spotlight.height} rx={8} fill="none" stroke="#eab308" strokeWidth="1.5" strokeOpacity="0.7" />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-black/80 pointer-events-none" />
      )}

      <div className="absolute inset-0" onClick={e => e.stopPropagation()} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.18 }}
          style={
            cardPos
              ? { position: 'fixed', top: cardPos.top, left: cardPos.left }
              : isCentered
                ? undefined
                : { position: 'fixed', top: -9999, left: -9999 }
          }
          className={cn(
            'w-[calc(100vw-24px)] max-w-[320px]',
            'bg-pulse-bg-floating border border-yellow-500/20 rounded-2xl shadow-2xl shadow-yellow-500/10 overflow-hidden',
            isCentered && !cardPos && 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          )}
        >
          {/* Gold progress bar */}
          <div className="h-0.5 bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(100dvh - 48px)' }}>
            {(isFirst || isLast) && (
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  {step.icon}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 mb-3">
              {!isFirst && !isLast && (
                <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  {step.icon}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-yellow-400 mb-0.5">
                  {isFirst ? 'Welcome' : isLast ? 'All done!' : `Feature ${idx} of ${STEPS.length - 2}`}
                </p>
                <h3 className="font-bold text-white text-[15px] leading-snug">{step.title}</h3>
              </div>
            </div>

            <p className="text-sm text-pulse-text-muted leading-relaxed mb-4">{step.description}</p>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 shrink-0">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={cn(
                      'rounded-full transition-all duration-200',
                      i === idx ? 'w-4 h-2 bg-yellow-500' : 'w-2 h-2 bg-white/20 hover:bg-white/40',
                    )}
                  />
                ))}
              </div>
              <button
                onClick={() => { if (isLast) { onComplete() } else { setIdx(i => i + 1) } }}
                className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white text-sm font-semibold rounded-xl transition-all whitespace-nowrap shadow shadow-yellow-500/20"
              >
                {isLast ? <><Sparkles size={13} /> Start exploring</>
                  : isFirst ? <>Let's go <ArrowRight size={13} /></>
                  : <>Next <ChevronRight size={13} /></>}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  )
}
