import React, { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  User, Bell, Shield, Palette, LogOut, X, Camera, Check,
  Smile, Eye, EyeOff, UserCircle, Settings, Globe, Database,
  ExternalLink, Download, Trash2, BookOpen,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { validateImageFile } from '@/services/storage.service'
import { updateUserProfile, updateUserStatus } from '@/services/user.service'
import { updatePresence } from '@/services/presence.service'
import type { UserStatus } from '@/types'
import toast from 'react-hot-toast'
import { cn } from '@/utils/helpers'

const TABS = [
  { id: 'my-account', label: 'My Account', icon: User },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
  { id: 'data', label: 'Data & Privacy', icon: Database },
]

const STATUS_OPTIONS: { value: UserStatus; label: string; color: string; desc: string }[] = [
  { value: 'online', label: 'Online', color: 'bg-green-500', desc: 'Show as online' },
  { value: 'idle', label: 'Idle', color: 'bg-yellow-500', desc: 'Show as idle' },
  { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500', desc: 'Silence notifications' },
  { value: 'offline', label: 'Invisible', color: 'bg-gray-500', desc: 'Appear offline' },
]

const CUSTOM_STATUS_PRESETS = [
  '🎮 Gaming', '💻 Coding', '🎵 Listening to music', '📚 Studying',
  '🏋️ Working out', '☕ Taking a break', '🚀 Building something', '😴 AFK',
]

export function UserSettings() {
  const { isSettingsOpen, settingsTab, setSettingsOpen, setShowTutorial } = useAppStore()
  const { user, signOut, updateProfile: updateAuthProfile, uploadAndSetAvatar, uploadAndSetBanner } = useAuth()
  const [activeTab, setActiveTab] = useState(settingsTab)

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [customStatus, setCustomStatus] = useState(user?.customStatus ?? '')
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Sync tab from store
  useEffect(() => { setActiveTab(settingsTab) }, [settingsTab])

  // Sync fields when user data changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName)
      setBio(user.bio ?? '')
      setCustomStatus(user.customStatus ?? '')
    }
  }, [user])

  // Avatar upload
  const onAvatarDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) { toast.error(err); return }
    try {
      await uploadAndSetAvatar(file, setUploadProgress)
      toast.success('Avatar updated!')
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setUploadProgress(0)
    }
  }, [uploadAndSetAvatar])

  // Banner upload
  const onBannerDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) { toast.error(err); return }
    try {
      await uploadAndSetBanner(file, setUploadProgress)
      toast.success('Banner updated!')
    } catch {
      toast.error('Failed to upload banner')
    } finally {
      setUploadProgress(0)
    }
  }, [uploadAndSetBanner])

  const { getRootProps: getAvatarRootProps, getInputProps: getAvatarInputProps, isDragActive: isAvatarDrag } = useDropzone({
    onDrop: onAvatarDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    maxSize: 8 * 1024 * 1024,
  })

  const { getRootProps: getBannerRootProps, getInputProps: getBannerInputProps, isDragActive: isBannerDrag } = useDropzone({
    onDrop: onBannerDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    maxSize: 8 * 1024 * 1024,
  })

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateAuthProfile({ displayName: displayName.trim(), bio: bio.trim(), customStatus: customStatus.trim() })
      toast.success('Profile saved!')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: UserStatus) => {
    if (!user) return
    try {
      await Promise.all([
        updateUserStatus(user.uid, status),
        updatePresence(user.uid, status),
      ])
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setSettingsOpen(false)
  }

  const isDirty = user && (
    displayName !== user.displayName ||
    bio !== (user.bio ?? '') ||
    customStatus !== (user.customStatus ?? '')
  )

  if (!isSettingsOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={() => setSettingsOpen(false)} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative flex w-full max-w-5xl mx-auto my-6 rounded-2xl overflow-hidden shadow-elevation-high bg-pulse-bg-secondary"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar nav */}
        <aside className="w-60 bg-pulse-bg-primary flex flex-col shrink-0">
          <div className="p-4 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-pulse-text-muted px-2 mb-2">
              User Settings
            </p>
            <div className="space-y-0.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm transition-colors',
                    activeTab === tab.id
                      ? 'bg-white/10 text-pulse-text-normal font-medium'
                      : 'text-pulse-text-muted hover:bg-white/5 hover:text-pulse-text-normal'
                  )}
                >
                  <tab.icon size={16} className="shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto px-4 pb-4">
            <hr className="border-white/10 my-3" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <button
            onClick={() => setSettingsOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-pulse-text-muted hover:text-white hover:bg-white/10 transition-colors z-10"
          >
            <X size={20} />
          </button>

          <div className="p-8 max-w-2xl">

            {/* ── My Account ── */}
            {activeTab === 'my-account' && user && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">My Account</h2>

                {/* Profile preview card */}
                <div className="rounded-xl overflow-hidden border border-white/10">
                  {/* Banner */}
                  <div
                    {...getBannerRootProps()}
                    className={cn(
                      'h-24 relative cursor-pointer group',
                      isBannerDrag && 'ring-2 ring-pulse-brand'
                    )}
                    style={{
                      background: user.bannerUrl
                        ? undefined
                        : 'linear-gradient(135deg, #ef4444, #eb459e)',
                    }}
                  >
                    <input {...getBannerInputProps()} />
                    {user.bannerUrl && (
                      <img src={user.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 text-white text-sm font-medium">
                        <Camera size={16} /> Change Banner
                      </div>
                    </div>
                  </div>

                  <div className="bg-pulse-bg-elevated px-5 pb-5 pt-0">
                    <div className="flex items-end justify-between -mt-8 mb-3">
                      {/* Avatar */}
                      <div
                        {...getAvatarRootProps()}
                        className={cn(
                          'relative cursor-pointer group ring-4 ring-pulse-bg-elevated rounded-full',
                          isAvatarDrag && 'ring-pulse-brand'
                        )}
                      >
                        <input {...getAvatarInputProps()} />
                        <Avatar src={user.avatarUrl} name={user.displayName} size="xl" />
                        <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Camera size={18} className="text-white" />
                        </div>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/70">
                            <span className="text-white text-xs font-bold">{Math.round(uploadProgress)}%</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setActiveTab('profile')}
                        className="px-3 py-1.5 bg-pulse-brand hover:bg-pulse-brand-hover text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Edit Profile
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-white">{user.displayName}</h3>
                    <p className="text-sm text-pulse-text-muted">@{user.username}</p>
                    {user.customStatus && (
                      <p className="text-xs text-pulse-text-muted mt-1">{user.customStatus}</p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-3">Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => handleStatusChange(s.value)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                          user.status === s.value
                            ? 'border-pulse-brand/50 bg-pulse-brand/10'
                            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                        )}
                      >
                        <span className={cn('w-3 h-3 rounded-full shrink-0', s.color)} />
                        <div>
                          <p className="text-sm font-medium text-pulse-text-normal">{s.label}</p>
                          <p className="text-xs text-pulse-text-muted">{s.desc}</p>
                        </div>
                        {user.status === s.value && (
                          <Check size={14} className="ml-auto text-pulse-brand shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account info */}
                <div className="bg-pulse-bg-primary rounded-xl overflow-hidden border border-white/5">
                  <AccountRow label="Email" value={user.email} />
                  <AccountRow label="Username" value={`@${user.username}`} divider={false} />
                </div>

                {/* Help & Onboarding */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-pulse-text-muted mb-3">Help</h3>
                  <div className="bg-pulse-bg-primary rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-pulse-text-normal">App Tutorial</p>
                        <p className="text-xs text-pulse-text-muted mt-0.5">Replay the guided tour of AevixChat</p>
                      </div>
                      <button
                        onClick={() => {
                          setSettingsOpen(false)
                          setTimeout(() => setShowTutorial(true), 200)
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-pulse-brand/10 hover:bg-pulse-brand/20 text-pulse-brand text-xs font-semibold rounded-lg transition-colors shrink-0"
                      >
                        <BookOpen size={13} />
                        View tutorial
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Profile ── */}
            {activeTab === 'profile' && user && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">Profile</h2>

                {/* Live preview */}
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <div
                    className="h-20 relative"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #eb459e)' }}
                  >
                    {user.bannerUrl && <img src={user.bannerUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="bg-pulse-bg-elevated px-4 pb-4 pt-0">
                    <div className="flex items-end gap-3 -mt-6 mb-3">
                      <div className="ring-4 ring-pulse-bg-elevated rounded-full shrink-0">
                        <Avatar src={user.avatarUrl} name={displayName || user.displayName} size="lg" />
                      </div>
                    </div>
                    <p className="font-bold text-white text-base">{displayName || user.displayName}</p>
                    <p className="text-xs text-pulse-text-muted">@{user.username}</p>
                    {customStatus && (
                      <p className="text-xs text-pulse-text-muted mt-0.5">💬 {customStatus}</p>
                    )}
                    {bio && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-pulse-text-muted mb-1">About Me</p>
                        <p className="text-sm text-pulse-text-normal">{bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-1.5">
                      Display Name
                    </label>
                    <input
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      maxLength={32}
                      placeholder="Your display name"
                      className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-pulse-text-muted mt-1 text-right">{displayName.length}/32</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-1.5">
                      About Me
                    </label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      maxLength={190}
                      rows={3}
                      placeholder="Tell others a bit about yourself..."
                      className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none resize-none transition-colors"
                    />
                    <p className="text-xs text-pulse-text-muted mt-1 text-right">{bio.length}/190</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-1.5">
                      Custom Status
                    </label>
                    <input
                      value={customStatus}
                      onChange={e => setCustomStatus(e.target.value)}
                      maxLength={128}
                      placeholder="What are you up to?"
                      className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none transition-colors"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {CUSTOM_STATUS_PRESETS.map(p => (
                        <button
                          key={p}
                          onClick={() => setCustomStatus(p)}
                          className="px-2.5 py-1 text-xs bg-pulse-bg-primary border border-white/10 rounded-full text-pulse-text-muted hover:border-pulse-brand/40 hover:text-pulse-brand transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Avatar upload (drag zone) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-1.5">
                      Profile Picture
                    </label>
                    <div
                      {...getAvatarRootProps()}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                        isAvatarDrag
                          ? 'border-pulse-brand bg-pulse-brand/10'
                          : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                      )}
                    >
                      <input {...getAvatarInputProps()} />
                      <Avatar src={user.avatarUrl} name={user.displayName} size="lg" />
                      <div>
                        <p className="text-sm font-medium text-pulse-text-normal">
                          {isAvatarDrag ? 'Drop to upload' : 'Drag & drop or click to upload'}
                        </p>
                        <p className="text-xs text-pulse-text-muted mt-0.5">
                          PNG, JPG, WEBP — max 8MB
                        </p>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden w-32">
                            <div
                              className="h-full bg-pulse-brand transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Banner upload */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-1.5">
                      Profile Banner
                    </label>
                    <div
                      {...getBannerRootProps()}
                      className={cn(
                        'h-20 rounded-xl border-2 border-dashed cursor-pointer transition-colors relative overflow-hidden',
                        isBannerDrag ? 'border-pulse-brand' : 'border-white/10 hover:border-white/20'
                      )}
                      style={{
                        background: user.bannerUrl ? undefined : 'linear-gradient(135deg, #ef4444, #eb459e)',
                      }}
                    >
                      <input {...getBannerInputProps()} />
                      {user.bannerUrl && (
                        <img src={user.bannerUrl} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors">
                        <span className="text-white text-xs font-medium opacity-0 hover:opacity-100">
                          {isBannerDrag ? 'Drop to upload' : 'Click or drag to change'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving || !isDirty}
                    className="flex items-center gap-2 px-5 py-2.5 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={15} />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {isDirty && (
                    <button
                      onClick={() => {
                        setDisplayName(user.displayName)
                        setBio(user.bio ?? '')
                        setCustomStatus(user.customStatus ?? '')
                      }}
                      className="text-sm text-pulse-text-muted hover:text-pulse-text-normal transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Notifications ── */}
            {activeTab === 'notifications' && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-white">Notifications</h2>
                <div className="bg-pulse-bg-primary rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                  <NotificationToggle
                    label="Desktop Notifications"
                    description="Show notifications when you're mentioned or receive a DM"
                    defaultChecked={user?.notificationSettings?.desktopNotifications ?? true}
                  />
                  <NotificationToggle
                    label="Message Sounds"
                    description="Play a sound for incoming messages"
                    defaultChecked={user?.notificationSettings?.soundEnabled ?? true}
                  />
                  <NotificationToggle
                    label="Suppress @everyone"
                    description="Don't notify me for @everyone and @here mentions"
                    defaultChecked={user?.notificationSettings?.suppressEveryone ?? false}
                  />
                  <NotificationToggle
                    label="Mentions Only"
                    description="Only notify for direct mentions and DMs"
                    defaultChecked={user?.notificationSettings?.mentionsOnly ?? false}
                  />
                </div>
              </div>
            )}

            {/* ── Privacy ── */}
            {activeTab === 'privacy' && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-white">Privacy & Safety</h2>
                <div className="bg-pulse-bg-primary rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                  <NotificationToggle
                    label="Allow DMs from server members"
                    description="Let people in shared servers message you directly"
                    defaultChecked={true}
                  />
                  <NotificationToggle
                    label="Allow friend requests"
                    description="Let others send you friend requests"
                    defaultChecked={true}
                  />
                  <NotificationToggle
                    label="Show online status"
                    description="Let friends see when you're online"
                    defaultChecked={true}
                  />
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h3>
                  <p className="text-xs text-pulse-text-muted mb-3">
                    These actions are irreversible.
                  </p>
                  <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-500/30">
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {/* ── Data & Privacy ── */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">Data & Privacy</h2>

                {/* What we collect */}
                <div className="bg-pulse-bg-primary rounded-xl border border-white/5 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">What data we collect</h3>
                  <ul className="space-y-2">
                    {[
                      ['Account info', 'Email, username, display name, avatar'],
                      ['Messages', 'Content you send in servers and DMs'],
                      ['Presence', 'Online/offline status shown to others'],
                      ['Usage', 'Basic analytics to improve the platform'],
                    ].map(([label, desc]) => (
                      <li key={label} className="flex items-start justify-between gap-4 text-sm">
                        <span className="font-medium text-pulse-text-normal shrink-0">{label}</span>
                        <span className="text-pulse-text-muted text-right">{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Legal docs */}
                <div className="bg-pulse-bg-primary rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-pulse-text-muted px-4 py-3">Legal Documents</h3>
                  {[
                    { label: 'Privacy Policy', href: '/privacy', desc: 'How we collect, use, and protect your data' },
                    { label: 'Terms of Service', href: '/terms', desc: 'Rules and guidelines for using AevixChat' },
                  ].map(doc => (
                    <Link
                      key={doc.href}
                      to={doc.href}
                      target="_blank"
                      className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-pulse-text-normal">{doc.label}</p>
                        <p className="text-xs text-pulse-text-muted mt-0.5">{doc.desc}</p>
                      </div>
                      <ExternalLink size={14} className="text-pulse-text-muted group-hover:text-white transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>

                {/* Data controls */}
                <div className="bg-pulse-bg-primary rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-pulse-text-muted px-4 py-3">Data Controls</h3>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-pulse-text-normal">Request a data export</p>
                      <p className="text-xs text-pulse-text-muted mt-0.5">Get a copy of your account data</p>
                    </div>
                    <button
                      onClick={() => alert('Data export requested. You\'ll receive an email within 48 hours.')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-pulse-text-normal text-xs font-medium rounded-lg transition-colors"
                    >
                      <Download size={13} />
                      Export
                    </button>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-pulse-text-normal">Contact privacy team</p>
                      <p className="text-xs text-pulse-text-muted mt-0.5">GDPR requests, corrections, objections</p>
                    </div>
                    <a
                      href="mailto:AevixChat@Hotmail.com"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-pulse-text-normal text-xs font-medium rounded-lg transition-colors"
                    >
                      <ExternalLink size={13} />
                      Email
                    </a>
                  </div>
                </div>

                {/* Danger */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 size={15} className="text-red-400" />
                    <h3 className="text-sm font-semibold text-red-400">Delete all my data</h3>
                  </div>
                  <p className="text-xs text-pulse-text-muted mb-3">
                    Permanently deletes your account and all associated data. This cannot be undone.
                  </p>
                  <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-500/30">
                    Delete My Account & Data
                  </button>
                </div>
              </div>
            )}

            {/* ── Appearance ── */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-white">Appearance</h2>
                <div className="bg-pulse-bg-primary rounded-xl border border-white/5 p-4">
                  <p className="text-sm text-pulse-text-muted">
                    Dark mode is the default theme. Additional themes coming soon.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  )
}

function AccountRow({ label, value, divider = true }: { label: string; value: string; divider?: boolean }) {
  const [show, setShow] = useState(false)
  const isEmail = label === 'Email'
  const display = isEmail && !show
    ? value.replace(/(.{2}).*(@.*)/, '$1•••••$2')
    : value

  return (
    <div className={cn('flex items-center justify-between px-4 py-3.5', divider && 'border-b border-white/5')}>
      <div>
        <p className="text-xs font-semibold text-pulse-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-sm text-pulse-text-normal mt-0.5">{display}</p>
      </div>
      {isEmail && (
        <button
          onClick={() => setShow(v => !v)}
          className="text-pulse-text-muted hover:text-pulse-text-normal transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  )
}

function NotificationToggle({
  label,
  description,
  defaultChecked,
}: {
  label: string
  description: string
  defaultChecked: boolean
}) {
  const [enabled, setEnabled] = useState(defaultChecked)
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-pulse-text-normal">{label}</p>
        <p className="text-xs text-pulse-text-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => setEnabled(v => !v)}
        className={cn(
          'w-10 h-5 rounded-full transition-colors relative shrink-0',
          enabled ? 'bg-pulse-brand' : 'bg-white/15'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  )
}
