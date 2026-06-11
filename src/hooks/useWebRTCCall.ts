import { useRef, useCallback, useEffect, useState } from 'react'
import { ICE_SERVERS, sendSignal, subscribeToSignals } from '@/services/call.service'
import type { SignalDoc } from '@/services/call.service'

export interface UseWebRTCCallOptions {
  callId: string | null
  localUserId: string | null
  participants: string[]
  callType: 'voice' | 'video'
}

export function useWebRTCCall({ callId, localUserId, participants, callType }: UseWebRTCCallOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  const pcs = useRef<Record<string, RTCPeerConnection>>({})
  const localStreamRef = useRef<MediaStream | null>(null)
  const seenSignals = useRef<Set<string>>(new Set())

  const makePc = useCallback((remoteId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    localStreamRef.current?.getTracks().forEach(t => {
      pc.addTrack(t, localStreamRef.current!)
    })

    pc.ontrack = e => {
      if (e.streams[0]) {
        setRemoteStreams(prev => ({ ...prev, [remoteId]: e.streams[0] }))
      }
    }

    pc.onicecandidate = e => {
      if (e.candidate && callId && localUserId) {
        sendSignal(callId, localUserId, remoteId, 'ice-candidate', e.candidate.toJSON())
      }
    }

    pcs.current[remoteId] = pc
    return pc
  }, [callId, localUserId])

  const handleSignal = useCallback(async (sig: SignalDoc) => {
    if (!localUserId || !callId) return
    if (seenSignals.current.has(sig.id)) return
    seenSignals.current.add(sig.id)

    const payload = JSON.parse(sig.payload)

    if (sig.type === 'offer') {
      let pc = pcs.current[sig.from]
      if (!pc) pc = makePc(sig.from)
      if (pc.signalingState !== 'stable') return
      await pc.setRemoteDescription(new RTCSessionDescription(payload))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await sendSignal(callId, localUserId, sig.from, 'answer', answer)
    } else if (sig.type === 'answer') {
      const pc = pcs.current[sig.from]
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload))
      }
    } else if (sig.type === 'ice-candidate') {
      const pc = pcs.current[sig.from]
      if (pc?.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload)) } catch {}
      }
    }
  }, [callId, localUserId, makePc])

  // Subscribe to incoming signals
  useEffect(() => {
    if (!callId || !localUserId) return
    return subscribeToSignals(callId, localUserId, handleSignal)
  }, [callId, localUserId, handleSignal])

  // When participants change, initiate offers to peers we should offer to.
  // Convention: lower userId (alphabetically) sends the offer to avoid glare.
  useEffect(() => {
    if (!callId || !localUserId || !localStreamRef.current) return
    const others = participants.filter(id => id !== localUserId)
    for (const remoteId of others) {
      if (pcs.current[remoteId]) continue
      if (localUserId < remoteId) {
        // We're the "lower" peer — we send the offer
        const pc = makePc(remoteId)
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' })
          .then(offer => pc.setLocalDescription(offer).then(() =>
            sendSignal(callId, localUserId, remoteId, 'offer', offer)
          ))
          .catch(() => {})
      } else {
        // We're the "higher" peer — create the PC so we're ready for their offer
        makePc(remoteId)
      }
    }
  }, [participants, callId, localUserId, callType, makePc])

  // Clean up connections for participants who left
  useEffect(() => {
    const active = new Set(participants)
    Object.keys(pcs.current).forEach(id => {
      if (!active.has(id)) {
        pcs.current[id].close()
        delete pcs.current[id]
        setRemoteStreams(prev => { const n = { ...prev }; delete n[id]; return n })
      }
    })
  }, [participants])

  const startLocalStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }, [callType])

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsMuted(!track.enabled)
  }, [])

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsVideoOff(!track.enabled)
  }, [])

  const cleanup = useCallback(() => {
    Object.values(pcs.current).forEach(pc => pc.close())
    pcs.current = {}
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    seenSignals.current.clear()
    setLocalStream(null)
    setRemoteStreams({})
  }, [])

  return { localStream, remoteStreams, isMuted, isVideoOff, startLocalStream, toggleMute, toggleVideo, cleanup }
}
