import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, verifyIdToken } from './_lib/firebase-admin.js'
import { callClaude, SMART_REPLY_SYSTEM_PROMPT } from './_lib/ai.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { channelId, serverId } = req.body as { channelId?: string; serverId?: string }
  if (!channelId || !serverId) return res.status(400).json({ error: 'channelId and serverId are required' })

  try {
    const { uid } = await verifyIdToken(token)
    const db = getDb()

    const userSnap = await db.collection('users').doc(uid).get()
    if (!userSnap.data()?.isPremium) return res.status(403).json({ error: 'Premium required' })

    const memberSnap = await db.collection('serverMembers').doc(`${serverId}_${uid}`).get()
    if (!memberSnap.exists) return res.status(403).json({ error: 'Not a member of this server' })

    const msgSnap = await db.collection('messages')
      .where('channelId', '==', channelId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()
    const context = msgSnap.docs.map(d => `[${d.data().authorId}]: ${d.data().content}`).reverse()
    if (context.length === 0) return res.json({ replies: [] })

    const { text } = await callClaude(SMART_REPLY_SYSTEM_PROMPT, `Recent messages:\n${context.join('\n')}`)

    let replies: string[]
    try {
      const parsed = JSON.parse(text.trim())
      replies = Array.isArray(parsed) ? parsed.slice(0, 3) : text.split('\n').filter(l => l.trim()).slice(0, 3)
    } catch {
      replies = text.split('\n').filter(l => l.trim()).slice(0, 3)
    }

    return res.json({ replies })
  } catch (err: any) {
    console.error('ai-smart-replies error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
