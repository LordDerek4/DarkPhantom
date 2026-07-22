import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getDb() {
  if (!getApps().length) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')
    initializeApp({ credential: cert(JSON.parse(sa)) })
  }
  return getFirestore()
}

export { getDb }

export async function verifyIdToken(token: string): Promise<{ uid: string; email?: string }> {
  const apiKey = process.env.VITE_FIREBASE_API_KEY
  if (!apiKey) throw new Error('VITE_FIREBASE_API_KEY not set')

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? 'Invalid or expired token')
  }

  const data = await res.json()
  const user = data?.users?.[0]
  if (!user) throw new Error('User not found')

  return { uid: user.localId, email: user.email }
}
