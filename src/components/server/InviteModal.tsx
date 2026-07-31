import React, { useEffect, useState } from 'react'
import { Copy, Check, Trash2, Clock } from 'lucide-react'
import { useServerInvites } from '@/hooks/useServer'
import { useAppStore } from '@/store/useAppStore'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatRelativeTime } from '@/utils/helpers'
import type { Invite } from '@/types'
import toast from 'react-hot-toast'

interface InviteModalProps {
  open: boolean
  onClose: () => void
  serverId: string
  channelId: string
}

export function InviteModal({ open, onClose, serverId, channelId }: InviteModalProps) {
  const { user } = useAuth()
  const { invites, loading, create, remove } = useServerInvites(serverId)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const activeInvites = invites.filter(inv => {
    if (!inv.expiresAt) return true
    return inv.expiresAt.toDate() > new Date()
  })

  const handleCreate = async () => {
    if (!user) return
    setCreating(true)
    try {
      await create(channelId, user.uid, { expiresInHours: 24 })
      toast.success('Invite created!')
    } catch {
      toast.error('Failed to create invite')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = (invite: Invite) => {
    navigator.clipboard.writeText(invite.code)
    setCopiedId(invite.id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Invite code copied!')
  }

  const handleDelete = async (inviteId: string) => {
    await remove(inviteId)
    toast.success('Invite deleted')
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite People" size="md">
      <div className="space-y-4">
        <Button onClick={handleCreate} loading={creating} className="w-full">
          Create New Invite Link
        </Button>

        {activeInvites.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">
              Active Invites
            </p>
            {activeInvites.map(invite => (
              <div
                key={invite.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-pulse-bg-elevated"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold tracking-[0.2em] text-pulse-text-normal">
                    {invite.code}
                  </p>
                  <p className="text-xs text-pulse-text-muted truncate">
                    {window.location.origin}/invite/{invite.code}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-pulse-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {invite.expiresAt
                        ? `Expires ${formatRelativeTime(invite.expiresAt)}`
                        : 'Never expires'}
                    </span>
                    <span>{invite.uses} uses</span>
                  </div>
                </div>
                <button onClick={() => handleCopy(invite)} className="p-1.5 rounded hover:bg-white/10 text-pulse-text-muted hover:text-pulse-text-normal">
                  {copiedId === invite.id ? <Check size={16} className="text-pulse-status-online" /> : <Copy size={16} />}
                </button>
                <button onClick={() => handleDelete(invite.id)} className="p-1.5 rounded hover:bg-white/10 text-pulse-text-muted hover:text-pulse-text-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
