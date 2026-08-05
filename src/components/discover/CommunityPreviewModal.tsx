import React, { useEffect, useState } from 'react'
import { X, Users, Lock, ShieldCheck, Loader, ArrowRight } from 'lucide-react'
import { cn, formatPrice } from '@/utils/helpers'
import { getCachedCommunityRules, getCommunityRules } from '@/services/discover.service'
import { useAppStore } from '@/store/useAppStore'
import type { ServerListing } from '@/types/extended'

interface CommunityPreviewModalProps {
  server: ServerListing | null
  onClose: () => void
  onJoin: (server: ServerListing) => void
  joining: boolean
}

export function CommunityPreviewModal({ server, onClose, onJoin, joining }: CommunityPreviewModalProps) {
  // Discover/Browse list communities regardless of whether the current
  // account already belongs to them (a member browsing, or an owner viewing
  // their own public listing) — `servers` is the live set of servers the
  // signed-in user is actually a member of, kept in sync by useServer.ts.
  const myServers = useAppStore(s => s.servers)
  const setActiveServer = useAppStore(s => s.setActiveServer)
  const setViewMode = useAppStore(s => s.setViewMode)
  const isMember = !!server && server.id in myServers

  const handleOpen = () => {
    if (!server) return
    setActiveServer(server.id)
    setViewMode('server')
    onClose()
  }
  // Discover/Browse prefetch rules for every visible card as soon as they
  // load, so this is almost always already cached by the time someone
  // clicks — read it synchronously on first render instead of always
  // starting from a loading state.
  const [rules, setRules] = useState<string[]>(() => (server ? getCachedCommunityRules(server.id) ?? [] : []))
  const [loadingRules, setLoadingRules] = useState(() => !!server && getCachedCommunityRules(server.id) === undefined)

  useEffect(() => {
    if (!server) { setRules([]); setLoadingRules(false); return }

    const cached = getCachedCommunityRules(server.id)
    if (cached !== undefined) {
      setRules(cached)
      setLoadingRules(false)
      return
    }

    setLoadingRules(true)
    getCommunityRules(server.id)
      .then(setRules)
      .finally(() => setLoadingRules(false))
  }, [server?.id])

  if (!server) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-pulse-bg-secondary rounded-2xl overflow-hidden max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="h-56 relative shrink-0 z-0">
          {server.bannerUrl ? (
            <img src={server.bannerUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pulse-brand/30 to-red-500/30" />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative z-10 p-5 pt-0 -mt-8 overflow-y-auto scrollbar-thin">
          <div className="flex items-end gap-3 mb-3">
            {server.iconUrl ? (
              <img src={server.iconUrl} alt="" className="w-16 h-16 rounded-2xl border-4 border-pulse-bg-secondary object-cover shrink-0 bg-pulse-bg-secondary" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-pulse-brand border-4 border-pulse-bg-secondary flex items-center justify-center text-white font-bold text-xl shrink-0">
                {server.name[0]}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-pulse-text-normal">{server.name}</h2>
            {server.isVerified && <span className="text-blue-400 text-sm">✓</span>}
          </div>

          <div className="flex items-center gap-3 text-xs text-pulse-text-muted mb-4">
            <span className="flex items-center gap-1"><Users size={11} />{server.memberCount.toLocaleString()} members</span>
            <span className="px-2 py-0.5 rounded-full bg-pulse-bg-primary">{server.category}</span>
          </div>

          {server.description && (
            <p className="text-sm text-pulse-text-normal/90 leading-relaxed mb-4">{server.description}</p>
          )}

          {(loadingRules || rules.length > 0) && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-2 flex items-center gap-1.5">
                <ShieldCheck size={12} /> Community Rules
              </p>
              {loadingRules ? (
                <Loader size={14} className="animate-spin text-pulse-text-muted" />
              ) : (
                <ol className="space-y-1.5 list-decimal list-inside">
                  {rules.map((r, i) => (
                    <li key={i} className="text-xs text-pulse-text-muted leading-relaxed">{r}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {isMember ? (
            <button
              onClick={handleOpen}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors bg-pulse-brand hover:bg-pulse-brand-hover text-white"
            >
              Open Server <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => onJoin(server)}
              disabled={joining}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50',
                server.isPaid ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-pulse-brand hover:bg-pulse-brand-hover text-white'
              )}
            >
              {joining ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : server.isPaid && server.priceAmount != null ? (
                <><Lock size={14} />Join for {formatPrice(server.priceAmount, server.priceCurrency)}</>
              ) : (
                'Join Community'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
