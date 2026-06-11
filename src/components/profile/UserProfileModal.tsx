import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, UserPlus, UserMinus, Ban, Users, Shield, Settings, Calendar, Check, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/helpers'
import { getUserById } from '@/services/auth.service'
import {
  getFriendship, sendFriendRequest, unfriend, blockUser, unblockUser,
  respondToFriendRequest, cancelFriendRequest, getMutualFriends, getFriendUserId,
  subscribeToFriendships, getFriendshipStatus,
} from '@/services/friends.service'
import { subscribeToPresence } from '@/services/presence.service'
import { useDMChannels } from '@/hooks/useDirectMessages'
import type { User, UserStatus } from '@/types'
import type { Friendship } from '@/types/extended'
import toast from 'react-hot-toast'

const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
}

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-pulse-status-online',
  idle: 'bg-pulse-status-idle',
  dnd: 'bg-pulse-status-dnd',
  offline: 'bg-pulse-status-offline',
}

export function UserProfileModal() {
  const { userProfileId, setUserProfileId, setSettingsOpen, setActiveDMChannel, setViewMode, servers } = useAppStore()
  const { user: currentUser } = useAuth()
  const { openDM } = useDMChannels()

  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [friendship, setFriendship] = useState<Friendship | null>(null)
  const [mutualFriendIds, setMutualFriendIds] = useState<string[]>([])
  const [mutualFriends, setMutualFriends] = useState<User[]>([])
  const [acting, setActing] = useState(false)

  const isOwnProfile = userProfileId === currentUser?.uid
  const open = !!userProfileId

  // Reactively subscribe to this user's presence whenever the modal opens
  const presence = useAppStore(s => s.presences[userProfileId ?? ''] ?? 'offline')
  const setPresences = useAppStore(s => s.setPresences)
  useEffect(() => {
    if (!userProfileId) return
    const unsub = subscribeToPresence([userProfileId], p => setPresences(p as Record<string, UserStatus>))
    return () => unsub()
  }, [userProfileId])

  // Load profile
  useEffect(() => {
    if (!userProfileId) { setProfile(null); return }
    setLoading(true)
    getUserById(userProfileId)
      .then(u => setProfile(u))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [userProfileId])

  // Load friendship + mutual friends for other users
  useEffect(() => {
    if (!userProfileId || !currentUser || isOwnProfile) return
    let cancelled = false

    const unsub = subscribeToFriendships(currentUser.uid, async friendships => {
      if (cancelled) return
      const f = friendships.find(fs =>
        (fs.requesterId === userProfileId || fs.receiverId === userProfileId) &&
        (fs.requesterId === currentUser.uid || fs.receiverId === currentUser.uid)
      ) ?? null
      setFriendship(f)
    })

    getMutualFriends(currentUser.uid, userProfileId).then(async ids => {
      if (cancelled) return
      setMutualFriendIds(ids)
      const users = await Promise.all(ids.slice(0, 6).map(id => getUserById(id)))
      if (!cancelled) setMutualFriends(users.filter(Boolean) as User[])
    }).catch(() => {})

    return () => { cancelled = true; unsub() }
  }, [userProfileId, currentUser, isOwnProfile])

  const friendStatus = getFriendshipStatus(friendship, currentUser?.uid ?? '')

  // Mutual servers: servers both users are in
  const myServerIds = new Set(Object.keys(servers))
  // We can't easily query the other user's servers client-side without a server lookup,
  // so we approximate with shared server memberships from the store
  const sharedServers = Object.values(servers).filter(s => myServerIds.has(s.id)).slice(0, 4)

  const handleMessage = async () => {
    if (!currentUser || !userProfileId) return
    try {
      const channel = await openDM(userProfileId)
      setActiveDMChannel(channel.id)
      setViewMode('dm')
      setUserProfileId(null)
    } catch {
      toast.error('Failed to open DM')
    }
  }

  const handleFriendAction = async () => {
    if (!currentUser || !userProfileId || acting) return
    setActing(true)
    try {
      if (friendStatus === 'none') {
        await sendFriendRequest(currentUser.uid, userProfileId)
        toast.success('Friend request sent!')
      } else if (friendStatus === 'friends') {
        if (!friendship) return
        await unfriend(friendship.id)
        toast.success('Removed friend')
      } else if (friendStatus === 'pending_sent') {
        if (!friendship) return
        await cancelFriendRequest(friendship.id)
        toast.success('Friend request cancelled')
      } else if (friendStatus === 'pending_received') {
        if (!friendship) return
        await respondToFriendRequest(friendship.id, true)
        toast.success('Friend request accepted!')
      }
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Action failed')
    } finally {
      setActing(false)
    }
  }

  const handleBlock = async () => {
    if (!currentUser || !userProfileId || acting) return
    if (!confirm('Block this user? They will not be able to send you friend requests.')) return
    setActing(true)
    try {
      if (friendStatus === 'blocked') {
        if (!friendship) return
        await unblockUser(friendship.id)
        toast.success('User unblocked')
      } else {
        await blockUser(currentUser.uid, userProfileId)
        toast.success('User blocked')
      }
      setUserProfileId(null)
    } catch {
      toast.error('Action failed')
    } finally {
      setActing(false)
    }
  }

  const joinDate = profile?.createdAt
    ? new Date((profile.createdAt as unknown as { seconds: number }).seconds * 1000)
    : null

  // presence is now declared above with reactive subscription

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setUserProfileId(null)}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-sm bg-pulse-bg-secondary rounded-2xl overflow-hidden shadow-elevation-high z-10"
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={() => setUserProfileId(null)}
            className="absolute top-3 right-3 z-20 p-1.5 rounded-lg text-pulse-text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          {loading && (
            <div className="h-80 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-pulse-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && profile && (
            <>
              {/* Banner */}
              <div
                className="h-24 w-full relative"
                style={{
                  background: profile.bannerUrl
                    ? undefined
                    : `linear-gradient(135deg, #ef4444, #eb459e)`,
                }}
              >
                {profile.bannerUrl && (
                  <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                )}
              </div>

              {/* Avatar + actions strip */}
              <div className="px-4 pb-0 -mt-8 flex items-end justify-between">
                <div className="relative">
                  <Avatar
                    src={profile.avatarUrl}
                    name={profile.displayName}
                    userId={profile.uid}
                    size="xl"
                    className="ring-4 ring-pulse-bg-secondary"
                  />
                  <span
                    className={cn(
                      'absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-pulse-bg-secondary',
                      STATUS_COLORS[presence] ?? 'bg-gray-500'
                    )}
                  />
                </div>

                {!isOwnProfile && (
                  <div className="flex items-center gap-2 pb-1">
                    <button
                      onClick={handleMessage}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-pulse-brand hover:bg-pulse-brand-hover text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <MessageSquare size={13} /> Message
                    </button>
                    <FriendActionButton status={friendStatus} acting={acting} onClick={handleFriendAction} />
                    <button
                      onClick={handleBlock}
                      title={friendStatus === 'blocked' ? 'Unblock' : 'Block'}
                      className="p-1.5 rounded-lg bg-pulse-bg-elevated hover:bg-red-500/20 text-pulse-text-muted hover:text-red-400 transition-colors"
                    >
                      <Ban size={15} />
                    </button>
                  </div>
                )}

                {isOwnProfile && (
                  <button
                    onClick={() => { setSettingsOpen(true, 'profile'); setUserProfileId(null) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pulse-bg-elevated hover:bg-white/10 text-pulse-text-muted text-xs font-semibold rounded-lg transition-colors mb-1"
                  >
                    <Settings size={13} /> Edit Profile
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="px-4 pt-3 pb-4 space-y-3">
                {/* Name + status */}
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">{profile.displayName}</h2>
                  <p className="text-sm text-pulse-text-muted">@{profile.username}</p>
                  {profile.customStatus && (
                    <p className="text-xs text-pulse-text-muted mt-1 flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_COLORS[presence])} />
                      {profile.customStatus}
                    </p>
                  )}
                  {!profile.customStatus && (
                    <p className="text-xs text-pulse-text-muted mt-1 flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_COLORS[presence])} />
                      {STATUS_LABELS[presence] ?? 'Offline'}
                    </p>
                  )}
                </div>

                <div className="h-px bg-white/10" />

                {/* About Me */}
                {profile.bio && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-pulse-text-muted mb-1">About Me</p>
                    <p className="text-sm text-pulse-text-normal leading-relaxed whitespace-pre-wrap break-words">
                      {profile.bio}
                    </p>
                    <div className="h-px bg-white/10 mt-3" />
                  </div>
                )}

                {/* Member since */}
                {joinDate && (
                  <div className="flex items-center gap-2 text-xs text-pulse-text-muted">
                    <Calendar size={13} className="shrink-0" />
                    <span>Member since {joinDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                )}

                {/* Mutual friends */}
                {!isOwnProfile && mutualFriends.length > 0 && (
                  <div>
                    <div className="h-px bg-white/10 mb-3" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-pulse-text-muted mb-2 flex items-center gap-1.5">
                      <Users size={11} />
                      {mutualFriendIds.length} Mutual Friend{mutualFriendIds.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {mutualFriends.map(u => (
                        <button
                          key={u.uid}
                          onClick={() => setUserProfileId(u.uid)}
                          title={u.displayName}
                          className="group relative"
                        >
                          <Avatar
                            src={u.avatarUrl}
                            name={u.displayName}
                            userId={u.uid}
                            size="sm"
                            showStatus
                            className="ring-2 ring-pulse-bg-secondary group-hover:ring-pulse-brand transition-all"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mutual servers (own profile: your servers) */}
                {sharedServers.length > 0 && (
                  <div>
                    <div className="h-px bg-white/10 mb-3" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-pulse-text-muted mb-2 flex items-center gap-1.5">
                      <Shield size={11} />
                      {isOwnProfile ? 'Your Servers' : 'Shared Servers'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {sharedServers.map(s => (
                        <div key={s.id} title={s.name} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-pulse-bg-primary border border-white/5">
                          {s.iconUrl ? (
                            <img src={s.iconUrl} alt={s.name} className="w-5 h-5 rounded-md object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-md bg-pulse-brand/30 flex items-center justify-center text-[9px] font-bold text-white">
                              {s.name[0]}
                            </div>
                          )}
                          <span className="text-xs text-pulse-text-muted truncate max-w-[80px]">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && !profile && (
            <div className="h-60 flex items-center justify-center text-pulse-text-muted text-sm">
              User not found
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function FriendActionButton({
  status,
  acting,
  onClick,
}: {
  status: ReturnType<typeof getFriendshipStatus>
  acting: boolean
  onClick: () => void
}) {
  if (status === 'blocked') return null

  const variants = {
    none: { label: 'Add Friend', icon: UserPlus, className: 'bg-pulse-bg-elevated hover:bg-green-500/20 text-pulse-text-muted hover:text-green-400' },
    pending_sent: { label: 'Pending', icon: Clock, className: 'bg-pulse-bg-elevated text-pulse-text-muted cursor-default' },
    pending_received: { label: 'Accept', icon: Check, className: 'bg-green-500/20 hover:bg-green-500/30 text-green-400' },
    friends: { label: 'Friends', icon: UserMinus, className: 'bg-pulse-bg-elevated hover:bg-red-500/20 text-pulse-text-muted hover:text-red-400' },
  } as const

  const v = variants[status] ?? variants.none
  const Icon = v.icon

  return (
    <button
      onClick={status !== 'pending_sent' ? onClick : undefined}
      disabled={acting || status === 'pending_sent'}
      className={cn('p-1.5 rounded-lg transition-colors', v.className)}
      title={v.label}
    >
      {acting ? (
        <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Icon size={15} />
      )}
    </button>
  )
}
