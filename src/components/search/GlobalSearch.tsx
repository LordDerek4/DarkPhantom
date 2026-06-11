import React, { useState, useCallback, useEffect } from 'react'
import { Search, X, Hash, User, Server } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { searchUsers } from '@/services/user.service'
import { searchMessages } from '@/services/message.service'
import { useAppStore } from '@/store/useAppStore'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { debounce } from '@/utils/helpers'
import type { User as UserType, Message, SearchResult } from '@/types'

export function GlobalSearch() {
  const { isSearchOpen, setSearchOpen, activeServerId, setActiveChannel } = useAppStore()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSearchOpen) { setQuery(''); setResults([]) }
  }, [isSearchOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(!isSearchOpen)
      }
      if (e.key === 'Escape' && isSearchOpen) setSearchOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isSearchOpen])

  const doSearch = useCallback(
    debounce(async (q: string) => {
      if (!q.trim() || !user) { setResults([]); return }
      setLoading(true)
      try {
        const [users, messages] = await Promise.all([
          searchUsers(q, user.uid),
          activeServerId ? searchMessages(activeServerId, q) : Promise.resolve([] as Message[]),
        ])

        const userResults: SearchResult[] = users.map(u => ({
          type: 'user' as const,
          id: u.uid,
          title: u.displayName,
          subtitle: `@${u.username}`,
          iconUrl: u.avatarUrl,
        }))

        const messageResults: SearchResult[] = messages.map(m => ({
          type: 'message' as const,
          id: m.id,
          title: m.content.slice(0, 80),
          subtitle: `in #channel`,
          iconUrl: null,
          meta: { channelId: m.channelId },
        }))

        setResults([...userResults, ...messageResults].slice(0, 12))
      } finally {
        setLoading(false)
      }
    }, 300),
    [user, activeServerId]
  )

  const handleQuery = (q: string) => {
    setQuery(q)
    doSearch(q)
  }

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'message' && result.meta?.channelId) {
      setActiveChannel(result.meta.channelId as string)
    }
    setSearchOpen(false)
  }

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={() => setSearchOpen(false)}
          />

          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg bg-pulse-bg-secondary rounded-xl shadow-elevation-high overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <Search size={18} className="text-pulse-text-muted shrink-0" />
              <input
                value={query}
                onChange={e => handleQuery(e.target.value)}
                placeholder="Search messages, people, servers..."
                className="flex-1 bg-transparent text-pulse-text-normal placeholder:text-pulse-text-muted outline-none text-sm"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setResults([]) }}
                  className="text-pulse-text-muted hover:text-pulse-text-normal"
                >
                  <X size={16} />
                </button>
              )}
              <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs text-pulse-text-muted">Esc</kbd>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {loading && (
                <div className="py-4 text-center text-pulse-text-muted text-sm">Searching...</div>
              )}

              {!loading && results.length > 0 && (
                <div className="py-2">
                  {results.map(result => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left"
                    >
                      <ResultIcon result={result} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-pulse-text-normal truncate">{result.title}</p>
                        <p className="text-xs text-pulse-text-muted">{result.subtitle}</p>
                      </div>
                      <span className="text-xs text-pulse-text-muted capitalize">{result.type}</span>
                    </button>
                  ))}
                </div>
              )}

              {!loading && query && results.length === 0 && (
                <div className="py-8 text-center text-pulse-text-muted">
                  <Search size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No results for "{query}"</p>
                </div>
              )}

              {!query && (
                <div className="py-6 text-center text-pulse-text-muted">
                  <p className="text-sm">Start typing to search</p>
                  <p className="text-xs mt-1">Search across messages, people, and more</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function ResultIcon({ result }: { result: SearchResult }) {
  if (result.type === 'user') {
    return <Avatar src={result.iconUrl} name={result.title} size="sm" />
  }
  if (result.type === 'channel') {
    return <div className="w-8 h-8 rounded-full bg-pulse-bg-elevated flex items-center justify-center"><Hash size={16} className="text-pulse-text-muted" /></div>
  }
  return <div className="w-8 h-8 rounded-full bg-pulse-bg-elevated flex items-center justify-center"><Search size={16} className="text-pulse-text-muted" /></div>
}
