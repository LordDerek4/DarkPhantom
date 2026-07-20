import React, { useState } from 'react'
import { Link2 } from 'lucide-react'
import { useServers } from '@/hooks/useServer'
import { useAppStore } from '@/store/useAppStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface JoinServerModalProps {
  open: boolean
  onClose: () => void
  initialCode?: string
}

export function JoinServerModal({ open, onClose, initialCode }: JoinServerModalProps) {
  const { join } = useServers()
  const { setActiveServer, setViewMode } = useAppStore()
  const [inviteCode, setInviteCode] = useState(initialCode ?? '')
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    if (open) setInviteCode(initialCode ?? '')
  }, [open, initialCode])

  const extractCode = (input: string): string => {
    const match = input.match(/(?:invite\/|^)([A-Za-z0-9]{8})(?:[^A-Za-z0-9].*)?$/)
    return match ? match[1] : input.trim()
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = extractCode(inviteCode)
    if (!code) return
    setLoading(true)
    try {
      const server = await join(code)
      setActiveServer(server.id)
      setViewMode('server')
      toast.success(`Joined "${server.name}"!`)
      onClose()
      setInviteCode('')
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Invalid or expired invite link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join a Server" size="sm">
      <form onSubmit={handleJoin} className="space-y-4">
        <p className="text-pulse-text-muted text-sm">
          Paste an invite link to join a server.
        </p>

        {/* Link input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">
            Invite Link
          </label>
          <div className="relative">
            <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-text-muted pointer-events-none" />
            <input
              autoFocus
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="https://…/invite/ABCD1234"
              className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors font-mono"
            />
          </div>
        </div>

        {/* Example */}
        <div className="rounded-xl bg-pulse-bg-primary border border-white/5 divide-y divide-white/5">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <Link2 size={13} className="text-pulse-text-muted shrink-0" />
            <div>
              <p className="text-xs font-medium text-pulse-text-muted">Full invite link</p>
              <p className="text-xs font-mono text-pulse-text-normal mt-0.5 truncate">…/invite/ABCD1234</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} disabled={!inviteCode.trim()}>
            Join Server
          </Button>
        </div>
      </form>
    </Modal>
  )
}
