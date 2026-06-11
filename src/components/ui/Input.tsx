import React from 'react'
import { cn } from '@/utils/helpers'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 px-3 rounded text-pulse-text-normal placeholder:text-pulse-text-muted',
              'bg-pulse-surface-input border border-white/5',
              'text-sm outline-none',
              'focus:border-pulse-brand transition-colors',
              error && 'border-pulse-text-danger focus:border-pulse-text-danger',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-pulse-text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-pulse-text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-pulse-text-muted">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 rounded text-pulse-text-normal placeholder:text-pulse-text-muted',
            'bg-pulse-surface-input border border-white/5',
            'text-sm outline-none resize-none',
            'focus:border-pulse-brand transition-colors',
            error && 'border-pulse-text-danger',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-pulse-text-danger">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
