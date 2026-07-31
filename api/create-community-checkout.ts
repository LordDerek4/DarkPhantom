import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, verifyIdToken } from './_lib/firebase-admin.js'
import { stripe } from './_lib/stripe.js'

// Platform cut on paid community joins. Stripe splits this off automatically
// via application_fee_amount before the creator's payout — change this one
// number to adjust the take rate for all future payments.
const PLATFORM_FEE_PERCENT = 10

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
    const server = serverSnap.data()!

    const memberSnap = await db.collection('serverMembers').doc(`${serverId}_${uid}`).get()
    if (memberSnap.exists) return res.status(400).json({ error: 'You are already a member of this community' })

    const settingsSnap = await db.collection('communitySettings').doc(serverId).get()
    const settings = settingsSnap.data() ?? {}

    if (!settings.isPaid) return res.status(400).json({ error: 'This community is not paid' })
    const accountId = settings.stripeAccountId as string | undefined
    if (!accountId || !settings.stripeOnboardingComplete) {
      return res.status(400).json({ error: 'This community has not finished setting up payments' })
    }

    const amount = settings.priceAmount as number | undefined
    const currency = (settings.priceCurrency as string) || 'usd'
    if (!amount || amount < 50) return res.status(400).json({ error: 'Invalid price' })

    const applicationFeeAmount = Math.round(amount * (PLATFORM_FEE_PERCENT / 100))
    const origin = (req.headers.origin as string) || 'https://www.aevixchat.com'

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: `Join ${server.name}`,
            description: `One-time access fee for ${server.name}`,
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: accountId },
      },
      success_url: `${origin}/community-payment/success?session_id={CHECKOUT_SESSION_ID}&server_id=${serverId}`,
      cancel_url: `${origin}/community-payment/cancel`,
      metadata: { firebaseUid: uid, serverId, type: 'community_join' },
    })

    return res.json({ url: session.url })
  } catch (err: any) {
    console.error('create-community-checkout error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
