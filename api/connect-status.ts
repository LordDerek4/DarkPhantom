import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, verifyIdToken } from './_lib/firebase-admin.js'
import { stripe } from './_lib/stripe.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { serverId } = req.body as { serverId?: string }
  if (!serverId) return res.status(400).json({ error: 'serverId is required' })

  try {
    const { uid } = await verifyIdToken(token)
    const db = getDb()

    const serverSnap = await db.collection('servers').doc(serverId).get()
    if (!serverSnap.exists) return res.status(404).json({ error: 'Server not found' })
    if (serverSnap.data()?.ownerId !== uid) {
      return res.status(403).json({ error: 'Only the server owner can view this' })
    }

    const settingsRef = db.collection('communitySettings').doc(serverId)
    const settingsSnap = await settingsRef.get()
    const accountId = settingsSnap.data()?.stripeAccountId as string | undefined

    if (!accountId) return res.json({ connected: false, onboardingComplete: false })

    const account = await stripe.accounts.retrieve(accountId)
    const onboardingComplete = !!account.charges_enabled && !!account.payouts_enabled

    await settingsRef.set({ stripeOnboardingComplete: onboardingComplete }, { merge: true })

    return res.json({
      connected: true,
      onboardingComplete,
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
    })
  } catch (err: any) {
    console.error('connect-status error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
