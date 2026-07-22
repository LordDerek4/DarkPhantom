import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, verifyIdToken } from './_lib/firebase-admin.js'
import { stripe } from './_lib/stripe.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { uid } = await verifyIdToken(token)
    const db = getDb()

    const userSnap = await db.collection('users').doc(uid).get()
    const customerId = userSnap.data()?.stripeCustomerId as string | undefined
    if (!customerId) return res.status(400).json({ error: 'No Stripe customer found' })

    const origin = (req.headers.origin as string) || 'https://www.aevixchat.com'

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/`,
    })

    return res.json({ url: session.url })
  } catch (err: any) {
    console.error('customer-portal error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
