import React, { useState, useEffect } from 'react'
import { Search, Compass, Users, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getFeaturedServers, getTrendingServers } from '@/services/discover.service'
import { joinServer } from '@/services/server.service'
import type { ServerListing } from '@/types/extended'
import toast from 'react-hot-toast'

export function BrowseCommunitiesPanel({ onJoined }: { onJoined: (serverId: string) => void }) {
  const { user } = useAuth()
  const [servers, setServers] = useState<ServerListing[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [joiningId, setJoiningId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getFeaturedServers(6), getTrendingServers(12)])
      .then(([feat, trend]) => {
        const seen = new Set<string>()
        const merged: ServerListing[] = []
        for (const s of [...feat, ...trend]) {
          if (!seen.has(s.id)) { seen.add(s.id); merged.push(s) }
        }
        setServers(merged)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = query.trim()
    ? servers.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.description?.toLowerCase().includes(query.toLowerCase()))
    : servers

  const handleJoin = async (server: ServerListing) => {
    if (!user || !server.inviteCode) {
      toast.error('No invite link available for this community')
      return
    }
    setJoiningId(server.id)
    try {
      const joined = await joinServer(user.uid, server.inviteCode)
      toast.success(`Joined ${joined.name}!`)
      onJoined(joined.id)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to join community')
    } finally {
      setJoiningId(null)
    }
  }

  return (
    <div className="px-6 pb-6 pt-4">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-pulse-text-normal">Browse Communities</h2>
        <p className="text-pulse-text-muted text-sm mt-0.5">Find and join public communities</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-text-muted" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search communities..."
          className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-pulse-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Compass size={32} className="text-pulse-text-muted mx-auto mb-3" />
          <p className="text-pulse-text-muted text-sm">No communities found{query ? ` for "${query}"` : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
          {filtered.map(server => {
            const isJoining = joiningId === server.id
            return (
              <div
                key={server.id}
                className="bg-pulse-bg-primary rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all group"
              >
                {/* Banner */}
                <div className="h-16 relative">
                  {server.bannerUrl
                    ? <img src={server.bannerUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-pulse-brand/25 to-red-600/15" />
                  }
                </div>

                {/* Body */}
                <div className="p-3">
                  <div className="flex items-end gap-2 -mt-7 mb-2">
                    {server.iconUrl
                      ? <img src={server.iconUrl} alt="" className="w-10 h-10 rounded-xl border-2 border-pulse-bg-primary object-cover shrink-0" />
                      : (
                        <div className="w-10 h-10 rounded-xl bg-pulse-brand border-2 border-pulse-bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {server.name[0]}
                        </div>
                      )
                    }
                  </div>

                  <p className="text-sm font-semibold text-pulse-text-normal truncate">{server.name}</p>

                  {server.description && (
                    <p className="text-[11px] text-pulse-text-muted line-clamp-2 mt-0.5 mb-2 leading-relaxed">
                      {server.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-pulse-text-muted flex items-center gap-1">
                      <Users size={10} />{server.memberCount.toLocaleString()} members
                    </span>
                    <button
                      onClick={() => handleJoin(server)}
                      disabled={isJoining}
                      className="flex items-center gap-1 px-3 py-1.5 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {isJoining ? (
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Join <ArrowRight size={10} /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
