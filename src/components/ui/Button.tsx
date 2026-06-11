import React from 'react'
import { cn } from '@/utils/helpers'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  children: React.ReactNode
}

const variants = {
  primary: 'bg-pulse-brand hover:bg-pulse-brand-hover text-white',
  secondary: 'bg-white/10 hover:bg-white/15 text-pulse-text-normal',
  ghost: 'hover:bg-white/10 text-pulse-text-muted hover:text-pulse-text-normal',
  danger: 'bg-pulse-text-danger hover:bg-red-700 text-white',
  success: 'bg-pulse-status-online hover:bg-green-600 text-white',
  outline: 'border border-white/20 hover:bg-white/5 text-pulse-text-normal',
}

const sizes = {
  sm: 'h-8 px-3 text-sm rounded',
  md: 'h-10 px-4 text-sm rounded-md',
  lg: 'h-12 px-6 text-base rounded-md',
  icon: 'h-8 w-8 rounded-full p-0',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-brand',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}
