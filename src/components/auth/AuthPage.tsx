import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'
import { AppLogo } from '@/components/ui/AppLogo'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="min-h-screen bg-pulse-bg-primary flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pulse-brand/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <AppLogo size={40} textClassName="text-2xl" />
        </div>

        {/* Card */}
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2 }}
          className="bg-pulse-bg-secondary rounded-xl p-8 shadow-elevation-high"
        >
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <LoginForm key="login" onSwitchToSignup={() => setMode('signup')} />
            ) : (
              <SignupForm key="signup" onSwitchToLogin={() => setMode('login')} />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
