import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Minimize2, Maximize2, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { useWebRTCCall } from '@/hooks/useWebRTCCall'
import { useUsers } from '@/hooks/useUserCache'
import { subscribeToCall, leaveCall } from '@/services/call.service'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/helpers'
import type { CallDoc } from '@/services/call.service'

function VideoTile({ stream, name, avatarUrl, userId, muted = false }: {
  stream: MediaStream | null
  name: string
  avatarUrl?: string
  userId: string
  muted?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasVideo = stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live')

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="relative flex-1 min-w-0 min-h-0 bg-pulse-bg-primary rounded-xl overflow-hidden flex items-center justify-center">
      {hasVideo && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Avatar src={avatarUrl} name={name} userId={userId} size="xl" />
          <span className="text-sm font-medium text-white">{name}</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 rounded-lg px-2 py-1 text-xs text-white font-medium">
        {name}
      </div>
    </div>
  )
}

export function CallOverlay() {
  const { user } = useAuth()
  const { activeCallId, setActiveCallId, activeCallType } = useAppStore()
  const [callDoc, setCallDoc] = useState<CallDoc | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [duration, setDuration] = useState(0)
  const startTime = useRef<number | null>(null)

  const participants = callDoc?.participants ?? []
  const otherParticipants = participants.filter(id => id !== user?.uid)
  const userMap = useUsers(otherParticipants)

  const { localStream, remoteStreams, isMuted, isVideoOff, startLocalStream, toggleMute, toggleVideo, cleanup } =
    useWebRTCCall({
      callId: activeCallId,
      localUserId: user?.uid ?? null,
      participants,
      callType: activeCallType ?? 'voice',
    })

  // Subscribe to call doc
  useEffect(() => {
    if (!activeCallId) return
    return subscribeToCall(activeCallId, doc => {
      setCallDoc(doc)
      if (doc?.status === 'ended') handleEnd()
    })
  }, [activeCallId])

  // Get local stream on mount
  useEffect(() => {
    if (!activeCallId) return
    startLocalStream().catch(() => {})
    startTime.current = Date.now()
    const timer = setInterval(() => {
      setDuration(Math.floor((Date.now() - (startTime.current ?? Date.now())) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [activeCallId])

  const handleEnd = async () => {
    cleanup()
    if (activeCallId && user?.uid) {
      await leaveCall(activeCallId, user.uid).catch(() => {})
    }
    setActiveCallId(null)
  }

  if (!activeCallId) return null

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const allParticipantIds = [user?.uid ?? '', ...otherParticipants].filter(Boolean)
  const tileCount = allParticipantIds.length

  return (
    <AnimatePresence>
      {minimized ? (
        <motion.div
          key="mini"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-20 right-4 z-50 bg-pulse-bg-secondary border border-white/10 rounded-2xl shadow-2xl p-3 flex items-center gap-3 cursor-pointer"
          onClick={() => setMinimized(false)}
        >
          <div className="flex -space-x-2">
            {allParticipantIds.slice(0, 3).map(id => {
              const u = userMap[id] ?? (id === user?.uid ? user : null)
              return <Avatar key={id} src={u?.avatarUrl} name={u?.displayName ?? '?'} userId={id} size="sm" />
            })}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              {activeCallType === 'video' ? '📹' : '📞'} In call
            </p>
            <p className="text-xs text-pulse-text-muted">{formatDuration(duration)}</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); handleEnd() }}
            className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
          >
            <PhoneOff size={12} className="text-white" />
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 bg-pulse-bg-floating/95 backdrop-blur-xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-pulse-text-muted" />
              <span className="text-sm text-pulse-text-muted">{tileCount} participant{tileCount !== 1 ? 's' : ''}</span>
              <span className="w-px h-4 bg-white/10 mx-1" />
              <span className="text-sm text-pulse-text-muted font-mono">{formatDuration(duration)}</span>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="p-2 rounded-lg hover:bg-white/10 text-pulse-text-muted hover:text-white transition-colors"
            >
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Video grid */}
          <div className={cn(
            'flex-1 min-h-0 p-4 gap-3',
            tileCount === 1 ? 'flex items-center justify-center' :
            tileCount === 2 ? 'flex flex-col md:flex-row' :
            tileCount <= 4 ? 'grid grid-cols-2' :
            'grid grid-cols-3'
          )}>
            {/* Local tile */}
            <VideoTile
              stream={localStream}
              name={user?.displayName ?? 'You'}
              avatarUrl={user?.avatarUrl ?? undefined}
              userId={user?.uid ?? ''}
              muted
            />
            {/* Remote tiles */}
            {otherParticipants.map(id => {
              const u = userMap[id]
              return (
                <VideoTile
                  key={id}
                  stream={remoteStreams[id] ?? null}
                  name={u?.displayName ?? 'User'}
                  avatarUrl={u?.avatarUrl ?? undefined}
                  userId={id}
                />
              )
            })}
          </div>

          {/* Controls */}
          <div className="shrink-0 flex items-center justify-center gap-4 py-6">
            <ControlBtn
              onClick={toggleMute}
              active={isMuted}
              icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              label={isMuted ? 'Unmute' : 'Mute'}
            />
            {activeCallType === 'video' && (
              <ControlBtn
                onClick={toggleVideo}
                active={isVideoOff}
                icon={isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                label={isVideoOff ? 'Start video' : 'Stop video'}
              />
            )}
            <button
              onClick={handleEnd}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg shadow-red-500/30">
                <PhoneOff size={22} className="text-white" />
              </div>
              <span className="text-xs text-pulse-text-muted">End</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ControlBtn({ onClick, active, icon, label }: {
  onClick: () => void
  active?: boolean
  icon: React.ReactNode
  label: string
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
        active ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20 text-white'
      )}>
        {icon}
      </div>
      <span className="text-xs text-pulse-text-muted">{label}</span>
    </button>
  )
}
