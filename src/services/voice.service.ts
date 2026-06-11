import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore'
import { storage, db } from './firebase'
import type { VoiceMessage } from '@/types/extended'

const VOICE_COLLECTION = 'voiceMessages'

export async function uploadVoiceMessage(
  blob: Blob,
  channelId: string,
  serverId: string | null,
  dmChannelId: string | null,
  authorId: string,
  duration: number,
  waveform: number[]
): Promise<VoiceMessage> {
  const filename = `voice_${Date.now()}.webm`
  const path = serverId
    ? `voice/${serverId}/${channelId}/${filename}`
    : `voice/dm/${dmChannelId}/${filename}`

  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob, { contentType: 'audio/webm' })
  const audioUrl = await getDownloadURL(storageRef)

  const doc = await addDoc(collection(db, VOICE_COLLECTION), {
    channelId,
    serverId,
    dmChannelId,
    authorId,
    audioUrl,
    duration,
    waveform,
    transcript: null,
    transcriptStatus: 'pending',
    createdAt: serverTimestamp(),
    playCount: 0,
  })

  return {
    id: doc.id,
    channelId,
    serverId,
    dmChannelId,
    authorId,
    audioUrl,
    duration,
    waveform,
    transcript: null,
    transcriptStatus: 'pending',
    createdAt: Timestamp.now(),
    playCount: 0,
  }
}

export async function getChannelVoiceMessages(channelId: string): Promise<VoiceMessage[]> {
  const q = query(
    collection(db, VOICE_COLLECTION),
    where('channelId', '==', channelId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as VoiceMessage))
}

export function generateWaveform(audioBuffer: AudioBuffer, bars = 50): number[] {
  const channelData = audioBuffer.getChannelData(0)
  const blockSize = Math.floor(channelData.length / bars)
  const waveform: number[] = []

  for (let i = 0; i < bars; i++) {
    let sum = 0
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[i * blockSize + j])
    }
    waveform.push(sum / blockSize)
  }

  const max = Math.max(...waveform) || 1
  return waveform.map(v => v / max)
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
