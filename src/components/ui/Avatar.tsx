import React from 'react'
import { cn, getAvatarColor, getInitials } from '@/utils/helpers'
import type { UserStatus } from '@/types'
import { useAppStore } from '@/store/useAppStore'

interface AvatarProps {
  src?: string | null
  name: string
  userId?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showStatus?: boolean
  status?: UserStatus
  className?: string
  onClick?: () => void
}

const sizes = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const statusSizes = {
  xs: 'w-2 h-2 border',
  sm: 'w-3 h-3 border-2',
  md: 'w-3.5 h-3.5 border-2',
  lg: 'w-4 h-4 border-2',
  xl: 'w-5 h-5 border-2',
}

const statusColors = {
  online: 'bg-pulse-status-online',
  idle: 'bg-pulse-status-idle',
  dnd: 'bg-pulse-status-dnd',
  offline: 'bg-pulse-status-offline',
}

export function Avatar({
  src,
  name,
  userId,
  size = 'md',
  showStatus = false,
  status,
  className,
  onClick,
}: AvatarProps) {
  const presences = useAppStore(s => s.presences)
  const resolvedStatus = status ?? (userId ? presences[userId] : undefined) ?? 'offline'

  return (
    <div className={cn('relative inline-flex shrink-0', className)} onClick={onClick}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover', sizes[size], onClick && 'cursor-pointer hover:opacity-90 transition-opacity')}
          draggable={false}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white select-none',
            sizes[size],
            getAvatarColor(name),
            onClick && 'cursor-pointer hover:opacity-90 transition-opacity'
          )}
        >
          {getInitials(name)}
        </div>
      )}

      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-pulse-bg-primary',
            statusSizes[size],
            statusColors[resolvedStatus]
          )}
          title={resolvedStatus}
        />
      )}
    </div>
  )
}
