import type { VercelRequest, VercelResponse } from '@vercel/node'
import { auth, db } from './_lib/firebase-admin'
import { stripe } from './_lib/stripe'
import { FieldValue } from 'firebase-admin/firestore'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { sessionId } = req.body as { sessionId?: string }
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' })

  try {
    const decoded = await auth.verifyIdToken(token)
    const uid = decoded.uid

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(400).json({ error: 'Payment not completed' })
    }

    const sub = session.subscription as import('stripe').Stripe.Subscription | null

    await db.collection('users').doc(uid).update({
      isPremium: true,
      premiumSince: FieldValue.serverTimestamp(),
      stripeSubscriptionId: sub?.id ?? null,
      stripeCustomerId: session.customer as string,
    })

    return res.json({ isPremium: true, subscriptionId: sub?.id })
  } catch (err) {
    console.error('verify-session error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
