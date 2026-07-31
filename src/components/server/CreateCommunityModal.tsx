import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  X, ChevronLeft, ChevronRight, Check, Upload, Camera,
  Globe, Lock, Link, Sparkles, Mic, BarChart2, CalendarDays,
  MessageSquare, Trophy, Plus, Trash2, Users, Zap,
  Compass, Search, ArrowRight,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useServers } from '@/hooks/useServer'
import { useAppStore } from '@/store/useAppStore'
import { validateImageFile } from '@/services/storage.service'
import { uploadServerIcon, uploadServerBanner } from '@/services/storage.service'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from '@/hooks/useAuth'
import { getTrendingServers, getFeaturedServers } from '@/services/discover.service'
import { joinServer } from '@/services/server.service'
import type { ServerListing } from '@/types/extended'
import toast from 'react-hot-toast'

// ─── Template definitions ─────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'gaming', label: 'Gaming', icon: '🎮',
    description: 'Tournaments, voice channels, and game discussion',
    color: '#ef4444',
    channels: ['general', 'looking-for-group', 'game-clips', 'strategy', 'off-topic'],
    features: ['voice', 'events', 'leaderboard'],
    rules: ['Be respectful to all members', 'No cheating or exploits', 'Keep spoilers tagged', 'English only in main channels'],
  },
  {
    id: 'creative', label: 'Creative', icon: '🎨',
    description: 'Share art, music, writing, and collaborate',
    color: '#eb459e',
    channels: ['general', 'showcase', 'feedback', 'wip', 'resources'],
    features: ['threads', 'ai'],
    rules: ['Credit original artists', 'Constructive feedback only', 'No art theft', 'Tag NSFW content'],
  },
  {
    id: 'social', label: 'Social', icon: '💬',
    description: 'A place to hang out and meet people',
    color: '#3ba55c',
    channels: ['general', 'introductions', 'memes', 'events', 'venting'],
    features: ['events', 'polls', 'leaderboard'],
    rules: ['Be kind and inclusive', 'No hate speech', 'Keep it fun', 'Respect privacy'],
  },
  {
    id: 'education', label: 'Education', icon: '📚',
    description: 'Study together, share resources, and learn',
    color: '#faa61a',
    channels: ['general', 'resources', 'study-room', 'q-and-a', 'announcements'],
    features: ['threads', 'ai', 'analytics'],
    rules: ['Academic integrity is required', 'Cite your sources', 'Help each other', 'Stay on topic'],
  },
  {
    id: 'music', label: 'Music', icon: '🎵',
    description: 'Share music, collaborate, and get feedback',
    color: '#ed4245',
    channels: ['general', 'releases', 'collab', 'feedback', 'playlists'],
    features: ['voice', 'threads'],
    rules: ['Respect all genres', 'Credit your collaborators', 'No piracy', 'Constructive criticism only'],
  },
  {
    id: 'tech', label: 'Technology', icon: '💻',
    description: 'Build, discuss, and collaborate on projects',
    color: '#00b0f4',
    channels: ['general', 'projects', 'help', 'code-review', 'jobs'],
    features: ['threads', 'ai', 'analytics'],
    rules: ['Share knowledge freely', 'No spam or self-promo spam', 'Be patient with beginners', 'Use code blocks'],
  },
  {
    id: 'business', label: 'Business', icon: '💼',
    description: 'Networking, growth, and professional development',
    color: '#9b59b6',
    channels: ['general', 'networking', 'resources', 'jobs', 'announcements'],
    features: ['events', 'analytics', 'polls'],
    rules: ['Professional conduct at all times', 'No spam', 'Verify credentials', 'Respect NDAs'],
  },
  {
    id: 'science', label: 'Science', icon: '🔬',
    description: 'Research, experiments, and scientific discussion',
    color: '#1abc9c',
    channels: ['general', 'research', 'papers', 'q-and-a', 'off-topic'],
    features: ['threads', 'ai', 'analytics'],
    rules: ['Cite your sources', 'Be evidence-based', 'Respectful debate only', 'No pseudoscience'],
  },
  {
    id: 'debates', label: 'Debates', icon: '🗣️',
    description: 'Structured discussion and healthy disagreement',
    color: '#e67e22',
    channels: ['general', 'debate-topics', 'rules-and-format', 'off-topic'],
    features: ['threads', 'events'],
    rules: ['Attack ideas, not people', 'No personal insults or name-calling', 'Cite sources when you can', 'Stay on topic'],
  },
  {
    id: 'politics', label: 'Politics', icon: '🏛️',
    description: 'Discuss policy and current events — all viewpoints welcome',
    color: '#607d8b',
    channels: ['general', 'current-events', 'policy-discussion', 'off-topic'],
    features: ['threads', 'events'],
    rules: ['Be respectful of differing views', 'No personal attacks or harassment', 'Focus on policy, not partisanship', 'Cite credible sources'],
  },
  {
    id: 'custom', label: 'Custom', icon: '✨',
    description: 'Build from scratch with full control',
    color: '#ef4444',
    channels: ['general'],
    features: [],
    rules: ['Be respectful', 'Follow the rules', 'Have fun'],
  },
]

