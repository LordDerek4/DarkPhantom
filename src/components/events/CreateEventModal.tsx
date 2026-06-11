import React from 'react'
import { useForm } from 'react-hook-form'
import { Timestamp } from 'firebase/firestore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createEvent } from '@/services/events.service'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface Props { serverId: string; open: boolean; onClose: () => void }

interface FormData {
  title: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  maxAttendees: string
}

export function CreateEventModal({ serverId, open, onClose }: Props) {
  const { user } = useAuth()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    if (!user) return
    try {
      const startDate = new Date(`${data.startDate}T${data.startTime}`)
      const endDate = data.endDate ? new Date(`${data.endDate}T${data.endTime}`) : null

      await createEvent({
        serverId,
        channelId: null,
        title: data.title,
        description: data.description,
        coverUrl: null,
        createdBy: user.uid,
        startTime: Timestamp.fromDate(startDate),
        endTime: endDate ? Timestamp.fromDate(endDate) : null,
        status: 'scheduled',
        maxAttendees: data.maxAttendees ? parseInt(data.maxAttendees) : null,
        isRecurring: false,
        recurrenceRule: null,
        tags: [],
      })
      toast.success('Event created!')
      reset()
      onClose()
    } catch {
      toast.error('Failed to create event')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Event">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Event Title" {...register('title', { required: 'Title is required' })} error={errors.title?.message} />
        <div>
          <label className="block text-xs font-medium text-pulse-text-muted mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full bg-pulse-bg-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted outline-none focus:border-pulse-brand/50 resize-none"
            placeholder="What is this event about?"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label="Start Date" {...register('startDate', { required: true })} />
          <Input type="time" label="Start Time" {...register('startTime', { required: true })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label="End Date (optional)" {...register('endDate')} />
          <Input type="time" label="End Time" {...register('endTime')} />
        </div>
        <Input type="number" label="Max Attendees (optional)" {...register('maxAttendees')} placeholder="Unlimited" />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Create Event</Button>
        </div>
      </form>
    </Modal>
  )
}
