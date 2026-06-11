import { useAuthContext } from '@/contexts/AuthContext'
import { useCallback } from 'react'
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  logOut,
  resetPassword,
  changeEmail,
  changePassword,
} from '@/services/auth.service'
import { updateUserProfile } from '@/services/user.service'
import { uploadAvatar, uploadUserBanner } from '@/services/storage.service'

export function useAuth() {
  const { firebaseUser, currentUser, loading, initialized } = useAuthContext()

  const signUp = useCallback(async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    return signUpWithEmail(email, password, username, displayName)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    return signInWithEmail(email, password)
  }, [])

  const googleSignIn = useCallback(async () => {
    return signInWithGoogle()
  }, [])

  const signOutUser = useCallback(async () => {
    return logOut()
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    return resetPassword(email)
  }, [])

  const updateProfile = useCallback(async (updates: {
    displayName?: string
    bio?: string
    customStatus?: string
  }) => {
    if (!currentUser) throw new Error('Not authenticated')
    return updateUserProfile(currentUser.uid, updates)
  }, [currentUser])

  const uploadAndSetAvatar = useCallback(async (file: File, onProgress?: (p: number) => void) => {
    if (!currentUser) throw new Error('Not authenticated')
    const url = await uploadAvatar(currentUser.uid, file, onProgress)
    await updateUserProfile(currentUser.uid, { avatarUrl: url })
    return url
  }, [currentUser])

  const uploadAndSetBanner = useCallback(async (file: File, onProgress?: (p: number) => void) => {
    if (!currentUser) throw new Error('Not authenticated')
    const url = await uploadUserBanner(currentUser.uid, file, onProgress)
    await updateUserProfile(currentUser.uid, { bannerUrl: url })
    return url
  }, [currentUser])

  return {
    user: currentUser,
    firebaseUser,
    loading,
    initialized,
    isAuthenticated: !!currentUser,
    signUp,
    signIn,
    googleSignIn,
    signOut: signOutUser,
    sendPasswordReset,
    updateProfile,
    uploadAndSetAvatar,
    uploadAndSetBanner,
    changeEmail,
    changePassword,
  }
}
