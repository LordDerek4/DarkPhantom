import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from '@/services/firebase'
import type { User, UserStatus } from '@/types'
import { updatePresence } from '@/services/presence.service'
import { useAppStore } from '@/store/useAppStore'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  currentUser: User | null
  loading: boolean
  initialized: boolean
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  currentUser: null,
  loading: true,
  initialized: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Cleanup refs so we can properly tear down across auth state changes
    let unsubUser: (() => void) | null = null
    let handleUnload: (() => void) | null = null

    const cleanup = () => {
      unsubUser?.()
      unsubUser = null
      if (handleUnload) {
        window.removeEventListener('beforeunload', handleUnload)
        handleUnload = null
      }
    }

    const unsubAuth = onAuthStateChanged(auth, fbUser => {
      // Tear down previous session's listeners before setting up new ones
      cleanup()

      // The app store is a singleton that outlives any single login session —
      // clear whatever the previous account left behind (servers, channels,
      // DMs, notifications...) before this account's own subscriptions
      // (useServer, useDirectMessages, etc.) start populating fresh data.
      useAppStore.getState().resetForNewUser()

      setFirebaseUser(fbUser)

      if (!fbUser) {
        setCurrentUser(null)
        setLoading(false)
        setInitialized(true)
        return
      }

      // Subscribe to user document for real-time updates
      const userRef = doc(db, COLLECTIONS.USERS, fbUser.uid)
      unsubUser = onSnapshot(userRef, snap => {
        if (snap.exists()) {
          setCurrentUser({ uid: snap.id, ...snap.data() } as User)
        } else {
          setCurrentUser(null)
        }
        setLoading(false)
        setInitialized(true)
      })

      // Set online on login, offline on tab close — async work runs outside the callback
      const uid = fbUser.uid
      getDoc(doc(db, COLLECTIONS.USERS, uid)).then(userSnap => {
        const savedStatus = userSnap.data()?.status as UserStatus | undefined
        const initialStatus: UserStatus = (savedStatus && savedStatus !== 'offline') ? savedStatus : 'online'
        updatePresence(uid, initialStatus)
      })

      handleUnload = () => updatePresence(uid, 'offline')
      window.addEventListener('beforeunload', handleUnload)
    })

    return () => {
      unsubAuth()
      cleanup()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ firebaseUser, currentUser, loading, initialized }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  return useContext(AuthContext)
}
