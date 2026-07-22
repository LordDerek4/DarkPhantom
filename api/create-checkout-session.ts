import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, verifyIdToken } from './_lib/firebase-admin.js'
import { stripe } from './_lib/stripe.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { uid, email } = await verifyIdToken(token)
    const db = getDb()

    const userSnap = await db.collection('users').doc(uid).get()
    const userData = userSnap.data() ?? {}
    let customerId = userData.stripeCustomerId as string | undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { firebaseUid: uid },
      })
      customerId = customer.id
      await db.collection('users').doc(uid).update({ stripeCustomerId: customerId })
    }

    const origin = (req.headers.origin as string) || 'https://www.aevixchat.com'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription/cancel`,
      metadata: { firebaseUid: uid },
      subscription_data: { metadata: { firebaseUid: uid } },
    })

    return res.json({ url: session.url })
  } catch (err: any) {
    console.error('create-checkout-session error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
