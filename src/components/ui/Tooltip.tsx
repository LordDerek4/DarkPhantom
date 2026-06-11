import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/utils/helpers'

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
}

export function Tooltip({ children, content, side = 'top', align = 'center', delayDuration = 400 }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={8}
            className={cn(
              'z-50 rounded px-2.5 py-1.5 text-sm font-medium',
              'bg-pulse-bg-floating text-pulse-text-normal',
              'shadow-elevation-high',
              'animate-fade-in'
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-pulse-bg-floating" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
