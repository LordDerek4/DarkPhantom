import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateEmail,
  updatePassword,
  deleteUser,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from './firebase'
import type { User } from '@/types'
import { sanitizeUsername } from '@/utils/helpers'

const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('profile')
googleProvider.addScope('email')

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string,
  displayName: string
): Promise<FirebaseUser> {
  const sanitized = sanitizeUsername(username)
  if (!sanitized) throw new Error('Invalid username')

  // Check username uniqueness
  const usernameDoc = await getDoc(doc(db, 'usernames', sanitized))
  if (usernameDoc.exists()) throw new Error('Username is already taken')

  const { user } = await createUserWithEmailAndPassword(auth, email, password)

  await updateProfile(user, { displayName })
  await sendEmailVerification(user)
  await createUserDocument(user, username, displayName)

  return user
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  await updateUserPresence(user.uid, 'online')
  return user
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const { user } = await signInWithPopup(auth, googleProvider)
  const fallbackName = user.email?.split('@')[0] ?? 'user'

  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid))
  if (!userDoc.exists()) {
    const username = sanitizeUsername(user.displayName ?? fallbackName)
    await createUserDocument(user, username, user.displayName ?? fallbackName)
  } else {
    // Self-heal accounts created before this fix, which got the literal string
    // 'User' written as their permanent displayName when Google returned none at signup.
    const existingName = (userDoc.data() as User).displayName
    if ((!existingName || existingName === 'User') && (user.displayName || fallbackName)) {
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        displayName: user.displayName ?? fallbackName,
      })
    }
  }

  await updateUserPresence(user.uid, 'online')
  return user
}

export async function logOut(): Promise<void> {
  if (auth.currentUser) {
    await updateUserPresence(auth.currentUser.uid, 'offline')
  }
  await signOut(auth)
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export async function changeEmail(newEmail: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Not authenticated')
  await updateEmail(auth.currentUser, newEmail)
}

export async function changePassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Not authenticated')
  await updatePassword(auth.currentUser, newPassword)
}

export async function deleteAccount(): Promise<void> {
  if (!auth.currentUser) throw new Error('Not authenticated')
  await deleteUser(auth.currentUser)
}

async function createUserDocument(
  firebaseUser: FirebaseUser,
  username: string,
  displayName: string
): Promise<void> {
  const sanitized = sanitizeUsername(username)
  const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid)

  const userData: Omit<User, 'uid'> = {
    email: firebaseUser.email ?? '',
    username: sanitized,
    displayName,
    avatarUrl: firebaseUser.photoURL,
    bannerUrl: null,
    bio: '',
    status: 'online',
    customStatus: '',
    createdAt: serverTimestamp() as never,
    lastSeen: serverTimestamp() as never,
    friendIds: [],
    blockedIds: [],
    notificationSettings: {
      desktopNotifications: true,
      soundEnabled: true,
      mentionsOnly: false,
      suppressEveryone: false,
      suppressRoles: false,
    },
    themePreference: 'dark',
  }

  await setDoc(userRef, userData)
  await setDoc(doc(db, 'usernames', sanitized), { uid: firebaseUser.uid })
}

export async function updateUserPresence(uid: string, status: 'online' | 'offline'): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, uid)
  await updateDoc(userRef, {
    status,
    lastSeen: serverTimestamp(),
  })
}

export async function getUserById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid))
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() } as User
}
