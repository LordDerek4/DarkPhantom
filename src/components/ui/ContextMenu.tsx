import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/utils/helpers'
import { useAppStore } from '@/store/useAppStore'

interface ContextMenuItemProps {
  icon?: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

export function ContextMenuItem({ icon, label, onClick, destructive, disabled }: ContextMenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm',
        'transition-colors',
        destructive
          ? 'text-pulse-text-danger hover:bg-pulse-text-danger hover:text-white'
          : 'text-pulse-text-normal hover:bg-pulse-brand hover:text-white',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
      {label}
    </button>
  )
}

export function ContextMenuSeparator() {
  return <hr className="my-1 border-white/10" />
}

interface ContextMenuProps {
  children: React.ReactNode
}

export function ContextMenuContainer({ children }: ContextMenuProps) {
  const { contextMenu, hideContextMenu } = useAppStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        hideContextMenu()
      }
    }
    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu.visible, hideContextMenu])

  const style = {
    position: 'fixed' as const,
    top: contextMenu.y,
    left: contextMenu.x,
    zIndex: 9999,
  }

  return (
    <AnimatePresence>
      {contextMenu.visible && (
        <motion.div
          ref={ref}
          style={style}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="min-w-[180px] bg-pulse-bg-floating rounded-md shadow-elevation-high p-1.5 border border-white/5"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
