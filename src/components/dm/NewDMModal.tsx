import React, { useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { searchUsers } from '@/services/user.service'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { debounce } from '@/utils/helpers'
import type { User, DirectMessageChannel } from '@/types'

interface NewDMModalProps {
  open: boolean
  onClose: () => void
  onSelect: (userId: string) => Promise<DirectMessageChannel>
}

export function NewDMModal({ open, onClose, onSelect }: NewDMModalProps) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)

  const search = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) { setResults([]); return }
      setSearching(true)
      try {
        const users = await searchUsers(q, user?.uid)
        setResults(users)
      } finally {
        setSearching(false)
      }
    }, 300),
    [user?.uid]
  )

  const handleQuery = (q: string) => {
    setQuery(q)
    search(q)
  }

  const handleSelect = async (targetUser: User) => {
    setOpening(targetUser.uid)
    try {
      const channel = await onSelect(targetUser.uid)
      onClose()
    } finally {
      setOpening(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Open a Conversation" size="sm">
      <div className="space-y-4">
        <Input
          placeholder="Find or start a conversation"
          value={query}
          onChange={e => handleQuery(e.target.value)}
          leftIcon={<Search size={16} />}
          autoFocus
        />

        <div className="space-y-1 max-h-72 overflow-y-auto">
          {searching && (
            <div className="text-center py-4 text-pulse-text-muted text-sm">Searching...</div>
          )}
          {!searching && results.map(u => (
            <button
              key={u.uid}
              onClick={() => handleSelect(u)}
              disabled={!!opening}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-left"
            >
              <Avatar src={u.avatarUrl} name={u.displayName} userId={u.uid} size="sm" showStatus />
              <div>
                <p className="text-sm font-medium text-pulse-text-normal">{u.displayName}</p>
                <p className="text-xs text-pulse-text-muted">@{u.username}</p>
              </div>
              {opening === u.uid && (
                <span className="ml-auto text-xs text-pulse-text-muted">Opening...</span>
              )}
            </button>
          ))}
          {!searching && query && results.length === 0 && (
            <div className="text-center py-4 text-pulse-text-muted text-sm">
              No users found matching "{query}"
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
