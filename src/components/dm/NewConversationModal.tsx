import React, { useState, useCallback, useEffect } from 'react'
import { Search, X, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { searchUsers } from '@/services/user.service'
import { getUserById } from '@/services/auth.service'
import { getFriends, getFriendUserId } from '@/services/friends.service'
import { useDMChannels } from '@/hooks/useDirectMessages'
import { Avatar } from '@/components/ui/Avatar'
import { debounce } from '@/utils/helpers'
import type { User } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
}

export function NewConversationModal({ open, onClose }: Props) {
  const { user } = useAuth()
  const { setActiveDMChannel, setViewMode } = useAppStore()
  const { openDM } = useDMChannels()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [friends, setFriends] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)

  // Load friends list
  useEffect(() => {
    if (!user || !open) return
    getFriends(user.uid).then(async friendships => {
      const ids = friendships.map(f => getFriendUserId(f, user.uid))
      const users = await Promise.all(ids.map(id => getUserById(id)))
      setFriends(users.filter(Boolean) as User[])
    }).catch(() => {})
  }, [user, open])

  const doSearch = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) { setResults([]); return }
      setSearching(true)
      try {
        const r = await searchUsers(q, user?.uid)
        setResults(r)
      } finally {
        setSearching(false)
      }
    }, 280),
    [user?.uid]
  )

  const handleQueryChange = (v: string) => {
    setQuery(v)
    doSearch(v)
  }

  const displayList: User[] = query ? results : friends

  const handleOpenDM = async (targetUser: User) => {
    if (!user) return
    setCreating(true)
    try {
      const channel = await openDM(targetUser.uid)
      setActiveDMChannel(channel.id)
      setViewMode('dm')
      handleClose()
    } catch {
      toast.error('Failed to open conversation')
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    setQuery('')
    setResults([])
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-md bg-pulse-bg-secondary rounded-2xl shadow-elevation-high overflow-hidden z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <p className="text-sm font-semibold text-pulse-text-normal">New Message</p>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-pulse-text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-text-muted" />
            <input
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Search users or friends..."
              autoFocus
              className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none"
            />
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-0.5">
            {!query && friends.length > 0 && (
              <p className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted px-2 py-1">
                Friends
              </p>
            )}

            {searching && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-pulse-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!searching && displayList.map(u => (
              <button
                key={u.uid}
                onClick={() => handleOpenDM(u)}
                disabled={creating}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                <Avatar src={u.avatarUrl} name={u.displayName} userId={u.uid} size="sm" showStatus />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-pulse-text-normal truncate">{u.displayName}</p>
                  <p className="text-xs text-pulse-text-muted">@{u.username}</p>
                </div>
              </button>
            ))}

            {!searching && query && displayList.length === 0 && (
              <div className="text-center py-6 text-pulse-text-muted text-sm">
                No users found for "{query}"
              </div>
            )}

            {!searching && !query && friends.length === 0 && (
              <div className="text-center py-6 text-pulse-text-muted text-sm">
                <UserPlus size={24} className="mx-auto mb-2 opacity-30" />
                <p>No friends yet</p>
                <p className="text-xs mt-0.5">Search to find users</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
