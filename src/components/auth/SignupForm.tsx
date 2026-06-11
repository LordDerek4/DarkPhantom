import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Mail, Lock, User, AtSign, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface SignupFormData {
  email: string
  displayName: string
  username: string
  password: string
  confirmPassword: string
}

interface SignupFormProps {
  onSwitchToLogin: () => void
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const { signUp, googleSignIn } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupFormData>()
  const password = watch('password')

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true)
    try {
      await signUp(data.email, data.password, data.username, data.displayName)
      toast.success('Account created! Welcome to PulseChat!')
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      const message = error.code === 'auth/email-already-in-use'
        ? 'An account with that email already exists'
        : error.message ?? 'Failed to create account'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      await googleSignIn()
      toast.success('Welcome to PulseChat!')
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message ?? 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-center text-white mb-1">Create an account</h1>
      <p className="text-center text-pulse-text-muted mb-6 text-sm">
        Join the community today!
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          leftIcon={<Mail size={16} />}
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+$/, message: 'Invalid email address' }
          })}
        />

        <Input
          label="Display Name"
          type="text"
          autoComplete="name"
          leftIcon={<User size={16} />}
          error={errors.displayName?.message}
          {...register('displayName', {
            required: 'Display name is required',
            minLength: { value: 2, message: 'At least 2 characters' },
            maxLength: { value: 32, message: 'Max 32 characters' }
          })}
        />

        <Input
          label="Username"
          type="text"
          autoComplete="username"
          leftIcon={<AtSign size={16} />}
          hint="Letters, numbers, underscores, hyphens only"
          error={errors.username?.message}
          {...register('username', {
            required: 'Username is required',
            minLength: { value: 3, message: 'At least 3 characters' },
            maxLength: { value: 32, message: 'Max 32 characters' },
            pattern: { value: /^[a-zA-Z0-9_.-]+$/, message: 'Invalid username format' }
          })}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button type="button" onClick={() => setShowPassword(v => !v)}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' }
          })}
        />

        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          leftIcon={<Lock size={16} />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: value => value === password || 'Passwords do not match'
          })}
        />

        <p className="text-xs text-pulse-text-muted">
          By registering, you agree to PulseChat's{' '}
          <span className="text-pulse-brand cursor-pointer hover:underline">Terms of Service</span>{' '}
          and{' '}
          <span className="text-pulse-brand cursor-pointer hover:underline">Privacy Policy</span>.
        </p>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Continue
        </Button>
      </form>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs text-pulse-text-muted">
          <span className="px-3 bg-pulse-bg-secondary">or</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        size="lg"
        onClick={handleGoogleSignIn}
        loading={googleLoading}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </Button>

      <p className="text-center text-pulse-text-muted text-sm mt-5">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-pulse-brand hover:underline">
          Log in
        </button>
      </p>
    </div>
  )
}
