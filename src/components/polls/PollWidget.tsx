import React, { useEffect, useState } from 'react'
import { BarChart2, Clock, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/helpers'
import { votePoll, closePoll } from '@/services/polls.service'
import { useAuth } from '@/hooks/useAuth'
import type { Poll } from '@/types/extended'

export function PollWidget({ poll, isOwner }: { poll: Poll; isOwner: boolean }) {
  const { user } = useAuth()
  const hasVoted = user ? poll.voterIds.includes(user.uid) : false
  const canVote = poll.isActive && !hasVoted && !!user

  const handleVote = async (optionId: string) => {
    if (!canVote || !user) return
    await votePoll(poll.id, optionId, user.uid)
  }

  const showResults = hasVoted || !poll.isActive || (poll.showResultsBeforeEnd && poll.totalVotes > 0)

  return (
    <div className="rounded-xl bg-pulse-bg-secondary border border-white/5 p-4 space-y-3 max-w-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-pulse-text-muted mb-1">
            <BarChart2 size={12} />
            <span className="uppercase tracking-wide font-semibold">Poll</span>
            {!poll.isActive && <span className="text-red-400">Closed</span>}
          </div>
          <p className="font-medium text-pulse-text-normal text-sm">{poll.question}</p>
        </div>
        {isOwner && poll.isActive && (
          <button onClick={() => closePoll(poll.id)} className="text-xs text-pulse-text-muted hover:text-red-400">
            Close
          </button>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map(option => {
          const percentage = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0
          const userVoted = user ? option.voterIds.includes(user.uid) : false

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!canVote}
              className={cn(
                'w-full text-left rounded-lg overflow-hidden transition-all',
                canVote ? 'hover:ring-1 hover:ring-pulse-brand/50 cursor-pointer' : 'cursor-default',
                userVoted && 'ring-1 ring-pulse-brand'
              )}
            >
              <div className="relative px-3 py-2 bg-pulse-bg-primary">
                {showResults && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={cn('absolute inset-y-0 left-0 rounded-lg', userVoted ? 'bg-pulse-brand/20' : 'bg-white/5')}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <span className="text-sm text-pulse-text-normal">{option.text}</span>
                  {showResults && (
                    <span className="text-xs font-medium text-pulse-text-muted">
                      {Math.round(percentage)}%
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 text-xs text-pulse-text-muted">
        <div className="flex items-center gap-1">
          <Users size={11} />
          <span>{poll.totalVotes} votes</span>
        </div>
        {poll.endsAt && poll.isActive && (
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span>Ends {poll.endsAt.toDate().toLocaleDateString()}</span>
          </div>
        )}
        {!poll.isActive && <span className="text-pulse-text-muted">Poll closed</span>}
      </div>
    </div>
  )
}
