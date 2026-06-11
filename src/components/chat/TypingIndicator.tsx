import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TypingIndicatorProps {
  typingUsers: { userId: string; username: string }[]
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const text = typingUsers.length === 1
    ? `${typingUsers[0].username} is typing...`
    : typingUsers.length === 2
    ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
    : `${typingUsers.length} people are typing...`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        className="flex items-center gap-2 px-4 py-1 text-xs text-pulse-text-muted"
      >
        <div className="flex gap-0.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-pulse-text-muted"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        <span>{text}</span>
      </motion.div>
    </AnimatePresence>
  )
}
