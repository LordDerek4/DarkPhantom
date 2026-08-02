import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  Server,
  Channel,
  ServerMember,
  Role,
  User,
  Message,
  DirectMessageChannel,
  UnreadInfo,
  ContextMenuState,
  Notification,
} from '@/types'

interface NavEntry {
  viewMode: 'server' | 'dm' | 'home' | 'discover' | 'friends'
  activeServerId: string | null
  activeChannelId: string | null
  activeDMChannelId: string | null
}

interface AppState {
  // Active navigation
  activeServerId: string | null
  activeChannelId: string | null
  activeDMChannelId: string | null
  viewMode: 'server' | 'dm' | 'home' | 'discover' | 'friends'
  navHistory: NavEntry[]
  navFuture: NavEntry[]

  // Cached data
  servers: Record<string, Server>
  channels: Record<string, Channel[]>
  members: Record<string, ServerMember[]>
  roles: Record<string, Role[]>
  users: Record<string, User>
  messages: Record<string, Message[]>
  dmChannels: DirectMessageChannel[]

  // UI state
  unreadInfo: Record<string, UnreadInfo>
  typingUsers: Record<string, { userId: string; username: string }[]>
  contextMenu: ContextMenuState
  isMemberListOpen: boolean
  isSearchOpen: boolean
  isSettingsOpen: boolean
  settingsTab: string
  serverSettingsId: string | null
  userProfileId: string | null
  rightPanelWidth: number
  openPanel: 'threads' | 'ai' | 'analytics' | 'events' | 'pinned' | null
  isCreateCommunityOpen: boolean
  isJoinServerOpen: boolean
  isMobileSidebarOpen: boolean

  // Online presence
  presences: Record<string, 'online' | 'idle' | 'dnd' | 'offline'>

  // Notifications
  notifications: Notification[]
  isNotificationsPanelOpen: boolean

  // Tutorial
  showTutorial: boolean
}

interface AppActions {
  // Navigation
  setActiveServer: (serverId: string | null) => void
  setActiveChannel: (channelId: string | null) => void
  setActiveDMChannel: (dmChannelId: string | null) => void
  setViewMode: (mode: 'server' | 'dm' | 'home' | 'discover' | 'friends') => void
  goBack: () => void
  goForward: () => void

  // Server actions
  addServer: (server: Server) => void
  updateServer: (serverId: string, updates: Partial<Server>) => void
  removeServer: (serverId: string) => void
  setServers: (servers: Server[]) => void

  // Channel actions
  setChannels: (serverId: string, channels: Channel[]) => void
  addChannel: (serverId: string, channel: Channel) => void
  updateChannel: (serverId: string, channelId: string, updates: Partial<Channel>) => void
  removeChannel: (serverId: string, channelId: string) => void

  // Member actions
  setMembers: (serverId: string, members: ServerMember[]) => void
  updateMember: (serverId: string, userId: string, updates: Partial<ServerMember>) => void

  // Role actions
  setRoles: (serverId: string, roles: Role[]) => void

  // User cache
  setUser: (user: User) => void
  setUsers: (users: User[]) => void

  // Messages
  setMessages: (channelId: string, messages: Message[]) => void
  prependMessages: (channelId: string, messages: Message[]) => void
  addMessage: (channelId: string, message: Message) => void
  updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void
  removeMessage: (channelId: string, messageId: string) => void

  // DM channels
  setDMChannels: (channels: DirectMessageChannel[]) => void
  upsertDMChannel: (channel: DirectMessageChannel) => void

  // Unread
  setUnread: (channelId: string, info: UnreadInfo) => void
  markRead: (channelId: string) => void
  incrementUnread: (channelId: string, hasMention: boolean) => void

  // Typing
  setTypingUsers: (channelId: string, users: { userId: string; username: string }[]) => void

  // Context menu
  showContextMenu: (state: Omit<ContextMenuState, 'visible'>) => void
  hideContextMenu: () => void

