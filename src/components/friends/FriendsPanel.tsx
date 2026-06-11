import React, { useEffect, useState, useCallback } from 'react'
import { UserPlus, Check, X, MessageSquare, Users, Search, UserMinus, Ban, Clock, UserCheck } from 'lucide-react'
import { cn, debounce } from '@/utils/helpers'
import {
  subscribeToFriendships, sendFriendRequestByUsername, respondToFriendRequest,
  cancelFriendRequest, unfriend, blockUser, unblockUser, getFriendUserId,
} from '@/services/friends.service'
import { getUserById } from '@/services/auth.service'
import { searchUsers } from '@/services/user.service'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { useDMChannels } from '@/hooks/useDirectMessages'
import { Avatar } from '@/components/ui/Avatar'
import type { Friendship } from '@/types/extended'
import type { User } from '@/types'
import toast from 'react-hot-toast'

type Tab = 'online' | 'all' | 'pending' | 'add'

export function FriendsPanel() {
  const { user } = useAuth()
  const { setActiveDMChannel, setViewMode, setUserProfileId, presences } = useAppStore()
  const { openDM } = useDMChannels()
  const [tab, setTab] = useState<Tab>('all')
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [friendUsers, setFriendUsers] = useState<Record<string, User>>({})

  // Add Friend state
  const [addQuery, setAddQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [addLoading, setAddLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeToFriendships(user.uid, async fs => {
      setFriendships(fs)
      const ids = Array.from(new Set(fs.map(f => getFriendUserId(f, user.uid))))
      const users = await Promise.all(ids.map(id => getUserById(id)))
      const map: Record<string, User> = {}
      users.forEach((u, i) => { if (u) map[ids[i]] = u })
      setFriendUsers(map)
    })
  }, [user])

  const accepted = friendships.filter(f => f.status === 'accepted')
  const online = accepted.filter(f => {
    const friendId = getFriendUserId(f, user?.uid ?? '')
    const p = presences[friendId]
    return p === 'online' || p === 'idle'
  })
  const incoming = friendships.filter(f => f.status === 'pending' && f.receiverId === user?.uid)
  const outgoing = friendships.filter(f => f.status === 'pending' && f.requesterId === user?.uid)
  const blocked = friendships.filter(f => f.status === 'blocked' && f.requesterId === user?.uid)

  // Live search for Add Friend tab
  const doSearch = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) { setSearchResults([]); return }
      setSearching(true)
      try {
        const results = await searchUsers(q, user?.uid)
        setSearchResults(results)
      } finally {
        setSearching(false)
      }
    }, 300),
    [user?.uid]
  )

  const handleSearchChange = (v: string) => {
    setAddQuery(v)
    doSearch(v)
  }

  const handleOpenDM = async (friendId: string) => {
    try {
      const channel = await openDM(friendId)
      setActiveDMChannel(channel.id)
      setViewMode('dm')
    } catch {
      toast.error('Failed to open DM')
    }
  }

  const handleSendRequest = async (targetId: string) => {
    if (!user) return
    setAddLoading(targetId)
    try {
      await sendFriendRequestByUsername(user.uid, friendUsers[targetId]?.username ?? targetId)
      toast.success('Friend request sent!')
    } catch (err: unknown) {
      // Fallback: send by ID
      try {
        const { sendFriendRequest } = await import('@/services/friends.service')
        await sendFriendRequest(user.uid, targetId)
        toast.success('Friend request sent!')
      } catch (err2: unknown) {
        toast.error((err2 as Error).message ?? 'Failed to send request')
      }
    } finally {
      setAddLoading(null)
    }
  }

  const handleSendByUsername = async () => {
    if (!user || !addQuery.trim()) return
    setAddLoading('__query')
    try {
      await sendFriendRequestByUsername(user.uid, addQuery.trim())
      toast.success('Friend request sent!')
      setAddQuery('')
      setSearchResults([])
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to send request')
    } finally {
      setAddLoading(null)
    }
  }

  const handleAccept = async (friendshipId: string) => {
    try {
      await respondToFriendRequest(friendshipId, true)
      toast.success('Friend request accepted!')
    } catch {
      toast.error('Failed to accept request')
    }
  }

  const handleDecline = async (friendshipId: string) => {
    try {
      await respondToFriendRequest(friendshipId, false)
    } catch {
      toast.error('Failed to decline request')
    }
  }

  const handleCancelRequest = async (friendshipId: string) => {
    try {
      await cancelFriendRequest(friendshipId)
      toast.success('Friend request cancelled')
    } catch {
      toast.error('Failed to cancel request')
    }
  }

  const handleRemoveFriend = async (friendshipId: string, name: string) => {
    if (!confirm(`Remove ${name} as a friend?`)) return
    try {
      await unfriend(friendshipId)
      toast.success('Friend removed')
    } catch {
      toast.error('Failed to remove friend')
    }
  }

  const handleBlock = async (targetId: string) => {
    if (!user) return
    if (!confirm('Block this user?')) return
    try {
      await blockUser(user.uid, targetId)
      toast.success('User blocked')
    } catch {
      toast.error('Failed to block user')
    }
  }

  const pendingCount = incoming.length
  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'online', label: 'Online', badge: online.length || undefined },
    { id: 'all', label: 'All Friends', badge: accepted.length || undefined },
    { id: 'pending', label: 'Pending', badge: pendingCount || undefined },
    { id: 'add', label: 'Add Friend' },
  ]

  // Which friends to show
  const displayList = tab === 'online' ? online : accepted

  return (
    <div className="flex flex-col h-full bg-pulse-bg-tertiary">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/20 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 font-semibold text-pulse-text-normal shrink-0">
          <Users size={18} />
          <span>Friends</span>
        </div>
        <div className="w-px h-5 bg-white/10 shrink-0" />
        <div className="flex items-center gap-0.5 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === t.id
                  ? t.id === 'add'
                    ? 'bg-pulse-brand text-white'
                    : 'bg-white/10 text-pulse-text-normal'
                  : 'text-pulse-text-muted hover:bg-white/5 hover:text-pulse-text-normal'
              )}
            >
              {t.label}
              {t.badge ? (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs font-bold',
                  t.id === 'pending' ? 'bg-pulse-text-danger text-white' : 'bg-white/10 text-pulse-text-muted'
                )}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">

        {/* ── Add Friend ── */}
        {tab === 'add' && (
          <div className="p-4 max-w-lg">
            <h3 className="font-bold text-pulse-text-normal text-base mb-1">Add Friend</h3>
            <p className="text-sm text-pulse-text-muted mb-4">
              You can add friends by their PulseChat username.
            </p>

            {/* Search input */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-text-muted" />
                <input
                  value={addQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendByUsername()}
                  placeholder="Enter a username..."
                  className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={handleSendByUsername}
                disabled={!addQuery.trim() || addLoading === '__query'}
                className="px-4 py-2 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
              >
                Send
              </button>
            </div>

            {/* Search results */}
            {searching && (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-pulse-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted mb-2">Results</p>
                {searchResults.map(u => {
                  const alreadyFriend = accepted.some(f =>
                    f.requesterId === u.uid || f.receiverId === u.uid
                  )
                  const hasPending = friendships.some(f =>
                    f.status === 'pending' && (f.requesterId === u.uid || f.receiverId === u.uid)
                  )
                  return (
                    <div
                      key={u.uid}
                      className="flex items-center gap-3 p-3 rounded-xl bg-pulse-bg-secondary hover:bg-pulse-bg-elevated transition-colors"
                    >
                      <button onClick={() => setUserProfileId(u.uid)} className="shrink-0">
                        <Avatar src={u.avatarUrl} name={u.displayName} userId={u.uid} size="md" showStatus />
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => setUserProfileId(u.uid)}
                          className="font-semibold text-pulse-text-normal text-sm hover:underline text-left"
                        >
                          {u.displayName}
                        </button>
                        <p className="text-xs text-pulse-text-muted">@{u.username}</p>
                      </div>
                      {alreadyFriend ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 font-medium shrink-0">
                          <UserCheck size={13} /> Friends
                        </span>
                      ) : hasPending ? (
                        <span className="flex items-center gap-1 text-xs text-pulse-text-muted shrink-0">
                          <Clock size={13} /> Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(u.uid)}
                          disabled={addLoading === u.uid}
                          className="flex items-center gap-1 px-3 py-1.5 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                        >
                          <UserPlus size={12} />
                          {addLoading === u.uid ? '...' : 'Add'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {!searching && addQuery && searchResults.length === 0 && (
              <div className="text-center py-8 text-pulse-text-muted text-sm">
                No users found matching "{addQuery}"
              </div>
            )}
          </div>
        )}

        {/* ── Pending ── */}
        {tab === 'pending' && (
          <div className="p-4 space-y-5">
            {incoming.length === 0 && outgoing.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <UserPlus size={28} className="text-pulse-text-muted opacity-40" />
                </div>
                <p className="text-sm text-pulse-text-muted">No pending requests</p>
              </div>
            )}

            {incoming.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-2">
                  Incoming — {incoming.length}
                </p>
                <div className="space-y-1">
                  {incoming.map(f => {
                    const u = friendUsers[f.requesterId]
                    return (
                      <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-pulse-bg-secondary hover:bg-pulse-bg-elevated transition-colors group">
                        <button onClick={() => setUserProfileId(f.requesterId)} className="shrink-0">
                          <Avatar src={u?.avatarUrl} name={u?.displayName ?? '?'} userId={f.requesterId} size="md" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <button onClick={() => setUserProfileId(f.requesterId)} className="font-semibold text-pulse-text-normal text-sm hover:underline text-left">
                            {u?.displayName ?? 'Unknown'}
                          </button>
                          <p className="text-xs text-pulse-text-muted">Incoming Friend Request</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAccept(f.id)}
                            className="p-2 rounded-full bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                            title="Accept"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleDecline(f.id)}
                            className="p-2 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                            title="Decline"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {outgoing.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-2">
                  Outgoing — {outgoing.length}
                </p>
                <div className="space-y-1">
                  {outgoing.map(f => {
                    const u = friendUsers[f.receiverId]
                    return (
                      <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-pulse-bg-secondary hover:bg-pulse-bg-elevated transition-colors">
                        <button onClick={() => setUserProfileId(f.receiverId)} className="shrink-0">
                          <Avatar src={u?.avatarUrl} name={u?.displayName ?? '?'} userId={f.receiverId} size="md" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <button onClick={() => setUserProfileId(f.receiverId)} className="font-semibold text-pulse-text-normal text-sm hover:underline text-left">
                            {u?.displayName ?? 'Unknown'}
                          </button>
                          <p className="text-xs text-pulse-text-muted">Pending • Waiting for response</p>
                        </div>
                        <button
                          onClick={() => handleCancelRequest(f.id)}
                          className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Cancel Request"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── All / Online friends ── */}
        {(tab === 'all' || tab === 'online') && (
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-3">
              {tab === 'online' ? 'Online' : 'All Friends'} — {displayList.length}
            </p>

            {displayList.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <Users size={28} className="text-pulse-text-muted opacity-40" />
                </div>
                <p className="text-sm text-pulse-text-muted mb-1">
                  {tab === 'online' ? 'No friends online' : 'No friends yet'}
                </p>
                {tab === 'all' && (
                  <button onClick={() => setTab('add')} className="text-xs text-pulse-brand hover:underline">
                    Add a friend
                  </button>
                )}
              </div>
            )}

            <div className="space-y-0.5">
              {displayList.map(f => {
                const friendId = getFriendUserId(f, user?.uid ?? '')
                const u = friendUsers[friendId]
                const presence = presences[friendId] ?? 'offline'
                const isOnline = presence === 'online' || presence === 'idle'

                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pulse-bg-secondary group transition-colors"
                  >
                    <button onClick={() => setUserProfileId(friendId)} className="shrink-0">
                      <Avatar
                        src={u?.avatarUrl}
                        name={u?.displayName ?? '?'}
                        userId={friendId}
                        size="md"
                        showStatus
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => setUserProfileId(friendId)}
                        className="font-semibold text-pulse-text-normal text-sm hover:underline text-left block truncate w-full"
                      >
                        {u?.displayName ?? 'Unknown'}
                      </button>
                      <p className="text-xs text-pulse-text-muted truncate">
                        {u?.customStatus || (isOnline ? 'Online' : 'Offline')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleOpenDM(friendId)}
                        className="p-1.5 rounded-full hover:bg-white/10 text-pulse-text-muted hover:text-pulse-text-normal transition-colors"
                        title="Send Message"
                      >
                        <MessageSquare size={15} />
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(f.id, u?.displayName ?? 'this user')}
                        className="p-1.5 rounded-full hover:bg-red-500/10 text-pulse-text-muted hover:text-red-400 transition-colors"
                        title="Remove Friend"
                      >
                        <UserMinus size={15} />
                      </button>
                      <button
                        onClick={() => handleBlock(friendId)}
                        className="p-1.5 rounded-full hover:bg-red-500/10 text-pulse-text-muted hover:text-red-400 transition-colors"
                        title="Block"
                      >
                        <Ban size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Blocked section at bottom of All */}
            {tab === 'all' && blocked.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-2">
                  Blocked — {blocked.length}
                </p>
                <div className="space-y-0.5">
                  {blocked.map(f => {
                    const blockedId = f.receiverId
                    const u = friendUsers[blockedId]
                    return (
                      <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-pulse-bg-secondary group">
                        <Avatar src={u?.avatarUrl} name={u?.displayName ?? '?'} userId={blockedId} size="md" className="opacity-60" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-pulse-text-muted text-sm">{u?.displayName ?? 'Unknown'}</p>
                        </div>
                        <button
                          onClick={() => { if (f.id) unblockUser(f.id).catch(() => {}) }}
                          className="opacity-0 group-hover:opacity-100 text-xs text-pulse-text-muted hover:text-pulse-text-normal px-2 py-1 rounded bg-white/5 transition-all"
                        >
                          Unblock
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
