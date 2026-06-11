import { useEffect, useState } from 'react'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/services/firebase'
import { useAuth } from './useAuth'

export function useTutorial() {
  const { user } = useAuth()
  const [showTutorial, setShowTutorial] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!user?.uid || checked) return
    setChecked(true)
    getDoc(doc(db, COLLECTIONS.USERS, user.uid)).then(snap => {
      const data = snap.data()
      if (data && !data.hasCompletedTutorial) {
        setShowTutorial(true)
      }
    }).catch(() => {})
  }, [user?.uid, checked])

  const completeTutorial = async () => {
    setShowTutorial(false)
    if (!user?.uid) return
    await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      hasCompletedTutorial: true,
    }).catch(() => {})
  }

  const skipTutorial = () => completeTutorial()

  return { showTutorial, completeTutorial, skipTutorial }
}
