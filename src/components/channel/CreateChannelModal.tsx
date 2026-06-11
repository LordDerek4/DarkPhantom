import React, { useState } from 'react'
import { Hash, Megaphone } from 'lucide-react'
import { createChannel } from '@/services/channel.service'
import { useAppStore } from '@/store/useAppStore'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'
import type { ChannelType } from '@/types'
import toast from 'react-hot-toast'

interface CreateChannelModalProps {
  open: boolean
  onClose: () => void
  serverId: string
  categoryId: string | null
}

const CHANNEL_TYPES: { type: ChannelType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    type: 'text',
    label: 'Text',
    desc: 'Send messages, images, GIFs, emoji, opinions, and more.',
    icon: <Hash size={20} />,
  },
  {
    type: 'announcement',
    label: 'Announcement',
    desc: 'Important updates that can be followed by other servers.',
    icon: <Megaphone size={20} />,
  },
]

export function CreateChannelModal({ open, onClose, serverId, categoryId }: CreateChannelModalProps) {
  const { addChannel } = useAppStore()
  const [channelType, setChannelType] = useState<ChannelType>('text')
  const [channelName, setChannelName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channelName.trim()) return
    setLoading(true)
    try {
      const channel = await createChannel(serverId, channelName, channelType, categoryId, 99)
      addChannel(serverId, channel)
      toast.success(`#${channel.name} created!`)
      onClose()
      setChannelName('')
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to create channel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Channel" size="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted mb-2">
            Channel Type
          </p>
          <div className="space-y-2">
            {CHANNEL_TYPES.map(t => (
              <button
                key={t.type}
                type="button"
                onClick={() => setChannelType(t.type)}
                className={cn(
                  'w-full flex items-center gap-4 p-3 rounded-lg text-left transition-colors',
                  channelType === t.type
                    ? 'bg-white/10 text-pulse-text-normal'
                    : 'hover:bg-white/5 text-pulse-text-muted'
                )}
              >
                {t.icon}
                <div>
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className="text-xs text-pulse-text-muted">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Channel Name"
          placeholder="new-channel"
          value={channelName}
          onChange={e => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          leftIcon={<Hash size={16} />}
          maxLength={100}
        />

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} disabled={!channelName.trim()}>
            Create Channel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
