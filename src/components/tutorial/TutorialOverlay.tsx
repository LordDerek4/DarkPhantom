import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Sparkles, Users, MessageSquare, Settings, Compass, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { AppLogo } from '@/components/ui/AppLogo'

export interface TutorialStep {
  id: string
  target?: string              // CSS selector — if omitted, renders as centered card
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
    description: 'Open the Friends panel to send friend requests by username and see who\'s online.',
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

const PADDING = 12

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

function getTooltipPosition(
  spotlight: SpotlightRect,
  position: TutorialStep['position'],
  tooltipW = 320,
  tooltipH = 180,
) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const s = spotlight

  if (position === 'right') {
    const left = Math.min(s.left + s.width + PADDING + 8, vw - tooltipW - 16)
    const top = Math.max(8, Math.min(s.top + s.height / 2 - tooltipH / 2, vh - tooltipH - 16))
    return { top, left }
  }
  if (position === 'left') {
    const left = Math.max(8, s.left - tooltipW - PADDING - 8)
    const top = Math.max(8, Math.min(s.top + s.height / 2 - tooltipH / 2, vh - tooltipH - 16))
    return { top, left }
  }
  if (position === 'top') {
    const top = Math.max(8, s.top - tooltipH - PADDING - 8)
    const left = Math.max(8, Math.min(s.left + s.width / 2 - tooltipW / 2, vw - tooltipW - 16))
    return { top, left }
  }
  if (position === 'bottom') {
    const top = Math.min(s.top + s.height + PADDING + 8, vh - tooltipH - 16)
    const left = Math.max(8, Math.min(s.left + s.width / 2 - tooltipW / 2, vw - tooltipW - 16))
    return { top, left }
  }
  // center
  return {
    top: vh / 2 - tooltipH / 2,
    left: vw / 2 - tooltipW / 2,
  }
}

interface Props {
  onComplete: () => void
  onSkip: () => void
}

export function TutorialOverlay({ onComplete, onSkip }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const step = TUTORIAL_STEPS[stepIdx]
  const isFirst = stepIdx === 0
  const isLast = stepIdx === TUTORIAL_STEPS.length - 1
  const isCentered = !step.target || step.position === 'center'

  const measureTarget = useCallback(() => {
    if (!step.target) { setSpotlight(null); return }
    const el = document.querySelector(step.target)
    if (!el) { setSpotlight(null); return }
    const r = el.getBoundingClientRect()
    setSpotlight({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    })
  }, [step.target])

  useLayoutEffect(() => {
    observerRef.current?.disconnect()
    measureTarget()
    if (step.target) {
      const el = document.querySelector(step.target)
      if (el) {
        const ro = new ResizeObserver(measureTarget)
        ro.observe(el)
        observerRef.current = ro
      }
    }
    window.addEventListener('resize', measureTarget)
    return () => {
      observerRef.current?.disconnect()
      window.removeEventListener('resize', measureTarget)
    }
  }, [measureTarget])

  const next = () => {
    if (isLast) { onComplete(); return }
    setStepIdx(i => i + 1)
  }

  const tooltipPos = spotlight
    ? getTooltipPosition(spotlight, step.position ?? 'right')
    : { top: window.innerHeight / 2 - 90, left: window.innerWidth / 2 - 160 }

  const progress = (stepIdx / (TUTORIAL_STEPS.length - 1)) * 100

  return createPortal(
    <div className="fixed inset-0 z-[9999] select-none">
      {/* Dark overlay with spotlight hole via SVG clip */}
      {spotlight ? (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <mask id="tutorial-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx={10}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.75)"
            mask="url(#tutorial-mask)"
          />
          {/* Spotlight glow border */}
          <rect
            x={spotlight.left}
            y={spotlight.top}
            width={spotlight.width}
            height={spotlight.height}
            rx={10}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeOpacity="0.6"
            className="animate-pulse"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-black/75 pointer-events-none" />
      )}

      {/* Click-through blocker — only allow tooltip interaction */}
      <div className="absolute inset-0" onClick={e => e.stopPropagation()} />

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -8 }}
          transition={{ duration: 0.2 }}
          style={isCentered ? undefined : { position: 'fixed', top: tooltipPos.top, left: tooltipPos.left }}
          className={cn(
            'w-80 bg-pulse-bg-floating border border-white/10 rounded-2xl shadow-2xl overflow-hidden',
            isCentered && 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          )}
        >
          {/* Progress bar */}
          <div className="h-0.5 bg-white/10">
            <motion.div
              className="h-full bg-pulse-brand"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-5">
            {/* Header */}
            {(isFirst || isLast) && (
              <div className="flex justify-center mb-4">
                <AppLogo size={48} showText={false} />
              </div>
            )}

            <div className="flex items-start gap-3 mb-4">
              {!isFirst && !isLast && (
                <div className="w-9 h-9 rounded-xl bg-pulse-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                  {step.icon}
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-pulse-brand mb-1">
                  Step {stepIdx + 1} of {TUTORIAL_STEPS.length}
                </p>
                <h3 className="font-bold text-white text-base leading-snug">{step.title}</h3>
              </div>
            </div>

            <p className="text-sm text-pulse-text-muted leading-relaxed mb-5">{step.description}</p>

            {/* Dot indicators */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {TUTORIAL_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStepIdx(i)}
                    className={cn(
                      'rounded-full transition-all duration-200',
                      i === stepIdx
                        ? 'w-4 h-2 bg-pulse-brand'
                        : 'w-2 h-2 bg-white/20 hover:bg-white/40',
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-pulse-brand hover:bg-pulse-brand-hover text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {isLast ? (
                    <>Get started <Sparkles size={14} /></>
                  ) : isFirst ? (
                    <>Let's go <ArrowRight size={14} /></>
                  ) : (
                    <>Next <ChevronRight size={14} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Skip button top-right */}
      {!isFirst && !isLast && (
        <button
          onClick={onSkip}
          className="fixed top-4 right-4 p-2 rounded-full bg-pulse-bg-floating border border-white/10 text-pulse-text-muted hover:text-white transition-colors shadow-lg"
          title="Skip tutorial"
        >
          <X size={16} />
        </button>
      )}
    </div>,
    document.body,
  )
}
