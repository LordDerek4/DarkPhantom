import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthPage } from '@/components/auth/AuthPage'
import { AppLogo } from '@/components/ui/AppLogo'
import { LandingPage } from '@/pages/LandingPage'
import { AboutPage } from '@/pages/AboutPage'
import { SupportPage } from '@/pages/SupportPage'
import { FAQPage } from '@/pages/FAQPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { TermsPage } from '@/pages/TermsPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { ChatArea } from '@/components/chat/ChatArea'
import { DMArea } from '@/components/dm/DMArea'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { UserSettings } from '@/components/settings/UserSettings'
import { useAuthContext } from '@/contexts/AuthContext'
import { useAppStore } from '@/store/useAppStore'
import { requestNotificationPermission } from '@/services/notification.service'
import { HomeScreen } from '@/components/HomeScreen'
import { JoinServerModal } from '@/components/server/JoinServerModal'
import { CreateCommunityModal } from '@/components/server/CreateCommunityModal'
import { UserProfileModal } from '@/components/profile/UserProfileModal'
import { ServerSettingsModal } from '@/components/server/ServerSettingsModal'
import { CallOverlay } from '@/components/call/CallOverlay'
import { IncomingCallNotification } from '@/components/call/IncomingCallNotification'
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel'
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay'
import { useTutorial } from '@/hooks/useTutorial'
import { SubscriptionSuccessPage, SubscriptionCancelPage } from '@/pages/SubscriptionSuccessPage'

const DiscoverPage = lazy(() => import('@/components/discover/DiscoverPage').then(m => ({ default: m.DiscoverPage })))
const FriendsPanel = lazy(() => import('@/components/friends/FriendsPanel').then(m => ({ default: m.FriendsPanel })))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { initialized, loading, currentUser } = useAuthContext()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-pulse-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AppLogo size={48} showText={false} />
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-pulse-brand animate-pulse-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function MainApp() {
  const { viewMode, isCreateCommunityOpen, closeCreateCommunity, isJoinServerOpen, openJoinServer, closeJoinServer, showTutorial } = useAppStore()
  const [joinInviteCode, setJoinInviteCode] = useState('')
  const { completeTutorial, skipTutorial } = useTutorial()

  useEffect(() => {
    requestNotificationPermission()
    // Consume any invite code stored by the /invite/:code redirect
    const pending = sessionStorage.getItem('pendingInvite')
    if (pending) {
      sessionStorage.removeItem('pendingInvite')
      setJoinInviteCode(pending)
      openJoinServer()
    }
  }, [])

  const handleJoinServer = (inviteCode: string) => {
    setJoinInviteCode(inviteCode)
    openJoinServer()
  }

  return (
    <AppLayout>
      {viewMode === 'home' && <HomeScreen />}
      {viewMode === 'server' && <ChatArea />}
      {viewMode === 'dm' && <DMArea />}
      {viewMode === 'discover' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-pulse-brand border-t-transparent rounded-full" /></div>}>
          <DiscoverPage onJoinServer={handleJoinServer} />
        </Suspense>
      )}
      {viewMode === 'friends' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-pulse-brand border-t-transparent rounded-full" /></div>}>
          <FriendsPanel />
        </Suspense>
      )}
      <JoinServerModal
        open={isJoinServerOpen}
        onClose={() => { closeJoinServer(); setJoinInviteCode('') }}
        initialCode={joinInviteCode}
      />
      <CreateCommunityModal open={isCreateCommunityOpen} onClose={closeCreateCommunity} />
      <UserProfileModal />
      <ServerSettingsModal />
      {showTutorial && <TutorialOverlay onComplete={completeTutorial} onSkip={skipTutorial} />}
    </AppLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public marketing & docs routes */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        {/* Auth */}
        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/invite/:code" element={<InviteRedirect />} />
        {/* Subscription redirects — must be authenticated */}
        <Route path="/subscription/success" element={<ProtectedRoute><SubscriptionSuccessPage /></ProtectedRoute>} />
        <Route path="/subscription/cancel" element={<ProtectedRoute><SubscriptionCancelPage /></ProtectedRoute>} />
        {/* Landing page for unauthenticated visitors */}
        <Route path="/" element={<LandingOrApp />} />
        {/* App — all sub-paths */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainApp />
              <GlobalSearch />
              <UserSettings />
              <CallOverlay />
              <IncomingCallNotification />
              <NotificationsPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { initialized, loading, currentUser } = useAuthContext()
  if (!initialized || loading) return null
  if (currentUser) return <Navigate to="/app" replace />
  return <>{children}</>
}

function LandingOrApp() {
  const { initialized, loading, currentUser } = useAuthContext()
  if (!initialized || loading) return null
  if (currentUser) return (
    <ProtectedRoute>
      <MainApp />
      <GlobalSearch />
      <UserSettings />
      <CallOverlay />
      <IncomingCallNotification />
      <NotificationsPanel />
    </ProtectedRoute>
  )
  return <LandingPage />
}

function InviteRedirect() {
  const { currentUser } = useAuthContext()
  // Store invite code for after auth
  useEffect(() => {
    const code = window.location.pathname.split('/invite/')[1]
    if (code) sessionStorage.setItem('pendingInvite', code)
  }, [])

  if (!currentUser) return <Navigate to="/auth" replace />
  return <Navigate to="/" replace />
}
