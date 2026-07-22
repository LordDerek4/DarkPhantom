import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, verifyIdToken } from './_lib/firebase-admin.js'
import { stripe } from './_lib/stripe.js'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDb()
    res.json({ ok: true, db: !!db, stripe: !!stripe, verifyFn: typeof verifyIdToken })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
