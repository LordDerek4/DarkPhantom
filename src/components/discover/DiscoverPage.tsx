import React, { useEffect, useState, useCallback } from 'react'
import { Search, Compass, TrendingUp, Star, Users, ArrowRight, Loader } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/helpers'
import { getFeaturedServers, getTrendingServers, searchServers, SERVER_CATEGORIES } from '@/services/discover.service'
import { joinServer } from '@/services/server.service'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import type { ServerListing } from '@/types/extended'
import toast from 'react-hot-toast'

function ServerCard({ server, onJoin, joining }: { server: ServerListing; onJoin: (server: ServerListing) => void; joining: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group bg-pulse-bg-secondary rounded-xl overflow-hidden hover:ring-1 hover:ring-pulse-brand/30 transition-all cursor-pointer relative',
        joining && 'opacity-60 pointer-events-none'
      )}
      onClick={() => onJoin(server)}
    >
      {joining && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
          <Loader size={20} className="animate-spin text-white" />
        </div>
      )}
      {server.bannerUrl ? (
        <div className="h-20 relative">
          <img src={server.bannerUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
        </div>
      ) : (
        <div className="h-20 bg-gradient-to-br from-pulse-brand/30 to-red-500/30" />
      )}

      <div className="p-3 pt-0 -mt-5 relative">
        <div className="flex items-end gap-3 mb-2">
          {server.iconUrl ? (
            <img src={server.iconUrl} alt="" className="w-10 h-10 rounded-xl border-2 border-pulse-bg-secondary" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-pulse-brand flex items-center justify-center text-white font-bold text-sm border-2 border-pulse-bg-secondary">
              {server.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0 pb-0.5">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-pulse-text-normal text-sm truncate">{server.name}</p>
              {server.isVerified && <span className="text-blue-400 text-xs">✓</span>}
            </div>
          </div>
        </div>

        <p className="text-xs text-pulse-text-muted line-clamp-2 mb-3">{server.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-pulse-text-muted">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span>{server.onlineCount.toLocaleString()}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Users size={10} />
              <span>{server.memberCount.toLocaleString()}</span>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-pulse-bg-primary text-pulse-text-muted">
            {server.category}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export function DiscoverPage() {
  const { user } = useAuth()
  const { setActiveServer, setViewMode } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [servers, setServers] = useState<ServerListing[]>([])
  const [featured, setFeatured] = useState<ServerListing[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  // Public communities join directly on click — no invite code shown or
  // needed, since Discover only ever lists public listings in the first
  // place. Routing this through the code-entry modal would visibly expose
  // the raw invite code in a text field for no reason.
  const handleJoin = async (server: ServerListing) => {
    if (!user || !server.inviteCode || joiningId) return
    setJoiningId(server.id)
    try {
      const joined = await joinServer(user.uid, server.inviteCode)
      setActiveServer(joined.id)
      setViewMode('server')
      toast.success(`Joined "${joined.name}"!`)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to join community')
    } finally {
      setJoiningId(null)
    }
  }

  useEffect(() => {
    Promise.all([getFeaturedServers(), getTrendingServers()])
      .then(([feat, trend]) => {
        setFeatured(feat)
        setServers(trend)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = useCallback(async (q: string, cat: string | null) => {
    setSearching(true)
    try {
      const results = await searchServers(q, cat ?? undefined)
      setServers(results)
    } catch {
      setServers([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleQueryChange = (q: string) => {
    setSearchQuery(q)
    if (q.length > 1 || activeCategory) handleSearch(q, activeCategory)
    else getTrendingServers().then(setServers)
  }

  const handleCategory = (cat: string | null) => {
    setActiveCategory(cat)
    handleSearch(searchQuery, cat)
  }

  return (
    <div className="flex flex-col h-full bg-pulse-bg-tertiary">
      {/* Hero */}
      <div className="bg-gradient-to-b from-pulse-brand/20 to-transparent px-8 py-8 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Compass size={24} className="text-pulse-brand" />
          <div>
            <h1 className="text-xl font-bold text-pulse-text-normal">Discover Communities</h1>
            <p className="text-sm text-pulse-text-muted">Find your next favourite community</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-text-muted" />
          <input
            value={searchQuery}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search communities..."
            className="w-full bg-pulse-bg-secondary/80 backdrop-blur-sm border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted outline-none focus:border-pulse-brand/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-8 pb-8">
        {/* Categories */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-thin pb-1">
          <button
            onClick={() => handleCategory(null)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0',
              !activeCategory ? 'bg-pulse-brand text-white' : 'bg-pulse-bg-secondary text-pulse-text-muted hover:text-pulse-text-normal'
            )}
          >
            All
          </button>
          {SERVER_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategory(cat.id)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                activeCategory === cat.id ? 'bg-pulse-brand text-white' : 'bg-pulse-bg-secondary text-pulse-text-muted hover:text-pulse-text-normal'
              )}
            >
              <span>{cat.emoji}</span>{cat.label}
            </button>
          ))}
        </div>

        {/* Featured */}
        {!searchQuery && !activeCategory && featured.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-yellow-400" />
              <span className="text-sm font-semibold text-pulse-text-normal">Featured</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {featured.slice(0, 4).map(s => <ServerCard key={s.id} server={s} onJoin={handleJoin} joining={joiningId === s.id} />)}
            </div>
          </div>
        )}

        {/* Results */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-pulse-brand" />
            <span className="text-sm font-semibold text-pulse-text-normal">
              {searchQuery || activeCategory ? `Results (${servers.length})` : 'Trending'}
            </span>
          </div>

          {loading || searching ? (
            <div className="flex items-center justify-center h-32">
              <Loader size={20} className="animate-spin text-pulse-brand" />
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-12 text-pulse-text-muted">
              <Compass size={32} className="mx-auto mb-2 opacity-30" />
              <p>No servers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {servers.map(s => <ServerCard key={s.id} server={s} onJoin={handleJoin} joining={joiningId === s.id} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
