import React, { useState } from 'react'
import { Mic, Square, X, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/helpers'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { uploadVoiceMessage, formatDuration } from '@/services/voice.service'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface VoiceRecorderProps {
  channelId: string
  serverId: string | null
  dmChannelId: string | null
  onSent: () => void
  onCancel: () => void
}

export function VoiceRecorder({ channelId, serverId, dmChannelId, onSent, onCancel }: VoiceRecorderProps) {
  const { user } = useAuth()
  const { isRecording, duration, waveform, startRecording, stopRecording, cancelRecording } = useVoiceRecorder()
  const [sending, setSending] = useState(false)

  const handleStart = async () => {
    await startRecording()
  }

  const handleSend = async () => {
    if (!user) return
    setSending(true)
    try {
      const { blob, duration: dur, waveform: wf } = await stopRecording()
      await uploadVoiceMessage(blob, channelId, serverId, dmChannelId, user.uid, dur, wf)
      toast.success('Voice message sent')
      onSent()
    } catch {
      toast.error('Failed to send voice message')
    } finally {
      setSending(false)
    }
  }

  const handleCancel = () => {
    cancelRecording()
    onCancel()
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-pulse-bg-modifier rounded-lg">
      <button onClick={handleCancel} className="text-pulse-text-muted hover:text-red-400 transition-colors">
        <X size={18} />
      </button>

      {/* Waveform */}
      <div className="flex items-center gap-0.5 flex-1 h-8">
        {waveform.map((v, i) => (
          <motion.div
            key={i}
            className={cn('w-1 rounded-full', isRecording ? 'bg-red-400' : 'bg-pulse-brand')}
            style={{ height: `${Math.max(4, v * 32)}px` }}
            animate={{ height: `${Math.max(4, v * 32)}px` }}
            transition={{ duration: 0.05 }}
          />
        ))}
        {waveform.length === 0 && (
          <div className="flex items-center gap-0.5 flex-1">
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-pulse-text-muted/30" />
            ))}
          </div>
        )}
      </div>

      {/* Duration */}
      <span className={cn('text-sm font-mono tabular-nums shrink-0', isRecording ? 'text-red-400' : 'text-pulse-text-muted')}>
        {formatDuration(duration)}
      </span>

      {/* Controls */}
      {!isRecording ? (
        <button
          onClick={handleStart}
          className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          <Mic size={16} />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleSend}
            disabled={sending}
            className="p-2 rounded-full bg-pulse-brand text-white hover:bg-pulse-brand-hover transition-colors disabled:opacity-50"
          >
            <Send size={16} />
          </button>
          <button
            onClick={() => { cancelRecording(); onCancel() }}
            className="p-2 rounded-full bg-pulse-bg-secondary text-pulse-text-muted hover:text-white"
          >
            <Square size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
