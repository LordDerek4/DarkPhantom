import { auth } from './firebase'
import type { AICommandType } from '@/types/extended'

async function getIdToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.getIdToken()
}

export async function runAICommand(
  command: AICommandType,
  input: string,
  channelId: string,
  serverId: string
): Promise<string> {
  const token = await getIdToken()
  const res = await fetch('/api/ai-command', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, input, channelId, serverId }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'AI request failed')
  const { text } = await res.json()
  return text
}

export async function getSmartReplies(channelId: string, serverId: string): Promise<string[]> {
  const token = await getIdToken()
  const res = await fetch('/api/ai-smart-replies', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId, serverId }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'AI request failed')
  const { replies } = await res.json()
  return replies
}
