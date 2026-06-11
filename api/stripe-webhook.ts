import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from './_lib/firebase-admin'
import { stripe } from './_lib/stripe'
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

async function setUserPremium(uid: string, subscriptionId: string, active: boolean) {
  const update: Record<string, unknown> = { isPremium: active }
  if (active) {
    update.premiumSince = FieldValue.serverTimestamp()
    update.stripeSubscriptionId = subscriptionId
  } else {
    update.stripeSubscriptionId = null
  }
  await db.collection('users').doc(uid).update(update)
}

async function uidFromCustomer(customerId: string): Promise<string | null> {
  const snap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()
  if (snap.empty) return null
  return snap.docs[0].id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  let event: Stripe.Event

  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return res.status(400).send('Webhook Error')
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const uid = session.metadata?.firebaseUid
        if (uid && session.subscription) {
          await setUserPremium(uid, session.subscription as string, true)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const uid = await uidFromCustomer(sub.customer as string)
        if (uid) await setUserPremium(uid, sub.id, false)
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const uid = await uidFromCustomer(sub.customer as string)
        if (uid) {
          const active = sub.status === 'active' || sub.status === 'trialing'
          await setUserPremium(uid, sub.id, active)
        }
        break
      }
    }
    return res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
}
