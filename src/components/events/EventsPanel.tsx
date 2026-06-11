import React, { useEffect, useState } from 'react'
import { Calendar, Plus, Clock, Users, MapPin, Check, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { cn } from '@/utils/helpers'
import { subscribeToServerEvents, rsvpEvent } from '@/services/events.service'
import { useAuth } from '@/hooks/useAuth'
import type { CommunityEvent } from '@/types/extended'
import { CreateEventModal } from './CreateEventModal'

interface EventsPanelProps {
  serverId: string
}

function EventCard({ event, currentUserId }: { event: CommunityEvent; currentUserId: string }) {
  const isAttending = event.attendeeIds.includes(currentUserId)
  const isInterested = event.interestedIds.includes(currentUserId)
  const isLive = event.status === 'live'
  const isPast = event.status === 'ended' || event.status === 'cancelled'

  return (
    <div className={cn('rounded-xl overflow-hidden border', isLive ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-pulse-bg-secondary')}>
      {event.coverUrl && (
        <div className="h-24 bg-pulse-bg-primary relative">
          <img src={event.coverUrl} alt="" className="w-full h-full object-cover" />
          {isLive && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
          )}
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-pulse-text-normal text-sm">{event.title}</h3>
            <div className="flex items-center gap-1 text-xs text-pulse-text-muted mt-0.5">
              <Clock size={11} />
              <span>{format(event.startTime.toDate(), 'MMM d, h:mm a')}</span>
            </div>
          </div>
          {!isPast && (
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => rsvpEvent(event.id, currentUserId, isAttending ? 'remove' : 'attend')}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                  isAttending ? 'bg-green-500/20 text-green-400' : 'bg-pulse-bg-primary text-pulse-text-muted hover:text-pulse-text-normal'
                )}
              >
                <Check size={10} />
                {isAttending ? 'Going' : 'RSVP'}
              </button>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-xs text-pulse-text-muted line-clamp-2">{event.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-pulse-text-muted">
          <div className="flex items-center gap-1">
            <Users size={11} />
            <span>{event.attendeeIds.length} going</span>
          </div>
          {event.interestedIds.length > 0 && (
            <div className="flex items-center gap-1">
              <Bell size={11} />
              <span>{event.interestedIds.length} interested</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function EventsPanel({ serverId }: EventsPanelProps) {
  const { user } = useAuth()
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    return subscribeToServerEvents(serverId, setEvents)
  }, [serverId])

  const upcoming = events.filter(e => e.status === 'scheduled' || e.status === 'live')
  const past = events.filter(e => e.status === 'ended')

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/20 shrink-0">
        <h2 className="font-semibold text-pulse-text-normal flex items-center gap-2">
          <Calendar size={16} className="text-pulse-brand" />
          Events
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pulse-brand text-white text-xs font-medium hover:bg-pulse-brand-hover transition-colors"
        >
          <Plus size={12} />
          Create
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {upcoming.length === 0 && past.length === 0 && (
          <div className="text-center py-12">
            <Calendar size={32} className="text-pulse-text-muted mx-auto mb-2 opacity-50" />
            <p className="text-sm text-pulse-text-muted">No events yet</p>
            <button onClick={() => setShowCreate(true)} className="text-xs text-pulse-brand mt-1 hover:underline">
              Create the first event
            </button>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">Upcoming</p>
            {upcoming.map(e => <EventCard key={e.id} event={e} currentUserId={user?.uid ?? ''} />)}
          </div>
        )}

        {past.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">Past Events</p>
            {past.map(e => <EventCard key={e.id} event={e} currentUserId={user?.uid ?? ''} />)}
          </div>
        )}
      </div>

      <CreateEventModal serverId={serverId} open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
