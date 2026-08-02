import { Timestamp } from 'firebase/firestore'

// ─── Threads ─────────────────────────────────────────────────────────────────

export interface Thread {
  id: string
  channelId: string
  serverId: string
  parentMessageId: string
  title: string
  createdBy: string
  createdAt: Timestamp
  lastReplyAt: Timestamp | null
  replyCount: number
  participantIds: string[]
  isResolved: boolean
  resolvedBy: string | null
  resolvedAt: Timestamp | null
  summary: string | null
  tags: string[]
}

export interface ThreadMessage {
  id: string
  threadId: string
  channelId: string
  serverId: string
  authorId: string
  content: string
  parentId: string | null
  depth: number
  replyCount: number
  createdAt: Timestamp
  editedAt: Timestamp | null
  isEdited: boolean
  reactions: Record<string, { count: number; userIds: string[] }>
}

// ─── Voice Messages ───────────────────────────────────────────────────────────

export interface VoiceMessage {
  id: string
  channelId: string
  serverId: string | null
  dmChannelId: string | null
  authorId: string
  audioUrl: string
  duration: number
  waveform: number[]
  transcript: string | null
  transcriptStatus: 'pending' | 'processing' | 'done' | 'failed'
  createdAt: Timestamp
  playCount: number
}

// ─── Summaries ────────────────────────────────────────────────────────────────

export type SummaryPeriod = 'daily' | 'weekly' | 'monthly'