  // UI toggles
  setMemberListOpen: (open: boolean) => void
  toggleMemberList: () => void
  setSearchOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean, tab?: string) => void
  setServerSettingsId: (id: string | null) => void
  setUserProfileId: (id: string | null) => void
  togglePanel: (panel: 'threads' | 'ai' | 'analytics' | 'events' | 'pinned') => void
  closePanel: () => void
  openCreateCommunity: () => void
  closeCreateCommunity: () => void
  openJoinServer: () => void
  closeJoinServer: () => void
  openMobileSidebar: () => void
  closeMobileSidebar: () => void

  // Presence
  setPresence: (userId: string, status: 'online' | 'idle' | 'dnd' | 'offline') => void
  setPresences: (presences: Record<string, 'online' | 'idle' | 'dnd' | 'offline'>) => void

  // Notifications
  setNotifications: (notifications: Notification[]) => void
  markNotificationReadLocal: (id: string) => void
  markAllNotificationsReadLocal: () => void
  deleteNotificationLocal: (id: string) => void
  clearAllNotificationsLocal: () => void
  toggleNotificationsPanel: () => void
  closeNotificationsPanel: () => void

  // Tutorial
  setShowTutorial: (show: boolean) => void
}

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    activeServerId: null,
    activeChannelId: null,
    activeDMChannelId: null,
    viewMode: 'home',
    navHistory: [],
    navFuture: [],
    servers: {},
    channels: {},
    members: {},
    roles: {},
    users: {},
    messages: {},
    dmChannels: [],
    unreadInfo: {},
    typingUsers: {},
    contextMenu: { visible: false, x: 0, y: 0, targetType: null, targetId: null },
    isMemberListOpen: true,
    openPanel: null,
    isCreateCommunityOpen: false,
    isJoinServerOpen: false,
    isMobileSidebarOpen: false,
    isSearchOpen: false,
    notifications: [],
    isNotificationsPanelOpen: false,
    showTutorial: false,
    isSettingsOpen: false,
    settingsTab: 'my-account',
    serverSettingsId: null,
    userProfileId: null,
    rightPanelWidth: 240,
    presences: {},

    // Navigation
    setActiveServer: serverId => set({ activeServerId: serverId, activeChannelId: null }),
    setActiveChannel: channelId => set(s => {
      const current: NavEntry = { viewMode: s.viewMode, activeServerId: s.activeServerId, activeChannelId: s.activeChannelId, activeDMChannelId: s.activeDMChannelId }
      return { activeChannelId: channelId, activeDMChannelId: null, viewMode: 'server', isMobileSidebarOpen: false, navHistory: [...s.navHistory, current].slice(-50), navFuture: [] }
    }),
    setActiveDMChannel: dmChannelId => set(s => {
      const current: NavEntry = { viewMode: s.viewMode, activeServerId: s.activeServerId, activeChannelId: s.activeChannelId, activeDMChannelId: s.activeDMChannelId }
      return { activeDMChannelId: dmChannelId, activeChannelId: null, viewMode: 'dm', isMobileSidebarOpen: false, navHistory: [...s.navHistory, current].slice(-50), navFuture: [] }
    }),
    setViewMode: mode => set(s => {
      const current: NavEntry = { viewMode: s.viewMode, activeServerId: s.activeServerId, activeChannelId: s.activeChannelId, activeDMChannelId: s.activeDMChannelId }
      return { viewMode: mode, navHistory: [...s.navHistory, current].slice(-50), navFuture: [] }
    }),
    goBack: () => set(s => {
      if (s.navHistory.length === 0) return s
      const prev = s.navHistory[s.navHistory.length - 1]
      const current: NavEntry = { viewMode: s.viewMode, activeServerId: s.activeServerId, activeChannelId: s.activeChannelId, activeDMChannelId: s.activeDMChannelId }
      return { ...prev, navHistory: s.navHistory.slice(0, -1), navFuture: [current, ...s.navFuture].slice(0, 50) }
    }),
    goForward: () => set(s => {
      if (s.navFuture.length === 0) return s
      const next = s.navFuture[0]
      const current: NavEntry = { viewMode: s.viewMode, activeServerId: s.activeServerId, activeChannelId: s.activeChannelId, activeDMChannelId: s.activeDMChannelId }
      return { ...next, navFuture: s.navFuture.slice(1), navHistory: [...s.navHistory, current].slice(-50) }
    }),

    // Server
    addServer: server => set(s => ({ servers: { ...s.servers, [server.id]: server } })),
    updateServer: (serverId, updates) =>
      set(s => ({
        servers: { ...s.servers, [serverId]: { ...s.servers[serverId], ...updates } },
      })),
    removeServer: serverId =>
      set(s => {
        const { [serverId]: _, ...rest } = s.servers
        return { servers: rest, activeServerId: s.activeServerId === serverId ? null : s.activeServerId }
      }),
    setServers: servers =>
      set({ servers: Object.fromEntries(servers.map(s => [s.id, s])) }),

    // Channels
    setChannels: (serverId, channels) =>
      set(s => ({ channels: { ...s.channels, [serverId]: channels } })),
    addChannel: (serverId, channel) =>
      set(s => ({
        channels: { ...s.channels, [serverId]: [...(s.channels[serverId] ?? []), channel] },
      })),
    updateChannel: (serverId, channelId, updates) =>
      set(s => ({
        channels: {
          ...s.channels,
          [serverId]: (s.channels[serverId] ?? []).map(c =>
            c.id === channelId ? { ...c, ...updates } : c
          ),
        },
      })),
    removeChannel: (serverId, channelId) =>
      set(s => ({
        channels: {
          ...s.channels,
          [serverId]: (s.channels[serverId] ?? []).filter(c => c.id !== channelId),
        },
      })),

    // Members
    setMembers: (serverId, members) =>
      set(s => ({ members: { ...s.members, [serverId]: members } })),
    updateMember: (serverId, userId, updates) =>
      set(s => ({
        members: {
          ...s.members,
          [serverId]: (s.members[serverId] ?? []).map(m =>
            m.userId === userId ? { ...m, ...updates } : m
          ),
        },
      })),

    // Roles
    setRoles: (serverId, roles) =>
      set(s => ({ roles: { ...s.roles, [serverId]: roles } })),

    // Users
    setUser: user => set(s => ({ users: { ...s.users, [user.uid]: user } })),
    setUsers: users =>
      set(s => ({
        users: { ...s.users, ...Object.fromEntries(users.map(u => [u.uid, u])) },
      })),

    // Messages
    setMessages: (channelId, messages) =>
      set(s => ({ messages: { ...s.messages, [channelId]: messages } })),
    prependMessages: (channelId, messages) =>
      set(s => ({
        messages: { ...s.messages, [channelId]: [...messages, ...(s.messages[channelId] ?? [])] },
      })),
    addMessage: (channelId, message) =>
      set(s => ({
        messages: { ...s.messages, [channelId]: [...(s.messages[channelId] ?? []), message] },
      })),
    updateMessage: (channelId, messageId, updates) =>
      set(s => ({
        messages: {
          ...s.messages,
          [channelId]: (s.messages[channelId] ?? []).map(m =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        },
      })),
    removeMessage: (channelId, messageId) =>
      set(s => ({
        messages: {
          ...s.messages,
          [channelId]: (s.messages[channelId] ?? []).filter(m => m.id !== messageId),
        },
      })),

    // DM channels
    setDMChannels: channels => set({ dmChannels: channels }),
    upsertDMChannel: channel =>
      set(s => {
        const exists = s.dmChannels.some(c => c.id === channel.id)
        return {
          dmChannels: exists
            ? s.dmChannels.map(c => (c.id === channel.id ? channel : c))
            : [channel, ...s.dmChannels],
        }
      }),

    // Unread
    setUnread: (channelId, info) =>
      set(s => ({ unreadInfo: { ...s.unreadInfo, [channelId]: info } })),
    markRead: channelId =>
      set(s => {
        const { [channelId]: _, ...rest } = s.unreadInfo
        return { unreadInfo: rest }
      }),
    incrementUnread: (channelId, hasMention) =>
      set(s => {
        const current = s.unreadInfo[channelId] ?? { channelId, count: 0, hasMention: false, lastReadMessageId: null }
        return {
          unreadInfo: {
            ...s.unreadInfo,
            [channelId]: { ...current, count: current.count + 1, hasMention: current.hasMention || hasMention },
          },
        }
      }),

    // Typing
    setTypingUsers: (channelId, users) =>
      set(s => ({ typingUsers: { ...s.typingUsers, [channelId]: users } })),

    // Context menu
    showContextMenu: state => set({ contextMenu: { ...state, visible: true } }),
    hideContextMenu: () => set({ contextMenu: { visible: false, x: 0, y: 0, targetType: null, targetId: null } }),

    // UI
    setMemberListOpen: open => set({ isMemberListOpen: open }),
    toggleMemberList: () => set(s => ({ isMemberListOpen: !s.isMemberListOpen })),
    setSearchOpen: open => set({ isSearchOpen: open }),
    setSettingsOpen: (open, tab) => set({ isSettingsOpen: open, settingsTab: tab ?? 'my-account' }),
    setServerSettingsId: id => set({ serverSettingsId: id }),
    setUserProfileId: id => set({ userProfileId: id }),
    togglePanel: panel => set(s => ({ openPanel: s.openPanel === panel ? null : panel })),
    closePanel: () => set({ openPanel: null }),
    openCreateCommunity: () => set({ isCreateCommunityOpen: true }),
    closeCreateCommunity: () => set({ isCreateCommunityOpen: false }),
    openJoinServer: () => set({ isJoinServerOpen: true }),
    closeJoinServer: () => set({ isJoinServerOpen: false }),
    openMobileSidebar: () => set({ isMobileSidebarOpen: true }),
    closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),

    // Presence
    setPresence: (userId, status) =>
      set(s => ({ presences: { ...s.presences, [userId]: status } })),
    setPresences: presences => set(s => ({ presences: { ...s.presences, ...presences } })),

    // Notifications
    setNotifications: notifications => set({ notifications }),
    markNotificationReadLocal: id => set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
    })),
    markAllNotificationsReadLocal: () => set(s => ({
      notifications: s.notifications.map(n => ({ ...n, isRead: true })),
    })),
    deleteNotificationLocal: id => set(s => ({
      notifications: s.notifications.filter(n => n.id !== id),
    })),
    clearAllNotificationsLocal: () => set({ notifications: [] }),
    toggleNotificationsPanel: () => set(s => ({ isNotificationsPanelOpen: !s.isNotificationsPanelOpen })),
    closeNotificationsPanel: () => set({ isNotificationsPanelOpen: false }),

    // Tutorial
    setShowTutorial: show => set({ showTutorial: show }),
  }))
)

// Convenience selectors
export const selectActiveServer = (state: AppState) =>
  state.activeServerId ? state.servers[state.activeServerId] : null

export const selectActiveChannels = (state: AppState) =>
  state.activeServerId ? (state.channels[state.activeServerId] ?? []) : []

export const selectActiveMembers = (state: AppState) =>
  state.activeServerId ? (state.members[state.activeServerId] ?? []) : []

export const selectActiveRoles = (state: AppState) =>
  state.activeServerId ? (state.roles[state.activeServerId] ?? []) : []

export const selectActiveMessages = (state: AppState) =>
  state.activeChannelId ? (state.messages[state.activeChannelId] ?? []) : []

export const selectTotalUnreadCount = (state: AppState) =>
  Object.values(state.unreadInfo).reduce((sum, u) => sum + u.count, 0)
