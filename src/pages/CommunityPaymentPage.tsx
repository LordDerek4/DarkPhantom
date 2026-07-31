import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ArrowRight, PartyPopper } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { AppLogo } from '@/components/ui/AppLogo'

const POLL_ATTEMPTS = 10
const POLL_INTERVAL_MS = 2000

export function CommunityPaymentSuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setActiveServer, setViewMode } = useAppStore()
  const [status, setStatus] = useState<'waiting' | 'ready' | 'timeout'>('waiting')

  const serverId = params.get('server_id')

  useEffect(() => {
    if (!serverId || !user) return
    let cancelled = false

    const poll = async () => {
      for (let i = 0; i < POLL_ATTEMPTS; i++) {
        if (cancelled) return
        try {
          const snap = await getDoc(doc(db, 'serverMembers', `${serverId}_${user.uid}`))
          if (snap.exists()) { setStatus('ready'); return }
        } catch {
          // Reading a not-yet-existing member doc can throw permission-denied
          // (same quirk worked around in joinServer()) — treat as "not yet".
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
      }
      if (!cancelled) setStatus('timeout')
    }

    poll()
    return () => { cancelled = true }
  }, [serverId, user])

  const goToServer = () => {
    if (serverId) setActiveServer(serverId)
    setViewMode('server')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-pulse-bg-tertiary flex flex-col items-center justify-center px-6">
      <div className="mb-8">
        <AppLogo size={36} />
      </div>

      {status === 'waiting' && (
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 border-2 border-pulse-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-pulse-text-muted text-sm">Payment received — setting up your access...</p>
        </div>
      )}

      {status === 'ready' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pulse-brand to-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <PartyPopper size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">You're in!</h1>
          <p className="text-pulse-text-muted mb-8">
            Your payment went through and you've been added to the community.
          </p>
          <button
            onClick={goToServer}
            className="flex items-center gap-2 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-bold px-6 py-3 rounded-xl transition-all mx-auto"
          >
            <Check size={16} />
            Go to Community
            <ArrowRight size={16} />
          </button>
        </motion.div>
      )}

      {status === 'timeout' && (
        <div className="text-center max-w-sm">
          <p className="text-white font-bold text-xl mb-2">Almost there</p>
          <p className="text-pulse-text-muted text-sm mb-6">
            Your payment succeeded, but adding you to the community is taking longer than usual.
            Try refreshing in a moment — if it still hasn't shown up, contact support with your payment confirmation.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-pulse-brand text-white font-semibold rounded-xl mr-2"
          >
            Refresh
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-white/5 text-pulse-text-normal font-semibold rounded-xl"
          >
            Back to App
          </button>
        </div>
      )}
    </div>
  )
}

export function CommunityPaymentCancelPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-pulse-bg-tertiary flex flex-col items-center justify-center px-6 text-center">
      <AppLogo size={36} className="mb-8" />
      <h1 className="text-2xl font-black text-white mb-2">Payment cancelled</h1>
      <p className="text-pulse-text-muted mb-6">No charge was made. You can try again any time.</p>
      <button
        onClick={() => navigate('/')}
        className="px-5 py-2.5 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-semibold rounded-xl transition-colors"
      >
        Back to App
      </button>
    </div>
  )
}
