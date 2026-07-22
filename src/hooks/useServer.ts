import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, onSnapshot, doc, orderBy } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/services/firebase'
import { useAppStore, selectActiveServer, selectActiveChannels, selectActiveMembers, selectActiveRoles } from '@/store/useAppStore'
import {
  createServer,
  joinServer,
  leaveServer,
  updateServer,
  getServerMembers,
  getServerRoles,
  createInvite,
  getServerInvites,
  deleteInvite,
  updateMemberRole,
  updateMemberNickname,
} from '@/services/server.service'
import { uploadServerIcon, uploadServerBanner } from '@/services/storage.service'
import type { Server, ServerMember, Role, Invite } from '@/types'
import { useAuth } from './useAuth'

export function useServers() {
  const { user } = useAuth()
  const { setServers, addServer, updateServer: updateStoreServer, removeServer, setActiveServer, activeServerId } = useAppStore()
  const servers = useAppStore(s => Object.values(s.servers))
  const [loading, setLoading] = useState(true)

  // Real-time server list subscription
  useEffect(() => {
    if (!user) return
    setLoading(true)

    const userServersQuery = query(
      collection(db, 'userServers'),
      where('userId', '==', user.uid)
    )

    const unsub = onSnapshot(userServersQuery, async snap => {
      const serverIds = snap.docs.map(d => d.data().serverId as string)
      const serverUnsubs = serverIds.map(serverId =>
        onSnapshot(doc(db, COLLECTIONS.SERVERS, serverId), serverSnap => {
          if (serverSnap.exists()) {
            updateStoreServer(serverId, { id: serverId, ...serverSnap.data() } as Server)
          }
        })
      )
      setLoading(false)
      return () => serverUnsubs.forEach(u => u())
    })

    return () => unsub()
  }, [user?.uid])

  const create = useCallback(async (name: string, iconFile?: File, isPublic = true) => {
    if (!user) throw new Error('Not authenticated')
    let iconUrl: string | null = null
    const server = await createServer(user.uid, name, null, isPublic)
    if (iconFile) {
      iconUrl = await uploadServerIcon(server.id, iconFile)
      await updateServer(server.id, { iconUrl })
    }
    addServer(server)
    return server
  }, [user])

  const join = useCallback(async (inviteCode: string) => {
    if (!user) throw new Error('Not authenticated')
    return joinServer(user.uid, inviteCode)
  }, [user])

  const leave = useCallback(async (serverId: string) => {
    if (!user) throw new Error('Not authenticated')
    await leaveServer(user.uid, serverId)
    removeServer(serverId)
  }, [user])

  return {
    servers,
    loading,
    activeServerId,
    create,
    join,
    leave,
    setActive: setActiveServer,
  }
}

export function useServerDetails(serverId: string | null) {
  const { user } = useAuth()
  const server = useAppStore(selectActiveServer)
  const channels = useAppStore(selectActiveChannels)
  const members = useAppStore(selectActiveMembers)
  const roles = useAppStore(selectActiveRoles)
  const { setChannels, setMembers, setRoles, setUsers, setActiveChannel } = useAppStore()
  const [loading, setLoading] = useState(true)

  // Subscribe to channels
  useEffect(() => {
    if (!serverId) return
    const q = query(
      collection(db, COLLECTIONS.CHANNELS),
      where('serverId', '==', serverId),
      orderBy('position', 'asc')
    )
    const unsub = onSnapshot(
      q,
      snap => {
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })) as never[]
        setChannels(serverId, loaded)
        // Auto-select first text channel if no channel is currently active
        const { activeChannelId: current } = useAppStore.getState()
        if (!current) {
          const first = (loaded as { id: string; type?: string }[]).find(c => c.type !== 'category')
          if (first) setActiveChannel(first.id)
        }
      },
      () => { setChannels(serverId, []); setLoading(false) }
    )
    return () => unsub()
  }, [serverId])

  // Subscribe to members
  useEffect(() => {
    if (!serverId) return
    const q = query(
      collection(db, COLLECTIONS.SERVER_MEMBERS),
      where('serverId', '==', serverId),
      where('isBanned', '==', false)
    )
    const unsub = onSnapshot(
      q,
      snap => { setMembers(serverId, snap.docs.map(d => d.data()) as ServerMember[]) },
      () => { setMembers(serverId, []) }
    )
    return () => unsub()
  }, [serverId])

  // Subscribe to roles — setLoading(false) here because roles are the last required dataset
  useEffect(() => {
    if (!serverId) return
    const q = query(
      collection(db, COLLECTIONS.ROLES),
      where('serverId', '==', serverId),
      orderBy('position', 'desc')
    )
    const unsub = onSnapshot(
      q,
      snap => {
        setRoles(serverId, snap.docs.map(d => ({ id: d.id, ...d.data() })) as Role[])
        setLoading(false)
      },
      () => { setRoles(serverId, []); setLoading(false) }
    )
    return () => unsub()
  }, [serverId])

  const currentMember = members.find(m => m.userId === user?.uid) ?? null

  return { server, channels, members, roles, currentMember, loading }
}

export function useServerInvites(serverId: string | null) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!serverId) return
    setLoading(true)
    getServerInvites(serverId).then(inv => {
      setInvites(inv)
      setLoading(false)
    })
  }, [serverId])

  const create = useCallback(async (channelId: string, createdBy: string, options = {}) => {
    if (!serverId) return
    const invite = await createInvite(serverId, channelId, createdBy, options)
    setInvites(prev => [invite, ...prev])
    return invite
  }, [serverId])

  const remove = useCallback(async (inviteId: string) => {
    await deleteInvite(inviteId)
    setInvites(prev => prev.filter(i => i.id !== inviteId))
  }, [])

  return { invites, loading, create, remove }
}
