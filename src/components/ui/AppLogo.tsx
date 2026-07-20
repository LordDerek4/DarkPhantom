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
          <linearGradient id={gradId} x1="4" y1="3" x2="44" y2="33" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff8a3d"/>
            <stop offset="100%" stopColor="#f5372e"/>
          </linearGradient>
        </defs>
        <path d="M13 29 L9 41 L20.5 30 Z" fill={`url(#${gradId})`}/>
        <ellipse cx="24" cy="18" rx="21" ry="15" fill={`url(#${gradId})`}/>
        <polyline
          points="7,18 12,18 15,11 18,25 21,9 24,20 27,15 30,18 41,18"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showText && (
        <span className={cn('font-bold text-white', textClassName ?? 'text-lg')}>
          AevixChat
        </span>
      )}
    </div>
  )
}