const FEATURE_OPTIONS = [
  { id: 'threads', label: 'Threads', icon: MessageSquare, description: 'Organised topic threads' },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles, description: 'Claude AI summaries & commands' },
  { id: 'events', label: 'Events & Polls', icon: CalendarDays, description: 'Community events and voting' },
  { id: 'voice', label: 'Voice', icon: Mic, description: 'Voice rooms and audio' },
  { id: 'analytics', label: 'Analytics', icon: BarChart2, description: 'Growth and activity insights' },
  { id: 'leaderboard', label: 'XP & Ranks', icon: Trophy, description: 'Gamification and leaderboards' },
]

const ACCENT_COLORS = [
  '#ef4444', '#eb459e', '#3ba55c', '#faa61a',
  '#ed4245', '#00b0f4', '#9b59b6', '#e67e22',
  '#1abc9c', '#e74c3c', '#3498db', '#f39c12',
]

type Privacy = 'public' | 'private' | 'invite'
type Step = 'template' | 'identity' | 'features' | 'rules' | 'done'
type ModalMode = 'create' | 'browse'
const STEPS: Step[] = ['template', 'identity', 'features', 'rules', 'done']

interface CommunityForm {
  template: string
  name: string
  description: string
  accentColor: string
  privacy: Privacy
  ageRestricted: boolean
  features: string[]
  channels: string[]
  rules: string[]
  iconFile: File | null
  iconPreview: string | null
  bannerFile: File | null
  bannerPreview: string | null
}

interface CreateCommunityModalProps {
  open: boolean
  onClose: () => void
}

