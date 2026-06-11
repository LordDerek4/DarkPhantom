import React, { useState } from 'react'
import { Plus, X, Trash } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createPoll, generatePollOptions } from '@/services/polls.service'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import type { PollType } from '@/types/extended'

interface Props { channelId: string; serverId: string; open: boolean; onClose: () => void }

export function CreatePollModal({ channelId, serverId, open, onClose }: Props) {
  const { user } = useAuth()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [type, setType] = useState<PollType>('single')
  const [duration, setDuration] = useState('')
  const [showResults, setShowResults] = useState(true)
  const [loading, setLoading] = useState(false)

  const addOption = () => setOptions(o => [...o, ''])
  const removeOption = (i: number) => setOptions(o => o.filter((_, j) => j !== i))
  const setOption = (i: number, val: string) => setOptions(o => o.map((v, j) => j === i ? val : v))

  const submit = async () => {
    if (!user || !question.trim() || options.filter(o => o.trim()).length < 2) {
      toast.error('Add a question and at least 2 options')
      return
    }
    setLoading(true)
    try {
      const validOptions = options.filter(o => o.trim())
      const endsAt = duration ? Timestamp.fromDate(new Date(Date.now() + parseInt(duration) * 3600000)) : null

      await createPoll({
        channelId, serverId, messageId: null,
        question: question.trim(),
        options: generatePollOptions(validOptions),
        type, createdBy: user.uid,
        endsAt, isActive: true,
        allowRevote: false,
        showResultsBeforeEnd: showResults,
      })
      toast.success('Poll created!')
      setQuestion(''); setOptions(['', '']); setDuration('')
      onClose()
    } catch {
      toast.error('Failed to create poll')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Poll">
      <div className="space-y-4">
        <Input
          label="Question"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="What would you like to ask?"
        />

        <div className="space-y-2">
          <label className="block text-xs font-medium text-pulse-text-muted">Options</label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={e => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1"
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(i)} className="text-pulse-text-muted hover:text-red-400">
                  <Trash size={14} />
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button onClick={addOption} className="flex items-center gap-1.5 text-xs text-pulse-brand hover:text-pulse-brand-hover">
              <Plus size={12} />Add option
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-pulse-text-muted mb-1">Poll Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as PollType)}
              className="w-full bg-pulse-bg-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-pulse-text-normal outline-none focus:border-pulse-brand/50"
            >
              <option value="single">Single choice</option>
              <option value="multiple">Multiple choice</option>
              <option value="anonymous">Anonymous</option>
            </select>
          </div>
          <Input label="Duration (hours, optional)" type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="∞" />
        </div>

        <label className="flex items-center gap-2 text-sm text-pulse-text-muted cursor-pointer">
          <input type="checkbox" checked={showResults} onChange={e => setShowResults(e.target.checked)} className="rounded" />
          Show results before poll ends
        </label>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={submit} loading={loading} className="flex-1">Create Poll</Button>
        </div>
      </div>
    </Modal>
  )
}
