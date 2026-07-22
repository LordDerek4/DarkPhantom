import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_lib/firebase-admin.js'
import { stripe } from './_lib/stripe.js'
import { FieldValue } from 'firebase-admin/firestore'
import type Stripe from 'stripe'

export const config = { api: { bodyParser: false } }

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return res.status(400).send('Webhook Error: ' + err.message)
  }

  try {
    const db = getDb()

    const setUserPremium = async (uid: string, subscriptionId: string, active: boolean) => {
      const update: Record<string, unknown> = { isPremium: active }
      if (active) { update.premiumSince = FieldValue.serverTimestamp(); update.stripeSubscriptionId = subscriptionId }
      else { update.stripeSubscriptionId = null }
      await db.collection('users').doc(uid).update(update)
    }

    const uidFromCustomer = async (customerId: string) => {
      const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get()
      return snap.empty ? null : snap.docs[0].id
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        if (s.metadata?.firebaseUid && s.subscription)
          await setUserPremium(s.metadata.firebaseUid, s.subscription as string, true)
        break
      }
      case 'customer.subscription.deleted': {
        const s = event.data.object as Stripe.Subscription
        const uid = await uidFromCustomer(s.customer as string)
        if (uid) await setUserPremium(uid, s.id, false)
        break
      }
      case 'customer.subscription.updated': {
        const s = event.data.object as Stripe.Subscription
        const uid = await uidFromCustomer(s.customer as string)
        if (uid) await setUserPremium(uid, s.id, s.status === 'active' || s.status === 'trialing')
        break
      }
    }
    return res.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
}
