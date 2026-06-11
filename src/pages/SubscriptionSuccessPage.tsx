import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown, Check, ArrowRight, Sparkles } from 'lucide-react'
import { verifySession } from '@/services/premium.service'
import { AppLogo } from '@/components/ui/AppLogo'

export function SubscriptionSuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')

  useEffect(() => {
    const sessionId = params.get('session_id')
    if (!sessionId) { setStatus('error'); return }

    verifySession(sessionId)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen bg-pulse-bg-tertiary flex flex-col items-center justify-center px-6">
      <div className="mb-8">
        <AppLogo size={36} />
      </div>

      {status === 'verifying' && (
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-pulse-text-muted text-sm">Activating your Premium...</p>
        </div>
      )}

      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/30">
            <Crown size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Welcome to Premium!</h1>
          <p className="text-pulse-text-muted mb-8">
            Your subscription is active. All premium features are now unlocked on your profile.
          </p>
          <div className="bg-pulse-bg-secondary border border-yellow-500/20 rounded-2xl p-4 mb-8 text-left space-y-2.5">
            {[
              'Animated profile banners & avatars',
              'Personal AI companion',
              'Server boosting',
              'Semantic AI search',
              'Exclusive themes',
              'Growth rewards',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-pulse-text-muted">
                <Check size={13} className="text-yellow-400 shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-6 py-3 rounded-xl transition-all mx-auto"
          >
            <Sparkles size={16} />
            Go to AevixChat
            <ArrowRight size={16} />
          </button>
        </motion.div>
      )}

      {status === 'error' && (
        <div className="text-center max-w-sm">
          <p className="text-white font-bold text-xl mb-2">Something went wrong</p>
          <p className="text-pulse-text-muted text-sm mb-6">
            Your payment may have succeeded — check Settings → Premium to verify your status, or contact support.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-pulse-brand text-white font-semibold rounded-xl"
          >
            Back to App
          </button>
        </div>
      )}
    </div>
  )
}

export function SubscriptionCancelPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-pulse-bg-tertiary flex flex-col items-center justify-center px-6 text-center">
      <AppLogo size={36} className="mb-8" />
      <h1 className="text-2xl font-black text-white mb-2">Subscription cancelled</h1>
      <p className="text-pulse-text-muted mb-6">No charge was made. You can upgrade any time from Settings.</p>
      <button
        onClick={() => navigate('/')}
        className="px-5 py-2.5 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-semibold rounded-xl transition-colors"
      >
        Back to App
      </button>
    </div>
  )
}
