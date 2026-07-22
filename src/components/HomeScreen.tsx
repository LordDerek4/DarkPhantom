import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Plus, Compass, Users, Zap, ArrowRight, Hash } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { useUser } from '@/hooks/useUserCache'
import { Avatar } from '@/components/ui/Avatar'
import { AppLogo } from '@/components/ui/AppLogo'
import { getTrendingServers } from '@/services/discover.service'
import type { ServerListing } from '@/types/extended'

export function HomeScreen() {
  const { user } = useAuth()
  const { servers, setViewMode, openCreateCommunity, dmChannels } = useAppStore()
  const serverList = Object.values(servers)
  const [trending, setTrending] = useState<ServerListing[]>([])

  useEffect(() => {
    getTrendingServers(4).then(setTrending).catch(() => {})
  }, [])

  const recentDMs = dmChannels.slice(0, 3)

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-10">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 mb-10"
        >
          <AppLogo size={64} showText={false} />
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user?.displayName?.split(' ')[0] ?? 'there'}!
            </h1>
            <p className="text-pulse-text-muted text-sm mt-0.5">
              Pick up where you left off or discover something new.
            </p>
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          <QuickAction
            icon={<MessageSquare size={22} />}
            title="Direct Messages"
            description="Chat with friends"
            color="from-pulse-brand to-red-600"
            onClick={() => setViewMode('dm')}
          />
          <QuickAction
            icon={<Plus size={22} />}
            title="Create Community"
            description="Start something new"
            color="from-green-500 to-emerald-600"
            onClick={openCreateCommunity}
          />
          <QuickAction
            icon={<Compass size={22} />}
            title="Discover"
            description="Find communities"
            color="from-orange-500 to-amber-600"
            onClick={() => setViewMode('discover')}
          />
        </motion.div>

        {/* Your servers */}
        {serverList.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <SectionHeader title="Your Communities" count={serverList.length} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {serverList.slice(0, 6).map((server, i) => (
                <motion.button
                  key={server.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.12 + i * 0.03 }}
                  onClick={() => {
                    useAppStore.getState().setActiveServer(server.id)
                    setViewMode('server')
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-pulse-bg-secondary hover:bg-pulse-bg-elevated border border-white/5 hover:border-white/10 transition-all text-left group"
                >
                  {server.iconUrl ? (
                    <img src={server.iconUrl} alt={server.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-pulse-brand/20 flex items-center justify-center shrink-0">
                      <span className="text-pulse-brand font-bold text-sm">
                        {server.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-pulse-text-normal truncate">{server.name}</p>
                    <p className="text-xs text-pulse-text-muted flex items-center gap-1 mt-0.5">
                      <Users size={10} />{server.memberCount} member{server.memberCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-pulse-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </motion.button>
              ))}
            </div>
            {serverList.length > 6 && (
              <button
                onClick={() => setViewMode('server')}
                className="mt-2 text-xs text-pulse-brand hover:underline"
              >
                View all {serverList.length} communities →
              </button>
            )}
          </motion.section>
        )}

        {/* Recent DMs */}
        {recentDMs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <SectionHeader title="Recent Conversations" />
            <div className="space-y-1">
              {recentDMs.map(channel => {
                const otherId = channel.participantIds.find(id => id !== user?.uid) ?? ''
                return (
                  <RecentDMItem
                    key={channel.id}
                    channelId={channel.id}
                    otherId={otherId}
                    lastMessage={channel.lastMessageContent ?? ''}
                    onOpen={() => {
                      useAppStore.getState().setActiveDMChannel(channel.id)
                    }}
                  />
                )
              })}
            </div>
          </motion.section>
        )}

        {/* Trending communities */}
        {trending.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <SectionHeader title="Trending Communities" />
              <button
                onClick={() => setViewMode('discover')}
                className="text-xs text-pulse-brand hover:underline flex items-center gap-1"
              >
                See all <ArrowRight size={11} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {trending.map((server, i) => (
                <motion.div
                  key={server.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + i * 0.04 }}
                  className="bg-pulse-bg-secondary rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                  onClick={() => setViewMode('discover')}
                >
                  <div className="h-14 relative">
                    {server.bannerUrl
                      ? <img src={server.bannerUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-pulse-brand/30 to-red-600/20" />
                    }
                  </div>
                  <div className="p-3 -mt-4 relative flex items-end gap-2">
                    {server.iconUrl
                      ? <img src={server.iconUrl} alt="" className="w-9 h-9 rounded-xl border-2 border-pulse-bg-secondary object-cover shrink-0" />
                      : <div className="w-9 h-9 rounded-xl bg-pulse-brand border-2 border-pulse-bg-secondary flex items-center justify-center text-white font-bold text-xs shrink-0">{server.name[0]}</div>
                    }
                    <div className="min-w-0 flex-1 pb-0.5">
                      <p className="text-sm font-semibold text-pulse-text-normal truncate">{server.name}</p>
                      <p className="text-[11px] text-pulse-text-muted flex items-center gap-1">
                        <Users size={9} />{server.memberCount.toLocaleString()} members
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Empty state when no servers */}
        {serverList.length === 0 && trending.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-pulse-brand/10 border border-pulse-brand/20 flex items-center justify-center mx-auto mb-4">
              <Zap size={28} className="text-pulse-brand" />
            </div>
            <h3 className="text-lg font-semibold text-pulse-text-normal mb-2">You're all set up!</h3>
            <p className="text-pulse-text-muted text-sm mb-5 max-w-xs mx-auto">
              Create your first community or find one to join in the Discover section.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={openCreateCommunity}
                className="px-5 py-2.5 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm"
              >
                <Plus size={16} /> Create Community
              </button>
              <button
                onClick={() => setViewMode('discover')}
                className="px-5 py-2.5 bg-pulse-bg-secondary hover:bg-pulse-bg-elevated border border-white/10 text-pulse-text-normal font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm"
              >
                <Compass size={16} /> Discover
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <p className="text-xs font-bold uppercase tracking-wider text-pulse-text-muted">{title}</p>
      {count !== undefined && (
        <span className="text-[10px] font-semibold text-pulse-text-muted bg-white/5 px-1.5 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  )
}

function QuickAction({ icon, title, description, color, onClick }: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-5 rounded-xl bg-pulse-bg-secondary hover:bg-pulse-bg-elevated border border-white/5 hover:border-white/10 transition-all group text-center"
    >
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-pulse-text-normal">{title}</p>
        <p className="text-xs text-pulse-text-muted mt-0.5">{description}</p>
      </div>
    </button>
  )
}

function RecentDMItem({ channelId, otherId, lastMessage, onOpen }: {
  channelId: string
  otherId: string
  lastMessage: string
  onOpen: () => void
}) {
  const u = useUser(otherId)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pulse-bg-secondary transition-colors group text-left"
    >
      <Avatar src={u?.avatarUrl ?? null} name={u?.displayName ?? '?'} userId={otherId} size="sm" showStatus />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-pulse-text-normal truncate">{u?.displayName ?? 'Unknown'}</p>
        {lastMessage && (
          <p className="text-xs text-pulse-text-muted truncate">{lastMessage}</p>
        )}
      </div>
      <Hash size={13} className="text-pulse-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}
