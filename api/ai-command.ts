import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, verifyIdToken } from './_lib/firebase-admin.js'
import { callClaude, buildCommandPrompt } from './_lib/ai.js'

const MAX_CONTEXT_MESSAGES = 20

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { command, input, channelId, serverId } = req.body as {
    command?: string; input?: string; channelId?: string; serverId?: string
  }
  if (!command || !channelId || !serverId) {
    return res.status(400).json({ error: 'command, channelId and serverId are required' })
  }

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
      .limit(MAX_CONTEXT_MESSAGES)
      .get()
    const context = msgSnap.docs.map(d => `[${d.data().authorId}]: ${d.data().content}`).reverse()

    const { systemPrompt, userMessage } = buildCommandPrompt(command, input ?? '', context)
    const { text, tokens } = await callClaude(systemPrompt, userMessage)

    await db.collection('aiInteractions').add({
      serverId,
      channelId,
      userId: uid,
      command,
      input: input ?? '',
      output: text,
      context,
      createdAt: new Date(),
      helpful: null,
      tokens,
    })

    return res.json({ text })
  } catch (err: any) {
    console.error('ai-command error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
