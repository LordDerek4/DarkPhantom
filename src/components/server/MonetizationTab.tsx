import React, { useEffect, useState } from 'react'
import { DollarSign, ExternalLink, RefreshCw, CheckCircle2, Circle } from 'lucide-react'
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { cn } from '@/utils/helpers'
import {
  startConnectOnboarding,
  checkConnectStatus,
  setCommunityPricing,
} from '@/services/monetization.service'
import toast from 'react-hot-toast'

const PLATFORM_FEE_PERCENT = 10

interface CommunitySettings {
  isPaid?: boolean
  priceAmount?: number
  priceCurrency?: string
  stripeAccountId?: string
  stripeOnboardingComplete?: boolean
}

export function MonetizationTab({ serverId }: { serverId: string }) {
  const [settings, setSettings] = useState<CommunitySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [priceDraft, setPriceDraft] = useState('')
  const [isPaidDraft, setIsPaidDraft] = useState(false)
  const [savingPrice, setSavingPrice] = useState(false)
  const [paymentCount, setPaymentCount] = useState<number | null>(null)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'communitySettings', serverId), snap => {
      const data = (snap.exists() ? snap.data() : {}) as CommunitySettings
      setSettings(data)
      setIsPaidDraft(!!data.isPaid)
      setPriceDraft(data.priceAmount ? (data.priceAmount / 100).toFixed(2) : '')
      setLoading(false)
    })
    return () => unsub()
  }, [serverId])

  useEffect(() => {
    getDocs(query(collection(db, 'communityPayments'), where('serverId', '==', serverId)))
      .then(snap => setPaymentCount(snap.docs.length))
      .catch(() => setPaymentCount(null))
  }, [serverId])

  const onboardingComplete = !!settings?.stripeOnboardingComplete
  const hasAccount = !!settings?.stripeAccountId

  const handleConnect = async () => {
    setConnecting(true)
    try {
      await startConnectOnboarding(serverId)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to start Stripe onboarding')
      setConnecting(false)
    }
  }

  const handleCheckStatus = async () => {
    setChecking(true)
    try {
      const status = await checkConnectStatus(serverId)
      if (status.onboardingComplete) toast.success('Stripe account is ready!')
      else toast('Stripe setup is not finished yet', { icon: '⏳' })
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to check status')
    } finally {
      setChecking(false)
    }
  }

  const handleSavePricing = async () => {
    const dollars = parseFloat(priceDraft)
    if (isPaidDraft && (isNaN(dollars) || dollars < 0.5)) {
      toast.error('Minimum price is $0.50')
      return
    }
    setSavingPrice(true)
    try {
      await setCommunityPricing(serverId, {
        isPaid: isPaidDraft,
        priceAmount: isPaidDraft ? Math.round(dollars * 100) : undefined,
        priceCurrency: 'usd',
      })
      toast.success('Pricing updated')
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save pricing')
    } finally {
      setSavingPrice(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-pulse-brand border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h2 className="text-lg font-bold text-white">Monetization</h2>
        <p className="text-sm text-pulse-text-muted mt-0.5">Charge people to join this community.</p>
      </div>

      {/* Stripe connection status */}
      <div className="bg-pulse-bg-primary rounded-xl border border-white/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          {onboardingComplete ? (
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
          ) : (
            <Circle size={16} className="text-pulse-text-muted shrink-0" />
          )}
          <p className="text-sm font-medium text-pulse-text-normal">
            {onboardingComplete ? 'Stripe account connected' : hasAccount ? 'Stripe setup incomplete' : 'No payout account connected'}
          </p>
        </div>

        {!onboardingComplete && (
          <>
            <p className="text-xs text-pulse-text-muted">
              You need a connected Stripe account before you can charge for access. Payouts go directly to your bank account — AevixChat never holds your funds.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {connecting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ExternalLink size={14} />}
                {hasAccount ? 'Finish Setup on Stripe' : 'Connect Stripe'}
              </button>
              {hasAccount && (
                <button
                  onClick={handleCheckStatus}
                  disabled={checking}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-pulse-text-muted text-sm font-medium rounded-lg transition-colors"
                >
                  <RefreshCw size={14} className={checking ? 'animate-spin' : ''} /> Check Status
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Pricing */}
      {onboardingComplete && (
        <div className="bg-pulse-bg-primary rounded-xl border border-white/5 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-pulse-text-normal">Paid Community</p>
            <button
              onClick={() => setIsPaidDraft(v => !v)}
              className={cn('w-10 h-5 rounded-full transition-colors relative', isPaidDraft ? 'bg-pulse-brand' : 'bg-white/10')}
            >
              <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow', isPaidDraft ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>

          {isPaidDraft && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-pulse-text-muted mb-1.5">
                Price (one-time, to join)
              </label>
              <div className="relative">
                <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-text-muted pointer-events-none" />
                <input
                  value={priceDraft}
                  onChange={e => setPriceDraft(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="5.00"
                  className="w-full bg-pulse-bg-elevated border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[11px] text-pulse-text-muted mt-1.5">
                AevixChat takes {PLATFORM_FEE_PERCENT}% per join — you keep the rest, paid out directly by Stripe.
              </p>
            </div>
          )}

          <button
            onClick={handleSavePricing}
            disabled={savingPrice}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {savingPrice ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Pricing'}
          </button>

          {paymentCount !== null && (
            <p className="text-xs text-pulse-text-muted text-center">
              {paymentCount} paid join{paymentCount === 1 ? '' : 's'} so far
            </p>
          )}
        </div>
      )}
    </div>
  )
}