export interface ChannelSummary {
  id: string
  channelId: string
  serverId: string
  period: SummaryPeriod
  periodStart: Timestamp
  periodEnd: Timestamp
  keyTopics: string[]
  importantDecisions: string[]
  popularMessages: string[]
  trendingDiscussions: string[]
  participantCount: number
  messageCount: number
  summary: string
  generatedAt: Timestamp
  generatedBy: 'ai' | 'manual'
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export type KnowledgeBaseItemType = 'guide' | 'faq' | 'documentation' | 'tutorial' | 'announcement'

export interface KnowledgeBaseItem {
  id: string
  serverId: string
  title: string
  content: string
  type: KnowledgeBaseItemType
  tags: string[]
  sourceMessageIds: string[]
  sourceChannelId: string | null
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  isAIGenerated: boolean
  views: number
  helpful: number
  notHelpful: number
  embedding: number[] | null
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type EventStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'

export interface CommunityEvent {
  id: string
  serverId: string
  channelId: string | null
  title: string
  description: string
  coverUrl: string | null
  createdBy: string
  startTime: Timestamp
  endTime: Timestamp | null
  status: EventStatus
  maxAttendees: number | null
  attendeeIds: string[]
  interestedIds: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
  isRecurring: boolean
  recurrenceRule: string | null
  reminderSent: boolean
  tags: string[]
}

// ─── Polls ────────────────────────────────────────────────────────────────────

export type PollType = 'single' | 'multiple' | 'ranked' | 'anonymous'

export interface Poll {
  id: string
  channelId: string
  serverId: string
  messageId: string | null
  question: string
  options: PollOption[]
  type: PollType
  createdBy: string
  createdAt: Timestamp
  endsAt: Timestamp | null
  isActive: boolean
  allowRevote: boolean
  showResultsBeforeEnd: boolean
  totalVotes: number
  voterIds: string[]
}

export interface PollOption {
  id: string
  text: string
  votes: number
  voterIds: string[]
}

// ─── Gamification ─────────────────────────────────────────────────────────────

export interface UserXP {
  userId: string
  serverId: string
  xp: number
  level: number
  totalMessages: number
  totalReactions: number
  totalVoiceMinutes: number
  streak: number
  lastActiveAt: Timestamp
  badges: string[]
  rank: number | null
}

export type BadgeType =
  | 'first_message'
  | 'helpful'
  | 'contributor'
  | 'veteran'
  | 'moderator'
  | 'event_host'
  | 'poll_creator'
  | 'thread_starter'
  | 'voice_star'
  | 'streak_7'
  | 'streak_30'
  | 'early_adopter'
  | 'custom'

export interface Badge {
  id: string
  serverId: string | null
  name: string
  description: string
  iconUrl: string | null
  emoji: string
  type: BadgeType
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  xpReward: number
  isAutomatic: boolean
  condition: string | null
  createdAt: Timestamp
}

export interface Achievement {
  id: string
  userId: string
  serverId: string | null
  badgeId: string
  unlockedAt: Timestamp
  progress: number
  goal: number
}

// ─── Friends ─────────────────────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export interface Friendship {
  id: string
  requesterId: string
  receiverId: string
  status: FriendshipStatus
  createdAt: Timestamp
  updatedAt: Timestamp
  mutualServerIds: string[]
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface ServerAnalytics {
  id: string
  serverId: string
  date: Timestamp
  dau: number
  mau: number
  newMembers: number
  activeUserIds: string[]
  totalMessages: number
  activeChannels: string[]
  topContributors: { userId: string; messageCount: number }[]
  retention7d: number
  retention30d: number
  messageVelocity: number
  peakHour: number
  channelBreakdown: Record<string, number>
}

export interface CommunityHealth {
  id: string
  serverId: string
  score: number
  toxicityScore: number
  participationScore: number
  retentionScore: number
  growthScore: number
  moderationScore: number
  recommendations: string[]
  calculatedAt: Timestamp
  trend: 'improving' | 'stable' | 'declining'
}

// ─── AI Agents ────────────────────────────────────────────────────────────────

export type AICommandType = 'ask' | 'summarize' | 'explain' | 'faq' | 'announce' | 'onboard' | 'notes'

export interface AIInteraction {
  id: string
  serverId: string
  channelId: string
  userId: string
  command: AICommandType
  input: string
  output: string
  context: string[]
  createdAt: Timestamp
  helpful: boolean | null
  tokens: number
}

export interface AIAgentConfig {
  id: string
  serverId: string
  name: string
  personality: string
  systemPrompt: string
  isEnabled: boolean
  allowedChannels: string[]
  commands: AICommandType[]
  createdBy: string
  createdAt: Timestamp
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

export type PluginType = 'bot' | 'theme' | 'widget' | 'ai_agent'
export type PluginStatus = 'active' | 'disabled' | 'pending'

export interface MarketplacePlugin {
  id: string
  name: string
  description: string
  longDescription: string
  iconUrl: string | null
  screenshotUrls: string[]
  authorId: string
  authorName: string
  type: PluginType
  category: string
  tags: string[]
  installCount: number
  rating: number
  reviewCount: number
  price: number
  isVerified: boolean
  isFeatured: boolean
  version: string
  lastUpdated: Timestamp
  createdAt: Timestamp
  permissions: string[]
  webhookUrl: string | null
}

export interface ServerPlugin {
  id: string
  serverId: string
  pluginId: string
  status: PluginStatus
  installedBy: string
  installedAt: Timestamp
  config: Record<string, unknown>
}

// ─── Smart Notifications ──────────────────────────────────────────────────────

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low' | 'muted'

export interface SmartNotification {
  id: string
  userId: string
  type: string
  title: string
  body: string
  iconUrl: string | null
  channelId: string | null
  serverId: string | null
  messageId: string | null
  fromUserId: string | null
  priority: NotificationPriority
  isRead: boolean
  isAIFiltered: boolean
  aiReason: string | null
  groupKey: string | null
  createdAt: Timestamp
  expiresAt: Timestamp | null
}

export interface NotificationFilter {
  id: string
  userId: string
  rule: string
  priority: NotificationPriority
  isActive: boolean
  createdAt: Timestamp
}

// ─── Discover ─────────────────────────────────────────────────────────────────

export interface ServerListing {
  id: string
  serverId: string
  name: string
  description: string
  iconUrl: string | null
  bannerUrl: string | null
  memberCount: number
  onlineCount: number
  category: string
  tags: string[]
  language: string
  isFeatured: boolean
  isVerified: boolean
  boostLevel: number
  inviteCode: string
  weeklyGrowth: number
  engagementScore: number
  isPaid?: boolean
  priceAmount?: number | null
  priceCurrency?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Moderation AI ────────────────────────────────────────────────────────────

export type ModerationRiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical'
export type ModerationCategory = 'spam' | 'harassment' | 'toxicity' | 'hate_speech' | 'scam' | 'nsfw' | 'clean'

export interface AIModeration {
  id: string
  messageId: string
  channelId: string
  serverId: string
  authorId: string
  content: string
  riskLevel: ModerationRiskLevel
  categories: ModerationCategory[]
  confidence: number
  autoAction: 'none' | 'warn' | 'delete' | 'timeout' | 'flag'
  actionTaken: boolean
  reviewedBy: string | null
  reviewedAt: Timestamp | null
  createdAt: Timestamp
}

// ─── Screen Share / Voice Rooms ───────────────────────────────────────────────

export interface VoiceRoom {
  id: string
  channelId: string
  serverId: string
  participants: VoiceParticipant[]
  isLive: boolean
  startedAt: Timestamp | null
  endedAt: Timestamp | null
  recordingUrl: string | null
  transcript: string | null
  meetingNotes: string | null
}

export interface VoiceParticipant {
  userId: string
  joinedAt: Timestamp
  leftAt: Timestamp | null
  isMuted: boolean
  isDeafened: boolean
  isSpeaking: boolean
  isSharingScreen: boolean
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface OnboardingFlow {
  id: string
  serverId: string
  userId: string
  status: 'pending' | 'in_progress' | 'completed'
  steps: OnboardingStep[]
  currentStep: number
  aiGreeting: string | null
  suggestedChannels: string[]
  suggestedUsers: string[]
  startedAt: Timestamp
  completedAt: Timestamp | null
}

export interface OnboardingStep {
  id: string
  title: string
  description: string
  type: 'read' | 'react' | 'post' | 'visit' | 'follow'
  targetId: string | null
  isCompleted: boolean
  completedAt: Timestamp | null
}
