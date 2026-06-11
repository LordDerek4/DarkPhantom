import {
  collection, addDoc, updateDoc, doc, query,
  where, orderBy, getDocs, onSnapshot, serverTimestamp,
  arrayUnion, increment,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Poll, PollOption } from '@/types/extended'

const POLLS = 'polls'

export async function createPoll(data: Omit<Poll, 'id' | 'createdAt' | 'totalVotes' | 'voterIds'>): Promise<Poll> {
  const ref = await addDoc(collection(db, POLLS), {
    ...data,
    totalVotes: 0,
    voterIds: [],
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...data, totalVotes: 0, voterIds: [], createdAt: serverTimestamp() as never }
}

export async function votePoll(pollId: string, optionId: string, userId: string): Promise<void> {
  const pollRef = doc(db, POLLS, pollId)
  // Firestore doesn't support nested array updates cleanly, so we fetch + update
  const snap = await getDocs(query(collection(db, POLLS), where('__name__', '==', pollId)))
  if (snap.empty) return

  const poll = snap.docs[0].data() as Poll
  const option = poll.options.find(o => o.id === optionId)
  if (!option || poll.voterIds.includes(userId)) return

  const updatedOptions = poll.options.map(o =>
    o.id === optionId
      ? { ...o, votes: o.votes + 1, voterIds: [...o.voterIds, userId] }
      : o
  )

  await updateDoc(pollRef, {
    options: updatedOptions,
    voterIds: arrayUnion(userId),
    totalVotes: increment(1),
  })
}

export async function closePoll(pollId: string): Promise<void> {
  await updateDoc(doc(db, POLLS, pollId), { isActive: false })
}

export function subscribeToChannelPolls(channelId: string, cb: (polls: Poll[]) => void) {
  const q = query(
    collection(db, POLLS),
    where('channelId', '==', channelId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll)))
  })
}

export function generatePollOptions(texts: string[]): PollOption[] {
  return texts.map((text, i) => ({
    id: `opt_${i}_${Date.now()}`,
    text,
    votes: 0,
    voterIds: [],
  }))
}
