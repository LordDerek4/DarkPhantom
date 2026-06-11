import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from '@/services/firebase'
import type { User, UserStatus } from '@/types'
import { updatePresence } from '@/services/presence.service'

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
    const unsubAuth = onAuthStateChanged(auth, async fbUser => {
      setFirebaseUser(fbUser)

      if (!fbUser) {
        setCurrentUser(null)
        setLoading(false)
        setInitialized(true)
        return
      }

      // Subscribe to user document for real-time updates
      const userRef = doc(db, COLLECTIONS.USERS, fbUser.uid)
      const unsubUser = onSnapshot(userRef, snap => {
        if (snap.exists()) {
          setCurrentUser({ uid: snap.id, ...snap.data() } as User)
        } else {
          setCurrentUser(null)
        }
        setLoading(false)
        setInitialized(true)
      })

      // Restore saved status (dnd/idle) or default to online — but never restore 'offline' (invisible)
      const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, fbUser.uid))
      const savedStatus = userSnap.data()?.status as UserStatus | undefined
      const initialStatus: UserStatus = (savedStatus && savedStatus !== 'offline') ? savedStatus : 'online'
      await updatePresence(fbUser.uid, initialStatus)

      // Set offline on tab close
      const handleUnload = () => updatePresence(fbUser.uid, 'offline')
      window.addEventListener('beforeunload', handleUnload)

      return () => {
        unsubUser()
        window.removeEventListener('beforeunload', handleUnload)
      }
    })

    return () => unsubAuth()
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
