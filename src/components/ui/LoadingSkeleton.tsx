import React from 'react'
import { cn } from '@/utils/helpers'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-white/5',
        className
      )}
    />
  )
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-4 px-4 py-2">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

export function ChannelSkeleton() {
  return (
    <div className="px-2 space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 flex-1 max-w-32" />
        </div>
      ))}
    </div>
  )
}

export function MemberSkeleton() {
  return (
    <div className="px-2 space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 flex-1 max-w-28" />
        </div>
      ))}
    </div>
  )
}

export function ServerSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="w-12 h-12 rounded-3xl" />
      ))}
    </div>
  )
}

export function DMSkeleton() {
  return (
    <div className="px-2 space-y-0.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2 rounded">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      ))}
    </div>
  )
}
