import React, { useState } from 'react'
import { Link2, Compass, KeyRound } from 'lucide-react'
import { useServers } from '@/hooks/useServer'
import { useAppStore } from '@/store/useAppStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { BrowseCommunitiesPanel } from '@/components/server/BrowseCommunitiesPanel'
import { cn } from '@/utils/helpers'
import toast from 'react-hot-toast'

interface JoinServerModalProps {
  open: boolean
  onClose: () => void
  initialCode?: string
}

type Mode = 'browse' | 'code'

export function JoinServerModal({ open, onClose, initialCode }: JoinServerModalProps) {
  const { join } = useServers()
  const { setActiveServer, setViewMode } = useAppStore()
  const [mode, setMode] = useState<Mode>(initialCode ? 'code' : 'browse')
  const [inviteCode, setInviteCode] = useState(initialCode ?? '')
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    if (open) {
      setInviteCode(initialCode ?? '')
      setMode(initialCode ? 'code' : 'browse')
    }
  }, [open, initialCode])

  const extractCode = (input: string): string => {
    const match = input.match(/(?:invite\/|^)(\d{6})(?:[^\d].*)?$/)
    return match ? match[1] : input.trim()
  }

  const goToServer = (serverId: string, name: string, alreadyJoined = false) => {
    setActiveServer(serverId)
    setViewMode('server')
    if (alreadyJoined) toast.success(`Joined "${name}"!`)
    onClose()
    setInviteCode('')
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = extractCode(inviteCode)
    if (!code) return
    setLoading(true)
    try {
      const server = await join(code)
      goToServer(server.id, server.name, true)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Invalid or expired invite code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join a Server" size={mode === 'browse' ? 'lg' : 'sm'}>
      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 bg-pulse-bg-primary rounded-xl mx-6 mt-1 mb-2 w-fit">
        <button
          onClick={() => setMode('browse')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all',
            mode === 'browse' ? 'bg-pulse-brand text-white shadow' : 'text-pulse-text-muted hover:text-pulse-text-normal'
          )}
        >
          <Compass size={14} /> Browse Public
        </button>
        <button
          onClick={() => setMode('code')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all',
            mode === 'code' ? 'bg-pulse-brand text-white shadow' : 'text-pulse-text-muted hover:text-pulse-text-normal'
          )}
        >
          <KeyRound size={14} /> Have a Code
        </button>
      </div>

      {mode === 'browse' ? (
        <BrowseCommunitiesPanel onJoined={id => goToServer(id, '')} />
      ) : (
        <form onSubmit={handleJoin} className="px-6 pb-6 pt-2 space-y-4">
          <p className="text-pulse-text-muted text-sm">
            Enter a 6-digit invite code to join a private server.
          </p>

          {/* Code input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">
              Invite Code
            </label>
            <div className="relative">
              <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-text-muted pointer-events-none" />
              <input
                autoFocus
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={!inviteCode.trim()}>
              Join Server
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
