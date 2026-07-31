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
    const { uid, email } = await verifyIdToken(token)
    const db = getDb()

    const serverSnap = await db.collection('servers').doc(serverId).get()
    if (!serverSnap.exists) return res.status(404).json({ error: 'Server not found' })
    if (serverSnap.data()?.ownerId !== uid) {
      return res.status(403).json({ error: 'Only the server owner can set up monetization' })
    }

    const settingsRef = db.collection('communitySettings').doc(serverId)
    const settingsSnap = await settingsRef.get()
    let accountId = settingsSnap.data()?.stripeAccountId as string | undefined

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { firebaseUid: uid, serverId },
      })
      accountId = account.id
      await settingsRef.set({ stripeAccountId: accountId, stripeOnboardingComplete: false }, { merge: true })
    }

    const origin = (req.headers.origin as string) || 'https://www.aevixchat.com'

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/?monetization_refresh=${serverId}`,
      return_url: `${origin}/?monetization_return=${serverId}`,
      type: 'account_onboarding',
    })

    return res.json({ url: accountLink.url })
  } catch (err: any) {
    console.error('connect-onboard error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
