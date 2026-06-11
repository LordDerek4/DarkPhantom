import { useState, useRef, useCallback } from 'react'
import { generateWaveform } from '@/services/voice.service'

export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  waveform: number[]
  blob: Blob | null
  error: string | null
}

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false, isPaused: false, duration: 0,
    waveform: [], blob: null, error: null,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const startTimeRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animFrameRef = useRef<number>()
  const liveWaveformRef = useRef<number[]>(Array(50).fill(0))

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      const analyser = audioContextRef.current.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start(100)

      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setState(s => ({ ...s, duration: (Date.now() - startTimeRef.current) / 1000 }))
      }, 100)

      const animateWaveform = () => {
        if (!analyserRef.current) return
        const data = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(data)
        const avg = Array.from(data).reduce((a, b) => a + b, 0) / data.length / 255
        liveWaveformRef.current = [...liveWaveformRef.current.slice(1), avg]
        setState(s => ({ ...s, waveform: [...liveWaveformRef.current] }))
        animFrameRef.current = requestAnimationFrame(animateWaveform)
      }
      animateWaveform()

      setState(s => ({ ...s, isRecording: true, error: null, blob: null, duration: 0 }))
    } catch (err) {
      setState(s => ({ ...s, error: 'Microphone access denied' }))
    }
  }, [])

  const stopRecording = useCallback((): Promise<{ blob: Blob; duration: number; waveform: number[] }> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current
      if (!recorder) return

      recorder.onstop = async () => {
        clearInterval(timerRef.current)
        cancelAnimationFrame(animFrameRef.current!)

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const duration = (Date.now() - startTimeRef.current) / 1000

        let waveform = liveWaveformRef.current
        try {
          const arrayBuffer = await blob.arrayBuffer()
          const audioCtx = new AudioContext()
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
          waveform = generateWaveform(audioBuffer)
        } catch {}

        recorder.stream.getTracks().forEach(t => t.stop())
        audioContextRef.current?.close()

        setState(s => ({ ...s, isRecording: false, blob, waveform, duration }))
        resolve({ blob, duration, waveform })
      }

      recorder.stop()
    })
  }, [])

  const cancelRecording = useCallback(() => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current!)
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    audioContextRef.current?.close()
    setState({ isRecording: false, isPaused: false, duration: 0, waveform: [], blob: null, error: null })
  }, [])

  return { ...state, startRecording, stopRecording, cancelRecording }
}
