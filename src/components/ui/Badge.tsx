import React from 'react'
import { cn } from '@/utils/helpers'

interface BadgeProps {
  count: number
  max?: number
  className?: string
  dot?: boolean
}

export function Badge({ count, max = 99, className, dot }: BadgeProps) {
  if (count === 0 && !dot) return null

  if (dot) {
    return (
      <span className={cn('w-2.5 h-2.5 rounded-full bg-pulse-text-danger', className)} />
    )
  }

  return (
    <span
      className={cn(
        'min-w-[18px] h-[18px] px-1 rounded-full',
        'bg-pulse-text-danger text-white text-xs font-bold',
        'flex items-center justify-center',
        className
      )}
    >
      {count > max ? `${max}+` : count}
    </span>
  )
}
