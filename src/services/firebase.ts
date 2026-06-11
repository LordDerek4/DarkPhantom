import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getMessaging, isSupported } from 'firebase/messaging'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Analytics only in production
export const analytics = typeof window !== 'undefined' && import.meta.env.PROD
  ? getAnalytics(app)
  : null

// FCM — only available in browsers that support it
export const getMessagingInstance = async () => {
  const supported = await isSupported()
  if (!supported) return null
  return getMessaging(app)
}

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8080)
  connectStorageEmulator(storage, 'localhost', 9199)
}

// Firestore collection paths
export const COLLECTIONS = {
  USERS: 'users',
  SERVERS: 'servers',
  SERVER_MEMBERS: 'serverMembers',
  CHANNELS: 'channels',
  MESSAGES: 'messages',
  DIRECT_MESSAGE_CHANNELS: 'directMessageChannels',
  DIRECT_MESSAGES: 'directMessages',
  REACTIONS: 'reactions',
  INVITES: 'invites',
  NOTIFICATIONS: 'notifications',
  ROLES: 'roles',
  MODERATION_LOGS: 'moderationLogs',
  TYPING: 'typing',
  PRESENCE: 'presence',
} as const
