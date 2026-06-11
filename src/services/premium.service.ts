import { auth } from './firebase'

async function getIdToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.getIdToken()
}

export async function startCheckout(): Promise<void> {
  const token = await getIdToken()
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to create checkout session')
  const { url } = await res.json()
  window.location.href = url
}

export async function verifySession(sessionId: string): Promise<{ isPremium: boolean }> {
  const token = await getIdToken()
  const res = await fetch('/api/verify-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  })
  if (!res.ok) throw new Error('Failed to verify session')
  return res.json()
}

export async function openCustomerPortal(): Promise<void> {
  const token = await getIdToken()
  const res = await fetch('/api/customer-portal', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to open customer portal')
  const { url } = await res.json()
  window.location.href = url
}
