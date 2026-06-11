import React, { useEffect, useState } from 'react'
import { ShieldAlert, UserX, VolumeX, Ban, AlertTriangle } from 'lucide-react'
import {
  muteMember,
  kickMember,
  banMember,
  unbanMember,
  unmuteMember,
  warnMember,
  getModerationLogs,
} from '@/services/moderation.service'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useUser } from '@/hooks/useUserCache'
import { formatRelativeTime } from '@/utils/helpers'
import { useAppStore, selectActiveMembers, selectActiveRoles } from '@/store/useAppStore'
import { hasPermission, canModerate } from '@/utils/permissions'
import type { ModerationLog, ServerMember } from '@/types'
import toast from 'react-hot-toast'

interface ModerationActionModalProps {
  open: boolean
  onClose: () => void
  action: 'mute' | 'kick' | 'ban' | 'warn'
  targetMember: ServerMember | null
  serverId: string
}

export function ModerationActionModal({ open, onClose, action, targetMember, serverId }: ModerationActionModalProps) {
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('60')
  const [loading, setLoading] = useState(false)
  const targetUser = useUser(targetMember?.userId ?? null)

  const titles = { mute: 'Mute Member', kick: 'Kick Member', ban: 'Ban Member', warn: 'Warn Member' }
  const icons = {
    mute: <VolumeX size={20} className="text-yellow-400" />,
    kick: <UserX size={20} className="text-orange-400" />,
    ban: <Ban size={20} className="text-red-400" />,
    warn: <AlertTriangle size={20} className="text-yellow-400" />,
  }

  const handleConfirm = async () => {
    if (!user || !targetMember) return
    setLoading(true)
    try {
      switch (action) {
        case 'mute':
          await muteMember(serverId, targetMember.userId, user.uid, parseInt(duration), reason)
          toast.success(`Muted ${targetUser?.displayName ?? 'member'}`)
          break
        case 'kick':
          await kickMember(serverId, targetMember.userId, user.uid, reason)
          toast.success(`Kicked ${targetUser?.displayName ?? 'member'}`)
          break
        case 'ban':
          await banMember(serverId, targetMember.userId, user.uid, reason)
          toast.success(`Banned ${targetUser?.displayName ?? 'member'}`)
          break
        case 'warn':
          await warnMember(serverId, targetMember.userId, user.uid, reason)
          toast.success(`Warned ${targetUser?.displayName ?? 'member'}`)
          break
      }
      onClose()
    } catch (err) {
      toast.error((err as Error).message ?? 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={titles[action]} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-pulse-bg-elevated">
          {icons[action]}
          <div>
            <p className="text-sm font-medium text-white">{targetUser?.displayName ?? 'Unknown'}</p>
            <p className="text-xs text-pulse-text-muted">@{targetUser?.username}</p>
          </div>
        </div>

        {action === 'mute' && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted block mb-1.5">
              Duration (minutes)
            </label>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full h-10 px-3 rounded bg-pulse-surface-input border border-white/5 text-pulse-text-normal text-sm outline-none"
            >
              {[5, 10, 30, 60, 120, 1440, 10080].map(d => (
                <option key={d} value={d}>
                  {d < 60 ? `${d}m` : d < 1440 ? `${d / 60}h` : `${d / 1440}d`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted block mb-1.5">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Enter a reason..."
            rows={3}
            className="w-full px-3 py-2 rounded bg-pulse-surface-input border border-white/5 text-pulse-text-normal text-sm outline-none resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={handleConfirm}>
            {titles[action]}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function ModerationLogs({ serverId }: { serverId: string }) {
  const [logs, setLogs] = useState<ModerationLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getModerationLogs(serverId).then(l => {
      setLogs(l)
      setLoading(false)
    })
  }, [serverId])

  const actionLabels: Record<string, string> = {
    mute: 'Muted',
    unmute: 'Unmuted',
    kick: 'Kicked',
    ban: 'Banned',
    unban: 'Unbanned',
    warn: 'Warned',
    delete_message: 'Deleted message',
  }

  const actionColors: Record<string, string> = {
    ban: 'text-red-400',
    kick: 'text-orange-400',
    mute: 'text-yellow-400',
    warn: 'text-yellow-400',
    unban: 'text-green-400',
    unmute: 'text-green-400',
  }

  return (
    <div className="space-y-2">
      {loading && <p className="text-pulse-text-muted text-sm">Loading logs...</p>}
      {!loading && logs.length === 0 && (
        <div className="text-center py-8 text-pulse-text-muted">
          <ShieldAlert size={32} className="mx-auto mb-2 opacity-40" />
          <p>No moderation actions yet</p>
        </div>
      )}
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-pulse-bg-elevated">
          <ShieldAlert size={16} className={cn('mt-0.5 shrink-0', actionColors[log.action] ?? 'text-pulse-text-muted')} />
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className={cn('font-medium', actionColors[log.action])}>
                {actionLabels[log.action] ?? log.action}
              </span>{' '}
              <UserChip userId={log.targetUserId} />
              {log.reason && <span className="text-pulse-text-muted"> — {log.reason}</span>}
            </p>
            <p className="text-xs text-pulse-text-muted mt-0.5">
              by <UserChip userId={log.moderatorId} /> {log.createdAt ? formatRelativeTime(log.createdAt) : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function UserChip({ userId }: { userId: string }) {
  const user = useUser(userId)
  return <span className="font-medium text-white">{user?.displayName ?? userId.slice(0, 8)}</span>
}

function cn(...args: (string | undefined | false)[]) {
  return args.filter(Boolean).join(' ')
}
