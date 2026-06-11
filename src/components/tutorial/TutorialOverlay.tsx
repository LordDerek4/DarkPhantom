import React, { useLayoutEffect, useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Sparkles, Users, MessageSquare, Settings, Compass, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { AppLogo } from '@/components/ui/AppLogo'

export interface TutorialStep {
  id: string
  target?: string
  title: string
  description: string
  icon?: React.ReactNode
  position?: 'right' | 'left' | 'top' | 'bottom' | 'center'
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AevixChat!',
    description: "You're all set up. This quick tour will show you around — it takes less than a minute.",
    icon: <Sparkles size={28} className="text-pulse-brand" />,
    position: 'center',
  },
  {
    id: 'add-server',
    target: '[data-tutorial="add-server"]',
    title: 'Create or Join a Community',
    description: 'Click the + button to create your own server or join an existing one with an invite link.',
    icon: <Compass size={22} className="text-pulse-brand" />,
    position: 'right',
  },
  {
    id: 'friends',
    target: '[data-tutorial="friends-btn"]',
    title: 'Add Friends',
    description: "Open the Friends panel to send friend requests by username and see who's online.",
    icon: <Users size={22} className="text-pulse-brand" />,
    position: 'right',
  },
  {
    id: 'dms',
    target: '[data-tutorial="dm-list"]',
    title: 'Direct Messages',
    description: 'Your private conversations with friends live here. Click any name to start chatting.',
    icon: <MessageSquare size={22} className="text-pulse-brand" />,
    position: 'right',
  },
  {
    id: 'profile',
    target: '[data-tutorial="user-panel"]',
    title: 'Your Profile & Settings',
    description: 'Click your avatar to view your profile, or the settings icon to personalise your account.',
    icon: <Settings size={22} className="text-pulse-brand" />,
    position: 'top',
  },
  {
    id: 'done',
    title: "You're ready to go!",
    description: 'Start a conversation, join a community, or add a friend. Enjoy AevixChat!',
    icon: <Sparkles size={28} className="text-pulse-brand" />,
    position: 'center',
  },
]

const SPOTLIGHT_PAD = 10
const CARD_GAP = 12
const SCREEN_MARGIN = 12

interface SpotlightRect { top: number; left: number; width: number; height: number }

// Returns clamped {top, left} for the card given the spotlight and card dimensions.
function calcCardPos(
  spotlight: SpotlightRect,
  prefPosition: TutorialStep['position'],
  cardW: number,
  cardH: number,
): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const s = spotlight
  const m = SCREEN_MARGIN

  const clampLeft = (l: number) => Math.max(m, Math.min(l, vw - cardW - m))
  const clampTop  = (t: number) => Math.max(m, Math.min(t, vh - cardH - m))

  if (prefPosition === 'right') {
    const left = s.left + s.width + CARD_GAP
    // If no room on right, flip to left
    const finalLeft = left + cardW + m > vw ? Math.max(m, s.left - cardW - CARD_GAP) : clampLeft(left)
    return { top: clampTop(s.top + s.height / 2 - cardH / 2), left: finalLeft }
  }
  if (prefPosition === 'left') {
    const left = s.left - cardW - CARD_GAP
    const finalLeft = left < m ? clampLeft(s.left + s.width + CARD_GAP) : clampLeft(left)
    return { top: clampTop(s.top + s.height / 2 - cardH / 2), left: finalLeft }
  }
  if (prefPosition === 'top') {
    const top = s.top - cardH - CARD_GAP
    const finalTop = top < m ? clampTop(s.top + s.height + CARD_GAP) : clampTop(top)
    return { top: finalTop, left: clampLeft(s.left + s.width / 2 - cardW / 2) }
  }
  if (prefPosition === 'bottom') {
    return {
      top: clampTop(s.top + s.height + CARD_GAP),
      left: clampLeft(s.left + s.width / 2 - cardW / 2),
    }
  }
  // center fallback
  return {
    top: Math.max(m, (vh - cardH) / 2),
    left: Math.max(m, (vw - cardW) / 2),
  }
}

interface Props { onComplete: () => void; onSkip: () => void }

