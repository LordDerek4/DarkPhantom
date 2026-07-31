import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

async function getIdToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.getIdToken()
}

export async function startConnectOnboarding(serverId: string): Promise<void> {
  const token = await getIdToken()
  const res = await fetch('/api/connect-onboard', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverId }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to start Stripe onboarding')
  const { url } = await res.json()
  window.location.href = url
}

export async function checkConnectStatus(serverId: string): Promise<{
  connected: boolean
  onboardingComplete: boolean
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  detailsSubmitted?: boolean
}> {
  const token = await getIdToken()
  const res = await fetch('/api/connect-status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverId }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to check Stripe status')
  return res.json()
}

export async function startCommunityCheckout(serverId: string): Promise<void> {
  const token = await getIdToken()
  const res = await fetch('/api/create-community-checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverId }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to start checkout')
  const { url } = await res.json()
  window.location.href = url
}

export async function setCommunityPricing(
  serverId: string,
  updates: { isPaid: boolean; priceAmount?: number | null; priceCurrency?: string }
): Promise<void> {
  await updateDoc(doc(db, 'communitySettings', serverId), {
    isPaid: updates.isPaid,
    priceAmount: updates.priceAmount ?? null,
    priceCurrency: updates.priceCurrency ?? 'usd',
    updatedAt: serverTimestamp(),
  })

  // Keep the Discover listing's price tag in sync, if this community is
  // public and already has one — a private community has no listing to
  // update yet (see syncDiscoverListing in discover.service.ts).
  const listingRef = doc(db, 'serverListings', serverId)
  const listingSnap = await getDoc(listingRef)
  if (listingSnap.exists()) {
    await updateDoc(listingRef, {
      isPaid: updates.isPaid,
      priceAmount: updates.priceAmount ?? null,
      priceCurrency: updates.priceCurrency ?? 'usd',
      updatedAt: serverTimestamp(),
    })
  }
}
