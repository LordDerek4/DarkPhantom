import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { formatDuration } from '@/services/voice.service'
import type { VoiceMessage } from '@/types/extended'

export function VoiceMessagePlayer({ msg }: { msg: VoiceMessage }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.currentTime / (audio.duration || 1))
    }
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnded) }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audio.currentTime = ratio * audio.duration
  }

  const barProgress = Math.min(1, progress)

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-pulse-bg-secondary max-w-xs">
      <audio ref={audioRef} src={msg.audioUrl} preload="metadata" />

      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-pulse-brand flex items-center justify-center shrink-0 hover:bg-pulse-brand-hover transition-colors"
      >
        {playing ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Waveform bars */}
        <div
          className="flex items-center gap-px h-7 cursor-pointer"
          onClick={seek}
        >
          {msg.waveform.map((v, i) => {
            const isPlayed = i / msg.waveform.length <= barProgress
            return (
              <div
                key={i}
                className={cn('w-1 rounded-full transition-colors', isPlayed ? 'bg-pulse-brand' : 'bg-white/20')}
                style={{ height: `${Math.max(3, v * 28)}px` }}
              />
            )
          })}
        </div>

        <div className="flex justify-between text-xs text-pulse-text-muted">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(msg.duration)}</span>
        </div>
      </div>

      {msg.transcript && (
        <div className="text-xs text-pulse-text-muted max-w-[120px] truncate" title={msg.transcript}>
          "{msg.transcript}"
        </div>
      )}
    </div>
  )
}