export function CreateCommunityModal({ open, onClose }: CreateCommunityModalProps) {
  const { create } = useServers()
  const { setActiveServer, setViewMode } = useAppStore()
  const { user } = useAuth()
  const [mode, setMode] = useState<ModalMode>('create')
  const [step, setStep] = useState<Step>('template')
  const [loading, setLoading] = useState(false)
  const [createdInviteCode, setCreatedInviteCode] = useState('')
  const [form, setForm] = useState<CommunityForm>({
    template: '',
    name: '',
    description: '',
    accentColor: '#ef4444',
    privacy: 'public',
    ageRestricted: false,
    features: [],
    channels: ['general'],
    rules: ['Be respectful to all members', 'No harassment or hate speech'],
    iconFile: null,
    iconPreview: null,
    bannerFile: null,
    bannerPreview: null,
  })
  const newRuleRef = useRef<HTMLInputElement>(null)

  const update = (patch: Partial<CommunityForm>) => setForm(f => ({ ...f, ...patch }))

  const onIconDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) { toast.error(err); return }
    update({ iconFile: file, iconPreview: URL.createObjectURL(file) })
  }, [])

  const onBannerDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) { toast.error(err); return }
    update({ bannerFile: file, bannerPreview: URL.createObjectURL(file) })
  }, [])

  const { getRootProps: getIconProps, getInputProps: getIconInput } = useDropzone({
    onDrop: onIconDrop, accept: { 'image/*': [] }, maxFiles: 1,
  })
  const { getRootProps: getBannerProps, getInputProps: getBannerInput } = useDropzone({
    onDrop: onBannerDrop, accept: { 'image/*': [] }, maxFiles: 1,
  })

  const selectTemplate = (t: typeof TEMPLATES[0]) => {
    update({
      template: t.id,
      accentColor: t.color,
      features: [...t.features],
      channels: [...t.channels],
      rules: [...t.rules],
    })
    setStep('identity')
  }

  const stepIndex = STEPS.indexOf(step)
  const canNext = step === 'identity' ? form.name.trim().length >= 2 : true

  const goNext = () => {
    const next = STEPS[stepIndex + 1]
    if (next) setStep(next)
  }
  const goBack = () => {
    if (step === 'template') { handleClose(); return }
    const prev = STEPS[stepIndex - 1]
    if (prev) setStep(prev)
  }

  const handleClose = () => {
    setStep('template')
    setMode('create')
    setForm({
      template: '', name: '', description: '', accentColor: '#ef4444',
      privacy: 'public', ageRestricted: false,
      features: [], channels: ['general'],
      rules: ['Be respectful to all members', 'No harassment or hate speech'],
      iconFile: null, iconPreview: null, bannerFile: null, bannerPreview: null,
    })
    setCreatedInviteCode('')
    onClose()
  }

  // Map template IDs to the SERVER_CATEGORIES IDs used in serverListings
  const TEMPLATE_TO_CATEGORY: Record<string, string> = {
    gaming: 'gaming',
    creative: 'creative',
    social: 'social',
    education: 'education',
    music: 'music',
    tech: 'technology',
    business: 'business',
    science: 'science',
    debates: 'debates',
    politics: 'politics',
    custom: 'custom',
  }

  const handleCreate = async () => {
    if (!user || !form.name.trim()) return
    setLoading(true)
    try {
      const server = await create(form.name.trim(), form.iconFile ?? undefined, form.privacy === 'public')

      // Upload banner if provided
      let bannerUrl: string | null = null
      if (form.bannerFile) {
        bannerUrl = await uploadServerBanner(server.id, form.bannerFile)
      }

      // Write extended community settings
      await setDoc(doc(db, 'communitySettings', server.id), {
        serverId: server.id,
        description: form.description,
        accentColor: form.accentColor,
        privacy: form.privacy,
        ageRestricted: form.ageRestricted,
        features: form.features,
        bannerUrl,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true })

      // Write community rules
      await setDoc(doc(db, 'communityRules', server.id), {
        serverId: server.id,
        rules: form.rules.map((text, i) => ({ id: `rule_${i}`, text })),
        updatedAt: serverTimestamp(),
      })

      // Update serverListings with the real category, description, and banner
      if (form.privacy === 'public') {
        const category = TEMPLATE_TO_CATEGORY[form.template] ?? 'social'
        await updateDoc(doc(db, 'serverListings', server.id), {
          category,
          description: form.description || '',
          ...(bannerUrl && { bannerUrl }),
          updatedAt: serverTimestamp(),
        }).catch(() => {}) // listing might not exist yet — ignore
      }

      // Update server description, banner, and accent colour in the server doc —
      // the sidebar/header rendering reads Server.accentColor directly, not
      // communitySettings.accentColor, so this write is what actually makes
      // the chosen colour show up.
      await updateDoc(doc(db, 'servers', server.id), {
        accentColor: form.accentColor,
        ...(form.description && { description: form.description }),
        ...(bannerUrl && { bannerUrl }),
        updatedAt: serverTimestamp(),
      })

      // Get invite code from the listing
      const listingSnap = await import('firebase/firestore').then(({ getDoc }) =>
        getDoc(doc(db, 'serverListings', server.id))
      )
      const invCode = listingSnap.exists() ? (listingSnap.data().inviteCode as string) : ''
      setCreatedInviteCode(invCode)

      setActiveServer(server.id)
      setViewMode('server')
      setStep('done')
      toast.success(`"${server.name}" created!`)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to create community')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const showModeToggle = mode === 'browse' || step === 'template'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={mode === 'browse' ? handleClose : (step !== 'done' ? goBack : handleClose)}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'relative w-full bg-pulse-bg-secondary rounded-2xl shadow-elevation-high overflow-hidden',
          mode === 'browse' ? 'max-w-3xl' : 'max-w-2xl'
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Mode toggle header */}
        {showModeToggle && (
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            <div className="flex items-center gap-1 p-1 bg-pulse-bg-primary rounded-xl">
              <button
                onClick={() => setMode('create')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all',
                  mode === 'create'
                    ? 'bg-pulse-brand text-white shadow'
                    : 'text-pulse-text-muted hover:text-pulse-text-normal'
                )}
              >
                <Plus size={14} /> Create New
              </button>
              <button
                onClick={() => setMode('browse')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all',
                  mode === 'browse'
                    ? 'bg-pulse-brand text-white shadow'
                    : 'text-pulse-text-muted hover:text-pulse-text-normal'
                )}
              >
                <Compass size={14} /> Browse & Join
              </button>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'browse' ? (
            <motion.div
              key="browse"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              <BrowseCommunitiesPanel
                onJoined={(serverId) => {
                  setActiveServer(serverId)
                  setViewMode('server')
                  handleClose()
                }}
              />
            </motion.div>
          ) : (
            <motion.div key="create">
              {/* Create wizard header (non-template steps) */}
              {step !== 'template' && step !== 'done' && (
                <div className="flex items-center justify-between px-6 pt-5 pb-0">
                  <button
                    onClick={goBack}
                    className="p-1.5 rounded-lg text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/5 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {STEPS.slice(1, -1).map((s, i) => (
                      <div
                        key={s}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-300',
                          i < stepIndex - 1 ? 'w-6 bg-pulse-brand' :
                          i === stepIndex - 1 ? 'w-10 bg-pulse-brand' :
                          'w-6 bg-white/10'
                        )}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/5 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                >
                  {step === 'template' && <TemplateStep onSelect={selectTemplate} />}
                  {step === 'identity' && <IdentityStep form={form} update={update} getIconProps={getIconProps} getIconInput={getIconInput} getBannerProps={getBannerProps} getBannerInput={getBannerInput} />}
                  {step === 'features' && <FeaturesStep form={form} update={update} />}
                  {step === 'rules' && <RulesStep form={form} update={update} newRuleRef={newRuleRef} />}
                  {step === 'done' && <DoneStep name={form.name} inviteCode={createdInviteCode} onClose={handleClose} />}
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              {step !== 'template' && step !== 'done' && (
                <div className="flex items-center justify-between px-6 pb-6 pt-2">
                  <span className="text-xs text-pulse-text-muted">
                    Step {stepIndex} of {STEPS.length - 2}
                  </span>
                  {step === 'rules' ? (
                    <button
                      onClick={handleCreate}
                      disabled={loading || !form.name.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Zap size={15} />
                      )}
                      {loading ? 'Creating...' : 'Create Community'}
                    </button>
                  ) : (
                    <button
                      onClick={goNext}
                      disabled={!canNext}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm"
                    >
                      Continue
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─── Browse & Join Panel ─────────────────────────────────────────────────────

function BrowseCommunitiesPanel({ onJoined }: { onJoined: (serverId: string) => void }) {
  const { user } = useAuth()
  const [servers, setServers] = useState<ServerListing[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [joiningId, setJoiningId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getFeaturedServers(6), getTrendingServers(12)])
      .then(([feat, trend]) => {
        const seen = new Set<string>()
        const merged: ServerListing[] = []
        for (const s of [...feat, ...trend]) {
          if (!seen.has(s.id)) { seen.add(s.id); merged.push(s) }
        }
        setServers(merged)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = query.trim()
    ? servers.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.description?.toLowerCase().includes(query.toLowerCase()))
    : servers

  const handleJoin = async (server: ServerListing) => {
    if (!user || !server.inviteCode) {
      toast.error('No invite link available for this community')
      return
    }
    setJoiningId(server.id)
    try {
      const joined = await joinServer(user.uid, server.inviteCode)
      toast.success(`Joined ${joined.name}!`)
      onJoined(joined.id)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to join community')
    } finally {
      setJoiningId(null)
    }
  }

  return (
    <div className="px-6 pb-6 pt-4">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-pulse-text-normal">Browse Communities</h2>
        <p className="text-pulse-text-muted text-sm mt-0.5">Find and join public communities</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-text-muted" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search communities..."
          className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-pulse-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Compass size={32} className="text-pulse-text-muted mx-auto mb-3" />
          <p className="text-pulse-text-muted text-sm">No communities found{query ? ` for "${query}"` : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
          {filtered.map(server => {
            const isJoining = joiningId === server.id
            return (
              <div
                key={server.id}
                className="bg-pulse-bg-primary rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all group"
              >
                {/* Banner */}
                <div className="h-16 relative">
                  {server.bannerUrl
                    ? <img src={server.bannerUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-pulse-brand/25 to-red-600/15" />
                  }
                </div>

                {/* Body */}
                <div className="p-3">
                  <div className="flex items-end gap-2 -mt-7 mb-2">
                    {server.iconUrl
                      ? <img src={server.iconUrl} alt="" className="w-10 h-10 rounded-xl border-2 border-pulse-bg-primary object-cover shrink-0" />
                      : (
                        <div className="w-10 h-10 rounded-xl bg-pulse-brand border-2 border-pulse-bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {server.name[0]}
                        </div>
                      )
                    }
                  </div>

                  <p className="text-sm font-semibold text-pulse-text-normal truncate">{server.name}</p>

                  {server.description && (
                    <p className="text-[11px] text-pulse-text-muted line-clamp-2 mt-0.5 mb-2 leading-relaxed">
                      {server.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-pulse-text-muted flex items-center gap-1">
                      <Users size={10} />{server.memberCount.toLocaleString()} members
                    </span>
                    <button
                      onClick={() => handleJoin(server)}
                      disabled={isJoining}
                      className="flex items-center gap-1 px-3 py-1.5 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {isJoining ? (
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Join <ArrowRight size={10} /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Step: Template ──────────────────────────────────────────────────────────

function TemplateStep({ onSelect }: { onSelect: (t: typeof TEMPLATES[0]) => void }) {
  return (
    <div className="px-6 py-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-pulse-text-normal">Create a Community</h2>
        <p className="text-pulse-text-muted text-sm mt-1">Choose a template to get started quickly</p>
      </div>
      <div className="grid grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-pulse-bg-primary border border-white/5 hover:border-pulse-brand/50 hover:bg-pulse-bg-elevated transition-all text-center"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${t.color}33, ${t.color}66)`, border: `1px solid ${t.color}44` }}
            >
              {t.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-pulse-text-normal">{t.label}</p>
              <p className="text-[10px] text-pulse-text-muted leading-tight mt-0.5 line-clamp-2">{t.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step: Identity ──────────────────────────────────────────────────────────

function IdentityStep({
  form, update, getIconProps, getIconInput, getBannerProps, getBannerInput,
}: {
  form: CommunityForm
  update: (p: Partial<CommunityForm>) => void
  getIconProps: ReturnType<typeof useDropzone>['getRootProps']
  getIconInput: ReturnType<typeof useDropzone>['getInputProps']
  getBannerProps: ReturnType<typeof useDropzone>['getRootProps']
  getBannerInput: ReturnType<typeof useDropzone>['getInputProps']
}) {
  return (
    <div className="px-6 pt-4 pb-0">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-pulse-text-normal">Community Identity</h2>
        <p className="text-pulse-text-muted text-sm mt-0.5">How will your community look and feel?</p>
      </div>

      {/* Banner */}
      <div
        {...getBannerProps()}
        className="relative h-28 rounded-xl overflow-hidden mb-4 cursor-pointer group border border-white/10 hover:border-pulse-brand/40 transition-colors"
        style={{ background: form.bannerPreview ? undefined : `linear-gradient(135deg, ${form.accentColor}33, ${form.accentColor}11)` }}
      >
        <input {...getBannerInput()} />
        {form.bannerPreview && <img src={form.bannerPreview} alt="Banner" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 text-white text-sm font-medium">
            <Upload size={16} /> Upload Banner
          </div>
        </div>
      </div>

      {/* Icon + Name row */}
      <div className="flex items-end gap-4 mb-4">
        <div
          {...getIconProps()}
          className="relative w-20 h-20 rounded-2xl cursor-pointer shrink-0 group -mt-8 ring-4 ring-pulse-bg-secondary"
          style={{ background: form.iconPreview ? undefined : `${form.accentColor}33`, border: `2px dashed ${form.accentColor}66` }}
        >
          <input {...getIconInput()} />
          {form.iconPreview
            ? <img src={form.iconPreview} alt="Icon" className="w-full h-full rounded-2xl object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Camera size={22} className="text-pulse-text-muted" /></div>
          }
          <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera size={18} className="text-white" />
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-semibold text-pulse-text-muted uppercase tracking-wide mb-1.5">Community Name *</label>
          <input
            value={form.name}
            onChange={e => update({ name: e.target.value })}
            placeholder="e.g. The Dragon's Den"
            maxLength={100}
            className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-pulse-text-muted uppercase tracking-wide mb-1.5">Description</label>
        <textarea
          value={form.description}
          onChange={e => update({ description: e.target.value })}
          placeholder="What's your community about? (optional)"
          maxLength={500}
          rows={2}
          className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none resize-none transition-colors"
        />
        <div className="text-right text-xs text-pulse-text-muted mt-0.5">{form.description.length}/500</div>
      </div>

      {/* Accent color + Privacy row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-pulse-text-muted uppercase tracking-wide mb-2">Accent Colour</label>
          <div className="flex flex-wrap gap-1.5">
            {ACCENT_COLORS.map(color => (
              <button
                key={color}
                onClick={() => update({ accentColor: color })}
                className={cn('w-6 h-6 rounded-full transition-transform hover:scale-110', form.accentColor === color && 'ring-2 ring-white ring-offset-1 ring-offset-pulse-bg-secondary')}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-pulse-text-muted uppercase tracking-wide mb-2">Privacy</label>
          <div className="space-y-1">
            {([
              { id: 'public', icon: Globe, label: 'Public', desc: 'Anyone can join' },
              { id: 'invite', icon: Link, label: 'Invite Only', desc: 'Invite link required' },
              { id: 'private', icon: Lock, label: 'Private', desc: 'Approval required' },
            ] as const).map(opt => (
              <button
                key={opt.id}
                onClick={() => update({ privacy: opt.id })}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors',
                  form.privacy === opt.id ? 'bg-pulse-brand/20 border border-pulse-brand/30' : 'border border-white/5 hover:bg-white/5'
                )}
              >
                <opt.icon size={13} className={form.privacy === opt.id ? 'text-pulse-brand' : 'text-pulse-text-muted'} />
                <div>
                  <span className="text-xs font-medium text-pulse-text-normal">{opt.label}</span>
                  <span className="text-[10px] text-pulse-text-muted ml-1.5">{opt.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step: Features ──────────────────────────────────────────────────────────

function FeaturesStep({ form, update }: { form: CommunityForm; update: (p: Partial<CommunityForm>) => void }) {
  const toggleFeature = (id: string) => {
    update({ features: form.features.includes(id) ? form.features.filter(f => f !== id) : [...form.features, id] })
  }

  const toggleChannel = (name: string) => {
    update({ channels: form.channels.includes(name) ? form.channels.filter(c => c !== name) : [...form.channels, name] })
  }

  const [newChannel, setNewChannel] = useState('')

  const addChannel = () => {
    const slug = newChannel.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!slug || form.channels.includes(slug) || form.channels.length >= 12) return
    update({ channels: [...form.channels, slug] })
    setNewChannel('')
  }

  const SUGGESTED_CHANNELS = ['announcements', 'introductions', 'memes', 'resources', 'help', 'off-topic', 'events', 'media', 'feedback']

  return (
    <div className="px-6 pt-4 pb-0 max-h-[520px] overflow-y-auto scrollbar-thin">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-pulse-text-normal">Features & Channels</h2>
        <p className="text-pulse-text-muted text-sm mt-0.5">Enable the tools your community needs</p>
      </div>

      {/* Features */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-pulse-text-muted uppercase tracking-wide mb-2">Features</label>
        <div className="grid grid-cols-3 gap-2">
          {FEATURE_OPTIONS.map(f => {
            const active = form.features.includes(f.id)
            return (
              <button
                key={f.id}
                onClick={() => toggleFeature(f.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all',
                  active ? 'border-pulse-brand/50 bg-pulse-brand/10' : 'border-white/5 bg-pulse-bg-primary hover:bg-white/5'
                )}
              >
                <f.icon size={15} className={active ? 'text-pulse-brand' : 'text-pulse-text-muted'} />
                <div>
                  <p className="text-xs font-medium text-pulse-text-normal leading-tight">{f.label}</p>
                  <p className="text-[10px] text-pulse-text-muted leading-tight">{f.description}</p>
                </div>
                {active && <Check size={12} className="ml-auto text-pulse-brand shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Channels */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-pulse-text-muted uppercase tracking-wide mb-2">
          Channels <span className="text-pulse-text-muted font-normal normal-case ml-1">({form.channels.length}/12)</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.channels.map(ch => (
            <div
              key={ch}
              className="flex items-center gap-1 px-2 py-1 bg-pulse-brand/15 border border-pulse-brand/25 rounded-lg text-xs text-pulse-brand font-medium"
            >
              # {ch}
              {ch !== 'general' && (
                <button onClick={() => toggleChannel(ch)} className="hover:text-red-400 ml-0.5 transition-colors">
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {SUGGESTED_CHANNELS.filter(c => !form.channels.includes(c)).map(c => (
            <button
              key={c}
              onClick={() => toggleChannel(c)}
              disabled={form.channels.length >= 12}
              className="px-2 py-0.5 rounded-lg border border-white/10 text-[11px] text-pulse-text-muted hover:border-pulse-brand/30 hover:text-pulse-brand disabled:opacity-30 transition-colors"
            >
              + #{c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newChannel}
            onChange={e => setNewChannel(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            onKeyDown={e => e.key === 'Enter' && addChannel()}
            placeholder="custom-channel"
            maxLength={32}
            className="flex-1 bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-1.5 text-xs text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors"
          />
          <button
            onClick={addChannel}
            disabled={!newChannel || form.channels.length >= 12}
            className="px-3 py-1.5 bg-pulse-bg-elevated hover:bg-white/10 disabled:opacity-40 rounded-xl text-pulse-text-muted hover:text-pulse-text-normal transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Age restriction */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-pulse-bg-primary border border-white/5 mb-6">
        <div>
          <p className="text-sm font-medium text-pulse-text-normal">Age-Restricted Community</p>
          <p className="text-xs text-pulse-text-muted">Members must confirm they are 18+</p>
        </div>
        <button
          onClick={() => update({ ageRestricted: !form.ageRestricted })}
          className={cn(
            'w-10 h-5 rounded-full transition-colors relative',
            form.ageRestricted ? 'bg-pulse-brand' : 'bg-white/10'
          )}
        >
          <div className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow',
            form.ageRestricted ? 'translate-x-5' : 'translate-x-0.5'
          )} />
        </button>
      </div>
    </div>
  )
}

// ─── Step: Rules ─────────────────────────────────────────────────────────────

function RulesStep({
  form, update, newRuleRef,
}: {
  form: CommunityForm
  update: (p: Partial<CommunityForm>) => void
  newRuleRef: React.RefObject<HTMLInputElement>
}) {
  const [newRule, setNewRule] = useState('')

  const addRule = () => {
    if (!newRule.trim() || form.rules.length >= 15) return
    update({ rules: [...form.rules, newRule.trim()] })
    setNewRule('')
    newRuleRef.current?.focus()
  }

  const removeRule = (i: number) => update({ rules: form.rules.filter((_, idx) => idx !== i) })

  const updateRule = (i: number, text: string) => {
    const next = [...form.rules]
    next[i] = text
    update({ rules: next })
  }

  return (
    <div className="px-6 pt-4 pb-0">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-pulse-text-normal">Community Rules</h2>
        <p className="text-pulse-text-muted text-sm mt-0.5">Help members understand what's expected</p>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1 mb-4">
        {form.rules.map((rule, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-full bg-pulse-brand/20 border border-pulse-brand/30 flex items-center justify-center text-xs font-bold text-pulse-brand shrink-0">
              {i + 1}
            </div>
            <input
              value={rule}
              onChange={e => updateRule(i, e.target.value)}
              className="flex-1 bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2 text-sm text-pulse-text-normal focus:border-pulse-brand/50 focus:outline-none transition-colors"
            />
            <button
              onClick={() => removeRule(i)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-pulse-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {form.rules.length < 15 && (
        <div className="flex gap-2 mb-6">
          <input
            ref={newRuleRef}
            value={newRule}
            onChange={e => setNewRule(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRule()}
            placeholder="Add a rule..."
            className="flex-1 bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors"
          />
          <button
            onClick={addRule}
            disabled={!newRule.trim()}
            className="px-4 py-2 bg-pulse-bg-elevated hover:bg-white/10 disabled:opacity-40 rounded-xl text-pulse-text-muted hover:text-pulse-text-normal transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      <div className="bg-pulse-bg-primary border border-white/5 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Users size={16} className="text-pulse-brand mt-0.5 shrink-0" />
          <div className="text-xs text-pulse-text-muted">
            <strong className="text-pulse-text-normal">Community overview</strong>
            <div className="mt-1 space-y-0.5">
              <div>📛 {form.name || 'Unnamed Community'}</div>
              <div>🔒 {form.privacy === 'public' ? 'Public' : form.privacy === 'invite' ? 'Invite Only' : 'Private'}</div>
              <div>📺 {form.channels.length} channels</div>
              <div>✨ {form.features.length} features enabled</div>
              <div>📋 {form.rules.length} rules</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step: Done ──────────────────────────────────────────────────────────────

function DoneStep({ name, inviteCode, onClose }: { name: string; inviteCode: string; onClose: () => void }) {
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const inviteUrl = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : ''

  const copyCode = () => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  const copyLink = () => {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  return (
    <div className="px-6 py-10 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-full bg-pulse-brand/20 border-2 border-pulse-brand/40 flex items-center justify-center mx-auto mb-4"
      >
        <Check size={36} className="text-pulse-brand" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-2xl font-bold text-pulse-text-normal mb-1">🎉 Community Created!</h2>
        <p className="text-pulse-text-muted">
          <strong className="text-pulse-text-normal">{name}</strong> is ready to go.
        </p>
      </motion.div>

      {inviteCode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6 p-4 bg-pulse-bg-primary border border-white/10 rounded-xl"
        >
          <p className="text-xs text-pulse-text-muted mb-2 font-semibold uppercase tracking-wide">Invite Code</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-2xl font-bold tracking-[0.3em] text-pulse-text-normal bg-pulse-bg-elevated px-3 py-2.5 rounded-lg text-center">
              {inviteCode}
            </code>
            <button
              onClick={copyCode}
              className={cn(
                'shrink-0 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                codeCopied ? 'bg-green-500/20 text-green-400' : 'bg-pulse-brand/20 text-pulse-brand hover:bg-pulse-brand/30'
              )}
            >
              {codeCopied ? <Check size={15} /> : <Link size={15} />}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-xs text-pulse-text-muted bg-pulse-bg-elevated/50 px-3 py-1.5 rounded-lg truncate text-left">
              {inviteUrl}
            </code>
            <button
              onClick={copyLink}
              className={cn(
                'shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                linkCopied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-pulse-text-muted hover:bg-white/10'
              )}
            >
              {linkCopied ? <Check size={12} /> : 'Copy link'}
            </button>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6">
        <button
          onClick={onClose}
          className="px-8 py-2.5 bg-pulse-brand hover:bg-pulse-brand-hover text-white font-semibold rounded-xl transition-colors"
        >
          Go to Community
        </button>
      </motion.div>
    </div>
  )
}
