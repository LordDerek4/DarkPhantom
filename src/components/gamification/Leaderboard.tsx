import React, { useEffect, useState } from 'react'
import { Trophy, Zap, Award, Flame } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { getServerLeaderboard, getLevelTitle, xpProgressToNextLevel } from '@/services/gamification.service'
import { useAppStore } from '@/store/useAppStore'
import type { UserXP } from '@/types/extended'

const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']
const RANK_ICONS = ['🥇', '🥈', '🥉']

interface LeaderboardProps { serverId: string }

export function Leaderboard({ serverId }: LeaderboardProps) {
  const [entries, setEntries] = useState<UserXP[]>([])
  const [loading, setLoading] = useState(true)
  const users = useAppStore(s => s.users)

  useEffect(() => {
    getServerLeaderboard(serverId).then(data => {
      setEntries(data)
      setLoading(false)
    })
  }, [serverId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin w-6 h-6 border-2 border-pulse-brand border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Trophy size={14} className="text-yellow-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">Leaderboard</span>
      </div>

      {entries.length === 0 && (
        <p className="text-xs text-pulse-text-muted text-center py-4">No XP yet — start chatting!</p>
      )}

      {entries.map((entry, i) => {
        const user = users[entry.userId]
        const { current, required, level } = xpProgressToNextLevel(entry.xp)
        const progress = (current / required) * 100
        const title = getLevelTitle(level)

        return (
          <div
            key={entry.userId}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl',
              i < 3 ? 'bg-pulse-bg-secondary' : 'bg-pulse-bg-primary'
            )}
          >
            <span className={cn('text-sm font-bold w-6 text-center', RANK_COLORS[i] ?? 'text-pulse-text-muted')}>
              {i < 3 ? RANK_ICONS[i] : `#${i + 1}`}
            </span>

            <div className="w-8 h-8 rounded-full bg-pulse-brand/20 flex items-center justify-center text-sm shrink-0">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-pulse-text-normal truncate">
                  {user?.displayName ?? entry.userId.slice(0, 8)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Zap size={10} className="text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">{entry.xp.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-pulse-text-muted">Lv.{level} {title}</span>
                <div className="flex-1 h-1 bg-pulse-bg-modifier rounded-full overflow-hidden">
                  <div className="h-full bg-pulse-brand rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {entry.streak > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Flame size={12} className="text-orange-400" />
                <span className="text-xs text-orange-400">{entry.streak}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
