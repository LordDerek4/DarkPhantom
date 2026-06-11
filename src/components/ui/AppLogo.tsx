import React, { useId } from 'react'
import { cn } from '@/utils/helpers'

interface AppLogoProps {
  size?: number
  showText?: boolean
  textClassName?: string
  className?: string
}

export function AppLogo({ size = 32, showText = true, textClassName, className }: AppLogoProps) {
  const uid = useId().replace(/:/g, '')
  const gradId = `logo-g-${uid}`

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ef4444"/>
            <stop offset="100%" stopColor="#b91c1c"/>
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill={`url(#${gradId})`}/>
        <path
          d="M13 9H35C37.2 9 39 10.8 39 13V27C39 29.2 37.2 31 35 31H21L13 40V31C10.8 31 9 29.2 9 27V13C9 10.8 10.8 9 13 9Z"
          fill="white"
        />
        <polyline
          points="14,20 17,20 19,14 21,26 23,15 25,21 34,20"
          stroke="#ef4444"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showText && (
        <span className={cn('font-bold text-white', textClassName ?? 'text-lg')}>
          PulseChat
        </span>
      )}
    </div>
  )
}
