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

    const grantCommunityMembership = async (session: Stripe.Checkout.Session) => {
      const uid = session.metadata?.firebaseUid
      const serverId = session.metadata?.serverId
      if (!uid || !serverId) return

      const memberRef = db.collection('serverMembers').doc(`${serverId}_${uid}`)
      const memberSnap = await memberRef.get()
      if (memberSnap.exists) return // already granted — webhook retry, no-op

      const rolesSnap = await db.collection('roles')
        .where('serverId', '==', serverId).where('isDefault', '==', true).limit(1).get()
      const everyoneRoleId = rolesSnap.docs[0]?.id ?? `${serverId}_everyone`

      const batch = db.batch()
      batch.set(memberRef, {
        userId: uid, serverId, roles: [everyoneRoleId], nickname: null,
        joinedAt: FieldValue.serverTimestamp(), mutedUntil: null,
        isBanned: false, isMuted: false, isDeafened: false,
      })
      batch.set(db.collection('userServers').doc(`${uid}_${serverId}`), {
        userId: uid, serverId, joinedAt: FieldValue.serverTimestamp(),
      })
      batch.set(db.collection('communityPayments').doc(session.id), {
        serverId, userId: uid,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string ?? null,
        createdAt: FieldValue.serverTimestamp(),
      })
      batch.update(db.collection('servers').doc(serverId), { memberCount: FieldValue.increment(1) })
      // Unlike the client-side joinServer(), the Admin SDK bypasses Firestore
      // rules entirely, so there's no need to split the memberCount update
      // into a separate step the way the client code has to.
      await batch.commit()
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        if (s.metadata?.type === 'community_join') {
          await grantCommunityMembership(s)
        } else if (s.metadata?.firebaseUid && s.subscription) {
          await setUserPremium(s.metadata.firebaseUid, s.subscription as string, true)
        }
        break
      }
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const settingsSnap = await db.collection('communitySettings')
          .where('stripeAccountId', '==', account.id).limit(1).get()
        if (!settingsSnap.empty) {
          const onboardingComplete = !!account.charges_enabled && !!account.payouts_enabled
          await settingsSnap.docs[0].ref.update({ stripeOnboardingComplete: onboardingComplete })
        }
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
