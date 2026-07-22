import { useCallback, useEffect, useRef, useState } from 'react'

const RecognitionCtor: typeof SpeechRecognition | undefined =
  typeof window !== 'undefined' ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : undefined

interface UseSpeechToTextOptions {
  onFinalResult: (transcript: string) => void
  onError?: (error: string) => void
}

export function useSpeechToText({ onFinalResult, onError }: UseSpeechToTextOptions) {
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onFinalResultRef = useRef(onFinalResult)
  const onErrorRef = useRef(onError)
  onFinalResultRef.current = onFinalResult
  onErrorRef.current = onError

  const isSupported = !!RecognitionCtor

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const startListening = useCallback(() => {
    if (!RecognitionCtor || recognitionRef.current) return

    const recognition = new RecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          onFinalResultRef.current(result[0].transcript)
        } else {
          interim += result[0].transcript
        }
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event) => {
      onErrorRef.current?.(event.error)
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  return { isSupported, isListening, interimTranscript, startListening, stopListening }
}
