import type { ServerMember, Role, RolePermission, Channel } from '@/types'

export function hasPermission(
  member: ServerMember | null,
  roles: Role[],
  permission: RolePermission
): boolean {
  if (!member) return false

  const memberRoles = roles.filter(r => member.roles.includes(r.id))

  // ADMINISTRATOR bypasses all permission checks
  if (memberRoles.some(r => r.permissions.includes('ADMINISTRATOR'))) return true

  return memberRoles.some(r => r.permissions.includes(permission))
}

export function hasChannelPermission(
  member: ServerMember | null,
  roles: Role[],
  channel: Channel,
  permission: RolePermission
): boolean {
  if (!member) return false

  // Check base server permission first
  if (!hasPermission(member, roles, 'READ_MESSAGES') && permission === 'READ_MESSAGES') {
    return false
  }

  const overwrites = channel.permissionOverwrites

  // Check member-specific overwrites first (higher priority)
  const memberOverwrite = overwrites.find(o => o.type === 'member' && o.id === member.userId)
  if (memberOverwrite) {
    if (memberOverwrite.deny.includes(permission)) return false
    if (memberOverwrite.allow.includes(permission)) return true
  }

  // Check role-specific overwrites
  for (const roleId of member.roles) {
    const roleOverwrite = overwrites.find(o => o.type === 'role' && o.id === roleId)
    if (roleOverwrite) {
      if (roleOverwrite.deny.includes(permission)) return false
      if (roleOverwrite.allow.includes(permission)) return true
    }
  }

  // Fall back to server-wide role permissions
  return hasPermission(member, roles, permission)
}

export function getHighestRole(member: ServerMember, roles: Role[]): Role | null {
  const memberRoles = roles.filter(r => member.roles.includes(r.id))
  return memberRoles.sort((a, b) => b.position - a.position)[0] ?? null
}

export function canModerate(
  moderator: ServerMember,
  target: ServerMember,
  roles: Role[],
  ownerId: string
): boolean {
  // Owner cannot be moderated
  if (target.userId === ownerId) return false
  // Owner can moderate anyone
  if (moderator.userId === ownerId) return true

  const modRole = getHighestRole(moderator, roles)
  const targetRole = getHighestRole(target, roles)

  if (!modRole) return false
  if (!targetRole) return true

  return modRole.position > targetRole.position
}

export const DEFAULT_PERMISSIONS: RolePermission[] = [
  'READ_MESSAGES',
  'SEND_MESSAGES',
  'EMBED_LINKS',
  'ATTACH_FILES',
  'ADD_REACTIONS',
  'USE_SLASH_COMMANDS',
  'CREATE_INVITES',
  'CHANGE_NICKNAME',
]

export const ADMIN_PERMISSIONS: RolePermission[] = [
  ...DEFAULT_PERMISSIONS,
  'MANAGE_MESSAGES',
  'MANAGE_CHANNELS',
  'KICK_MEMBERS',
  'BAN_MEMBERS',
  'MUTE_MEMBERS',
  'PIN_MESSAGES',
  'MENTION_EVERYONE',
  'MANAGE_NICKNAMES',
]

export const OWNER_PERMISSIONS: RolePermission[] = [
  ...ADMIN_PERMISSIONS,
  'ADMINISTRATOR',
  'MANAGE_SERVER',
  'MANAGE_ROLES',
]
