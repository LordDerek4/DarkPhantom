import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Headphones, VolumeX, Settings, Smile } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/helpers'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { updateUserProfile, updateUserStatus } from '@/services/user.service'
import { updatePresence } from '@/services/presence.service'
import type { UserStatus } from '@/types'
import toast from 'react-hot-toast'

const STATUS_OPTIONS: { value: UserStatus; label: string; color: string; emoji: string }[] = [
  { value: 'online', label: 'Online', color: 'bg-green-500', emoji: '🟢' },
  { value: 'idle', label: 'Idle', color: 'bg-yellow-500', emoji: '🟡' },
  { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500', emoji: '🔴' },
  { value: 'offline', label: 'Invisible', color: 'bg-gray-500', emoji: '⚫' },
]

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-pulse-status-online',
  idle: 'bg-pulse-status-idle',
  dnd: 'bg-pulse-status-dnd',
  offline: 'bg-pulse-status-offline',
}

export function UserPanel() {
  const { user } = useAuth()
  const { setSettingsOpen, setUserProfileId } = useAppStore()
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showCustomStatus, setShowCustomStatus] = useState(false)
  const [customStatusDraft, setCustomStatusDraft] = useState(user?.customStatus ?? '')
  const [savingStatus, setSavingStatus] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!showStatusMenu) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setShowStatusMenu(false)
        setShowCustomStatus(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showStatusMenu])

  if (!user) return null

  const handleStatusChange = async (status: UserStatus) => {
    try {
      await Promise.all([
        updateUserStatus(user.uid, status),
        updatePresence(user.uid, status),
      ])
    } catch {
      toast.error('Failed to update status')
    }
    setShowStatusMenu(false)
  }

  const handleSaveCustomStatus = async () => {
    if (!user) return
    setSavingStatus(true)
    try {
      await updateUserProfile(user.uid, { customStatus: customStatusDraft })
      toast.success('Status updated')
      setShowStatusMenu(false)
      setShowCustomStatus(false)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setSavingStatus(false)
    }
  }

  const currentStatus = useAppStore.getState().presences[user.uid] ?? user.status ?? 'offline'

  return (
    <div className="relative h-14 bg-pulse-bg-primary flex items-center px-2 gap-1 shrink-0">
      {/* Avatar + name — click to view own profile */}
      <button
        onClick={() => setUserProfileId(user.uid)}
        className="flex items-center gap-2 flex-1 min-w-0 rounded-lg p-1.5 hover:bg-white/10 transition-colors text-left"
      >
        <div className="relative shrink-0">
          <Avatar src={user.avatarUrl} name={user.displayName} userId={user.uid} size="sm" />
          <button
            onClick={e => { e.stopPropagation(); setShowStatusMenu(v => !v) }}
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-pulse-bg-primary cursor-pointer hover:scale-110 transition-transform"
            style={{}}
          >
            <span className={cn('block w-full h-full rounded-full', STATUS_COLORS[currentStatus])} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-pulse-text-normal truncate leading-tight">
            {user.displayName}
          </p>
          <p className="text-[11px] text-pulse-text-muted truncate leading-tight">
            {user.customStatus || `@${user.username}`}
          </p>
        </div>
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Tooltip content={isMuted ? 'Unmute' : 'Mute'} side="top">
          <button
            onClick={() => setIsMuted(v => !v)}
            className={cn(
              'p-1.5 rounded transition-colors',
              isMuted ? 'text-pulse-text-danger' : 'text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/10'
            )}
          >
            {isMuted ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
        </Tooltip>

        <Tooltip content={isDeafened ? 'Undeafen' : 'Deafen'} side="top">
          <button
            onClick={() => setIsDeafened(v => !v)}
            className={cn(
              'p-1.5 rounded transition-colors',
              isDeafened ? 'text-pulse-text-danger' : 'text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/10'
            )}
          >
            {isDeafened ? <VolumeX size={17} /> : <Headphones size={17} />}
          </button>
        </Tooltip>

        <Tooltip content="User Settings" side="top">
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/10 transition-colors"
          >
            <Settings size={17} />
          </button>
        </Tooltip>
      </div>

      {/* Status popup menu */}
      <AnimatePresence>
        {showStatusMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute bottom-16 left-2 w-56 bg-pulse-bg-elevated border border-white/10 rounded-xl shadow-elevation-high overflow-hidden z-50"
          >
            {/* Custom status input */}
            {showCustomStatus ? (
              <div className="p-3 space-y-2">
                <p className="text-xs font-semibold text-pulse-text-muted uppercase tracking-wide">
                  Set Custom Status
                </p>
                <div className="flex gap-2">
                  <input
                    value={customStatusDraft}
                    onChange={e => setCustomStatusDraft(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveCustomStatus()}
                    placeholder="What are you up to?"
                    maxLength={128}
                    autoFocus
                    className="flex-1 bg-pulse-bg-primary border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveCustomStatus}
                    disabled={savingStatus}
                    className="px-2.5 py-1.5 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
                <button
                  onClick={() => setShowCustomStatus(false)}
                  className="text-xs text-pulse-text-muted hover:text-pulse-text-normal transition-colors"
                >
                  ← Back
                </button>
              </div>
            ) : (
              <>
                {/* Custom status button */}
                <button
                  onClick={() => setShowCustomStatus(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-white/5"
                >
                  <Smile size={15} className="text-pulse-text-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-pulse-text-normal">
                      {user.customStatus || 'Set a Custom Status'}
                    </p>
                    {user.customStatus && (
                      <p className="text-[10px] text-pulse-text-muted">Click to change</p>
                    )}
                  </div>
                </button>

                {/* Status options */}
                <div className="py-1">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(s.value)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left',
                        currentStatus === s.value && 'bg-white/5'
                      )}
                    >
                      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', s.color)} />
                      <span className="text-sm text-pulse-text-normal">{s.label}</span>
                      {currentStatus === s.value && (
                        <span className="ml-auto text-pulse-brand text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