export function TutorialOverlay({ onComplete, onSkip }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const step = TUTORIAL_STEPS[stepIdx]
  const isFirst = stepIdx === 0
  const isLast  = stepIdx === TUTORIAL_STEPS.length - 1
  const progress = (stepIdx / (TUTORIAL_STEPS.length - 1)) * 100

  // An element is considered "visible" only if it has positive area on screen
  const getVisibleRect = useCallback((selector: string): SpotlightRect | null => {
    const el = document.querySelector(selector)
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    return {
      top:    r.top    - SPOTLIGHT_PAD,
      left:   r.left   - SPOTLIGHT_PAD,
      width:  r.width  + SPOTLIGHT_PAD * 2,
      height: r.height + SPOTLIGHT_PAD * 2,
    }
  }, [])

  const measureStep = useCallback(() => {
    const rect = step.target ? getVisibleRect(step.target) : null
    setSpotlight(rect)
  }, [step.target, getVisibleRect])

  // Re-measure spotlight when step changes or window resizes
  useLayoutEffect(() => {
    observerRef.current?.disconnect()
    measureStep()
    if (step.target) {
      const el = document.querySelector(step.target)
      if (el) {
        const ro = new ResizeObserver(measureStep)
        ro.observe(el)
        observerRef.current = ro
      }
    }
    window.addEventListener('resize', measureStep)
    return () => {
      observerRef.current?.disconnect()
      window.removeEventListener('resize', measureStep)
    }
  }, [measureStep])

  // Once spotlight and card are known, compute card position
  useLayoutEffect(() => {
    if (!cardRef.current) return
    const cardR = cardRef.current.getBoundingClientRect()
    const cardW = cardR.width  || 300
    const cardH = cardR.height || 220

    // No spotlight (target missing / hidden) or forced-center step → center
    if (!spotlight || !step.target || step.position === 'center') {
      setCardPos({
        top:  Math.max(SCREEN_MARGIN, (window.innerHeight - cardH) / 2),
        left: Math.max(SCREEN_MARGIN, (window.innerWidth  - cardW) / 2),
      })
      return
    }

    setCardPos(calcCardPos(spotlight, step.position ?? 'right', cardW, cardH))
  }, [spotlight, step])

  // Re-position on window resize
  useEffect(() => {
    const handler = () => {
      if (!cardRef.current) return
      const cardR = cardRef.current.getBoundingClientRect()
      const cardW = cardR.width  || 300
      const cardH = cardR.height || 220
      if (!spotlight || !step.target || step.position === 'center') {
        setCardPos({
          top:  Math.max(SCREEN_MARGIN, (window.innerHeight - cardH) / 2),
          left: Math.max(SCREEN_MARGIN, (window.innerWidth  - cardW) / 2),
        })
        return
      }
      setCardPos(calcCardPos(spotlight, step.position ?? 'right', cardW, cardH))
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [spotlight, step])

  const next = () => {
    if (isLast) { onComplete(); return }
    setStepIdx(i => i + 1)
  }

  // Card is centered when no spotlight or explicitly center step
  const isCentered = !spotlight || !step.target || step.position === 'center'

  return createPortal(
    <div className="fixed inset-0 z-[9999] select-none">
      {/* Scrim */}
      {spotlight ? (
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
          <defs>
            <mask id="tutorial-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotlight.left} y={spotlight.top}
                width={spotlight.width} height={spotlight.height}
                rx={8} fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.78)" mask="url(#tutorial-mask)" />
          <rect
            x={spotlight.left} y={spotlight.top}
            width={spotlight.width} height={spotlight.height}
            rx={8} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.7"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-black/78 pointer-events-none" />
      )}

      {/* Prevent clicks reaching the app */}
      <div className="absolute inset-0" onClick={e => e.stopPropagation()} />

      {/* Tutorial card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ duration: 0.18 }}
          style={
            cardPos
              ? { position: 'fixed', top: cardPos.top, left: cardPos.left }
              : isCentered
                ? undefined
                : { position: 'fixed', top: -9999, left: -9999 }   /* off-screen until measured */
          }
          className={cn(
            // Width: 320px on md+, full-width minus margins on small screens
            'w-[calc(100vw-24px)] max-w-[320px]',
            'bg-pulse-bg-floating border border-white/10 rounded-2xl shadow-2xl overflow-hidden',
            // Center via CSS only when we don't have JS-computed position yet
            isCentered && !cardPos && 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          )}
        >
          {/* Progress bar */}
          <div className="h-0.5 bg-white/10 shrink-0">
            <motion.div
              className="h-full bg-pulse-brand"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Scrollable content area — caps height so card never goes off-screen */}
          <div
            className="overflow-y-auto p-4"
            style={{ maxHeight: 'calc(100dvh - 48px)' }}
          >
            {(isFirst || isLast) && (
              <div className="flex justify-center mb-3">
                <AppLogo size={40} showText={false} />
              </div>
            )}

            <div className="flex items-start gap-3 mb-3">
              {!isFirst && !isLast && (
                <div className="w-8 h-8 rounded-xl bg-pulse-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                  {step.icon}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-pulse-brand mb-0.5">
                  Step {stepIdx + 1} of {TUTORIAL_STEPS.length}
                </p>
                <h3 className="font-bold text-white text-[15px] leading-snug">{step.title}</h3>
              </div>
            </div>

            <p className="text-sm text-pulse-text-muted leading-relaxed mb-4">{step.description}</p>

            {/* Footer: dots + buttons */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 shrink-0">
                {TUTORIAL_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStepIdx(i)}
                    className={cn(
                      'rounded-full transition-all duration-200',
                      i === stepIdx ? 'w-4 h-2 bg-pulse-brand' : 'w-2 h-2 bg-white/20 hover:bg-white/40',
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isLast && (
                  <button
                    onClick={onSkip}
                    className="text-xs text-pulse-text-muted hover:text-pulse-text-normal transition-colors px-2 py-1 rounded hover:bg-white/5"
                  >
                    Skip
                  </button>
                )}
                <button
                  onClick={next}
                  className="flex items-center gap-1 px-3 py-2 bg-pulse-brand hover:bg-pulse-brand-hover text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
                >
                  {isLast ? <>Get started <Sparkles size={13} /></>
                    : isFirst ? <>Let's go <ArrowRight size={13} /></>
                    : <>Next <ChevronRight size={13} /></>}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Skip × — always top-right, safe from notch */}
      {!isFirst && !isLast && (
        <button
          onClick={onSkip}
          className="fixed top-safe-top right-4 mt-3 p-2 rounded-full bg-pulse-bg-floating border border-white/10 text-pulse-text-muted hover:text-white transition-colors shadow-lg z-10"
          style={{ top: 'max(env(safe-area-inset-top, 0px) + 8px, 12px)' }}
          title="Skip tutorial"
        >
          <X size={16} />
        </button>
      )}
    </div>,
    document.body,
  )
}
