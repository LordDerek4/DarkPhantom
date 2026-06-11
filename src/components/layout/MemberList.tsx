import React, { useMemo } from 'react'
import { Crown, Shield, ShieldAlert } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useAppStore, selectActiveMembers, selectActiveRoles } from '@/store/useAppStore'
import { useServerDetails } from '@/hooks/useServer'
import { useUsers } from '@/hooks/useUserCache'
import { Avatar } from '@/components/ui/Avatar'
import { MemberSkeleton } from '@/components/ui/LoadingSkeleton'
import type { ServerMember, Role } from '@/types'

export function MemberList() {
  const { activeServerId } = useAppStore()
  const { members, roles, server, loading } = useServerDetails(activeServerId)
  const userIds = members.map(m => m.userId)
  const users = useUsers(userIds)

  const grouped = useMemo(() => {
    if (!server) return { online: [], offline: [] }

    const withInfo = members.map(member => {
      const user = users[member.userId]
      const highestRole = getHighestRole(member, roles)
      return { member, user, highestRole }
    })

    return {
      online: withInfo.filter(m => {
        const status = useAppStore.getState().presences[m.member.userId]
        return status === 'online' || status === 'idle' || status === 'dnd'
      }),
      offline: withInfo.filter(m => {
        const status = useAppStore.getState().presences[m.member.userId]
        return !status || status === 'offline'
      }),
    }
  }, [members, roles, users, activeServerId])

  return (
    <aside className="w-60 bg-pulse-bg-secondary flex-col overflow-y-auto scrollbar-thin hidden lg:flex shrink-0">
      <div className="py-4 px-3">
        {loading ? (
          <MemberSkeleton />
        ) : (
          <>
            {grouped.online.length > 0 && (
              <MemberGroup
                label={`Online — ${grouped.online.length}`}
                members={grouped.online}
                serverId={activeServerId!}
                ownerId={server?.ownerId}
              />
            )}
            {grouped.offline.length > 0 && (
              <MemberGroup
                label={`Offline — ${grouped.offline.length}`}
                members={grouped.offline}
                serverId={activeServerId!}
                ownerId={server?.ownerId}
              />
            )}
          </>
        )}
      </div>
    </aside>
  )
}

function MemberGroup({
  label,
  members,
  serverId,
  ownerId,
}: {
  label: string
  members: { member: ServerMember; user: ReturnType<typeof useUsers>[string]; highestRole: Role | null }[]
  serverId: string
  ownerId?: string
}) {
  const { setUserProfileId } = useAppStore()

  return (
    <div className="mb-4">
      <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">
        {label}
      </p>
      {members.map(({ member, user, highestRole }) => (
        <button
          key={member.userId}
          onClick={() => setUserProfileId(member.userId)}
          className="w-full flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 group"
        >
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName ?? member.userId.slice(0, 2)}
            userId={member.userId}
            size="sm"
            showStatus
          />
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1">
              <span className={cn(
                'text-sm font-medium truncate',
                highestRole?.color ? `text-[${highestRole.color}]` : 'text-pulse-text-muted group-hover:text-pulse-text-normal'
              )}>
                {member.nickname ?? user?.displayName ?? 'Unknown'}
              </span>
              {member.userId === ownerId && (
                <Crown size={12} className="text-yellow-400 shrink-0" />
              )}
            </div>
            {member.isMuted && (
              <span className="text-xs text-pulse-text-danger">Muted</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

function getHighestRole(member: ServerMember, roles: Role[]): Role | null {
  const memberRoles = roles.filter(r => member.roles.includes(r.id))
  return memberRoles.sort((a, b) => b.position - a.position)[0] ?? null
}
