import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Trash2, LogOut, Settings, Link, AlertTriangle, Check, Users, Crown, MoreVertical, Globe, Lock, DollarSign } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/utils/helpers'
import { useAppStore } from '@/store/useAppStore'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/hooks/useUserCache'
import { updateServer, deleteServer, leaveServer, transferOwnership } from '@/services/server.service'
import { syncDiscoverListing } from '@/services/discover.service'
import { uploadServerIcon, uploadServerBanner, validateImageFile } from '@/services/storage.service'
import { InviteModal } from '@/components/server/InviteModal'
import { MonetizationTab } from '@/components/server/MonetizationTab'
import { Avatar } from '@/components/ui/Avatar'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'members' | 'monetization' | 'danger'

export function ServerSettingsModal() {
  const { serverSettingsId, setServerSettingsId, servers, removeServer, setViewMode, channels } = useAppStore()
  const { user } = useAuth()

  const server = serverSettingsId ? servers[serverSettingsId] : null
  const isOwner = !!server && server.ownerId === user?.uid

  const serverChannels = serverSettingsId ? (channels[serverSettingsId] ?? []) : []
  const defaultChannelId = serverChannels.find(c => c.type !== 'category')?.id ?? ''

  const members = useAppStore(s => s.members[serverSettingsId ?? ''] ?? [])
  const memberIds = members.map(m => m.userId)
  const userMap = useUsers(memberIds)

  const [tab, setTab] = useState<Tab>('overview')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [transferTarget, setTransferTarget] = useState<string | null>(null)
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    if (server) {
      setName(server.name)
      setDescription(server.description ?? '')
      setAccentColor(server.accentColor ?? null)
      setIsPublic(server.isPublic)
      setIconPreview(server.iconUrl)
      setIconFile(null)
      setBannerPreview(server.bannerUrl)
      setBannerFile(null)
      setDeleteConfirm('')
      setTab('overview')
      setTransferTarget(null)
    }
  }, [serverSettingsId])

  // Sidebar right-click shortcuts
  useEffect(() => {
    const onDanger = (e: Event) => {
      if ((e as CustomEvent<string>).detail === serverSettingsId) setTab('danger')
    }
    const onInvite = (e: Event) => {
      if ((e as CustomEvent<string>).detail === serverSettingsId) setShowInvite(true)
    }
    const onMonetization = (e: Event) => {
      if ((e as CustomEvent<string>).detail === serverSettingsId) setTab('monetization')
    }
    window.addEventListener('server-settings-danger', onDanger)
    window.addEventListener('server-settings-invite', onInvite)
    window.addEventListener('server-settings-monetization', onMonetization)
    return () => {
      window.removeEventListener('server-settings-danger', onDanger)
      window.removeEventListener('server-settings-invite', onInvite)
      window.removeEventListener('server-settings-monetization', onMonetization)
    }
  }, [serverSettingsId])

  const onIconDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) { toast.error(err); return }
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onIconDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/gif': [] },
    maxFiles: 1,
    maxSize: 8 * 1024 * 1024,
  })

  const onBannerDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) { toast.error(err); return }
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }, [])

  const { getRootProps: getBannerRootProps, getInputProps: getBannerInputProps, isDragActive: isBannerDragActive } = useDropzone({
    onDrop: onBannerDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/gif': [] },
    maxFiles: 1,
    maxSize: 8 * 1024 * 1024,
  })

  const handleSave = async () => {
    if (!server || !isOwner) return
    setSaving(true)
    try {
      let iconUrl = server.iconUrl
      if (iconFile) iconUrl = await uploadServerIcon(server.id, iconFile)
      let bannerUrl = server.bannerUrl
      if (bannerFile) bannerUrl = await uploadServerBanner(server.id, bannerFile)

      const finalName = name.trim() || server.name
      const finalDescription = description.trim()

      await updateServer(server.id, {
        name: finalName,
        description: finalDescription,
        iconUrl,
        bannerUrl,
        accentColor,
        isPublic,
      })

      // Keep the Discover listing in sync whenever privacy changes — a
      // private server has no listing to begin with, so going public needs
      // one created, and going private needs it removed.
      if (isPublic !== server.isPublic) {
        await syncDiscoverListing(server.id, isPublic, {
          name: finalName,
          description: finalDescription,
          iconUrl,
          bannerUrl,
          memberCount: server.memberCount,
          boostLevel: server.boostLevel,
        })
      }

      toast.success('Server updated!')
      setIconFile(null)
      setBannerFile(null)
    } catch (err) {
      console.error('[ServerSettings] Save failed:', err)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleLeave = async () => {
    if (!server || !user) return
    if (isOwner) {
      toast.error('Transfer ownership before leaving. Go to the Members tab.')
      return
    }
    if (!confirm(`Leave "${server.name}"? You'll need a new invite to rejoin.`)) return
    try {
      await leaveServer(user.uid, server.id)
      removeServer(server.id)
      setViewMode('home')
      setServerSettingsId(null)
      toast.success(`Left ${server.name}`)
    } catch (err) {
      console.error('[ServerSettings] Leave failed:', err)
      toast.error('Failed to leave server')
    }
  }

  const handleDelete = async () => {
    if (!server || !isOwner) return
    if (deleteConfirm !== server.name) {
      toast.error('Server name does not match')
      return
    }
    setDeleting(true)
    try {
      await deleteServer(server.id)
      removeServer(server.id)
      setViewMode('home')
      setServerSettingsId(null)
      toast.success(`"${server.name}" deleted`)
    } catch (err) {
      console.error('[ServerSettings] Delete failed:', err)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Delete failed: ${msg}`)
    } finally {
      setDeleting(false)
    }
  }

  const handleTransferOwnership = async () => {
    if (!server || !transferTarget) return
    const targetUser = userMap[transferTarget]
    const targetName = targetUser?.displayName ?? targetUser?.username ?? 'this member'
    if (!confirm(`Transfer ownership of "${server.name}" to ${targetName}? You will no longer be the owner.`)) return
    setTransferring(true)
    try {
      await transferOwnership(server.id, transferTarget)
      toast.success(`Ownership transferred to ${targetName}`)
      setTransferTarget(null)
    } catch (err) {
      console.error('[ServerSettings] Transfer failed:', err)
      toast.error('Failed to transfer ownership')
    } finally {
      setTransferring(false)
    }
  }

  const isDirty = server && (
    name !== server.name ||
    description !== (server.description ?? '') ||
    !!iconFile ||
    !!bannerFile ||
    accentColor !== (server.accentColor ?? null) ||
    isPublic !== server.isPublic
  )

  if (!serverSettingsId || !server) return null

  const sidebarItems: { id: Tab; label: string; icon: React.ElementType; danger?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    ...(isOwner ? [{ id: 'monetization' as Tab, label: 'Monetization', icon: DollarSign }] : []),
    ...(isOwner ? [{ id: 'danger' as Tab, label: 'Delete Server', icon: Trash2, danger: true }] : []),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setServerSettingsId(null)}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full max-w-2xl bg-pulse-bg-secondary rounded-2xl shadow-elevation-high overflow-hidden flex"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <aside className="w-52 bg-pulse-bg-primary flex flex-col shrink-0 p-3">
          <div className="px-2 py-1 mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-pulse-text-muted truncate">
              {server.name}
            </p>
          </div>

          {sidebarItems.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
                t.danger
                  ? tab === t.id
                    ? 'bg-red-500/15 text-red-400'
                    : 'text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
                  : tab === t.id
                    ? 'bg-white/10 text-pulse-text-normal font-medium'
                    : 'text-pulse-text-muted hover:bg-white/5 hover:text-pulse-text-normal'
              )}
            >
              <t.icon size={15} className="shrink-0" />
              {t.label}
            </button>
          ))}

          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-pulse-text-muted hover:bg-white/5 hover:text-pulse-text-normal transition-colors text-left"
          >
            <Link size={15} className="shrink-0" />
            Invite People
          </button>

          <div className="mt-auto border-t border-white/5 pt-2">
            <button
              onClick={handleLeave}
              className={cn(
                'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
                isOwner
                  ? 'text-pulse-text-muted/40 cursor-not-allowed'
                  : 'text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
              )}
              title={isOwner ? 'Transfer ownership first' : undefined}
            >
              <LogOut size={15} className="shrink-0" />
              Leave Server
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-7">
          <button
            onClick={() => setServerSettingsId(null)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-pulse-text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Overview */}
          {tab === 'overview' && (
            <div className="space-y-6 max-w-md">
              <h2 className="text-lg font-bold text-white">Server Overview</h2>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-1.5">
                  Server Banner
                </label>
                <div
                  {...getBannerRootProps()}
                  className={cn(
                    'relative h-28 rounded-xl overflow-hidden cursor-pointer group border-2 border-dashed transition-colors',
                    isBannerDragActive ? 'border-pulse-brand' : 'border-white/15 hover:border-white/30'
                  )}
                  style={{ background: bannerPreview ? undefined : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(235,69,158,0.1))' }}
                >
                  <input {...getBannerInputProps()} />
                  {bannerPreview && <img src={bannerPreview} alt="" className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 text-white text-sm font-medium transition-opacity">
                      <Camera size={16} /> {bannerPreview ? 'Change Banner' : 'Upload Banner'}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-pulse-text-muted mt-1.5">PNG, JPG, WEBP — max 8MB. Recommended: 960×270px</p>
              </div>

              <div className="flex items-center gap-5">
                <div
                  {...getRootProps()}
                  className={cn(
                    'relative w-20 h-20 rounded-2xl cursor-pointer group border-2 border-dashed transition-colors',
                    isDragActive ? 'border-pulse-brand' : 'border-white/15 hover:border-white/30'
                  )}
                >
                  <input {...getInputProps()} />
                  {iconPreview ? (
                    <img src={iconPreview} alt="" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-pulse-bg-elevated flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{server.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera size={18} className="text-white" />
                  </div>
                </div>
                <div className="text-sm text-pulse-text-muted space-y-1">
                  <p className="font-medium text-pulse-text-normal">Server Icon</p>
                  <p>PNG, JPG, WEBP — max 8MB</p>
                  <p>Recommended: 512×512px</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-1.5">
                  Server Name
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={100}
                  disabled={!isOwner}
                  className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-pulse-text-normal focus:border-pulse-brand/50 focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  disabled={!isOwner}
                  placeholder="What's your server about?"
                  className="w-full bg-pulse-bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-pulse-brand/50 focus:outline-none resize-none transition-colors disabled:opacity-50"
                />
              </div>

              {/* Privacy */}
              {isOwner && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-2">
                    Privacy
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsPublic(true)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors',
                        isPublic ? 'border-pulse-brand/50 bg-pulse-brand/10' : 'border-white/5 hover:bg-white/5'
                      )}
                    >
                      <Globe size={15} className={isPublic ? 'text-pulse-brand' : 'text-pulse-text-muted'} />
                      <div>
                        <p className="text-xs font-medium text-pulse-text-normal">Public</p>
                        <p className="text-[10px] text-pulse-text-muted">Listed in Discover, anyone can join</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setIsPublic(false)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors',
                        !isPublic ? 'border-pulse-brand/50 bg-pulse-brand/10' : 'border-white/5 hover:bg-white/5'
                      )}
                    >
                      <Lock size={15} className={!isPublic ? 'text-pulse-brand' : 'text-pulse-text-muted'} />
                      <div>
                        <p className="text-xs font-medium text-pulse-text-normal">Private</p>
                        <p className="text-[10px] text-pulse-text-muted">Invite link required to join</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Server Accent Colour */}
              {isOwner && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-pulse-text-muted mb-2">
                    Server Accent Colour
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[null, '#ef4444', '#a855f7', '#3b82f6', '#22c55e', '#f97316', '#eab308', '#ec4899', '#14b8a6'].map(c => (
                      <button
                        key={c ?? 'none'}
                        onClick={() => setAccentColor(c)}
                        title={c ?? 'Default'}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${accentColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/50'}`}
                        style={{ background: c ?? '#374151' }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-pulse-text-muted mt-1.5">Applied to the server header and icon ring.</p>
                </div>
              )}

              <div className="bg-pulse-bg-primary rounded-xl border border-white/5 divide-y divide-white/5">
                <InfoRow label="Server ID" value={server.id} mono />
                <InfoRow label="Owner" value={isOwner ? 'You' : (userMap[server.ownerId]?.displayName ?? server.ownerId)} />
                <InfoRow label="Members" value={String(server.memberCount)} />
              </div>

              {isOwner && (
                <button
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  className="flex items-center gap-2 px-5 py-2.5 bg-pulse-brand hover:bg-pulse-brand-hover disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>
          )}

          {/* Members */}
          {tab === 'members' && (
            <div className="space-y-4 max-w-md">
              <div>
                <h2 className="text-lg font-bold text-white">Members</h2>
                <p className="text-sm text-pulse-text-muted mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
              </div>

              {isOwner && (
                <div className="p-3 bg-pulse-brand/10 border border-pulse-brand/20 rounded-xl text-sm text-pulse-text-muted">
                  To leave this server, transfer ownership to another member first.
                </div>
              )}

              <div className="space-y-1">
                {members.map(member => {
                  const memberUser = userMap[member.userId]
                  const isMemberOwner = member.userId === server.ownerId
                  const isSelf = member.userId === user?.uid

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 group transition-colors"
                    >
                      <Avatar
                        src={memberUser?.avatarUrl}
                        name={memberUser?.displayName ?? memberUser?.username ?? '?'}
                        size="sm"
                        status={memberUser?.status as 'online' | 'idle' | 'dnd' | 'offline' | undefined}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-pulse-text-normal truncate">
                            {memberUser?.displayName ?? memberUser?.username ?? member.userId.slice(0, 8)}
                          </span>
                          {isMemberOwner && (
                            <Crown size={12} className="text-yellow-400 shrink-0" />
                          )}
                          {isSelf && (
                            <span className="text-[10px] text-pulse-text-muted bg-white/5 px-1.5 py-0.5 rounded">you</span>
                          )}
                        </div>
                        {memberUser?.username && (
                          <p className="text-xs text-pulse-text-muted">@{memberUser.username}</p>
                        )}
                      </div>

                      {/* Actions — only owner can transfer, only shown on non-self members */}
                      {isOwner && !isSelf && !isMemberOwner && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setTransferTarget(
                              transferTarget === member.userId ? null : member.userId
                            )}
                            className="p-1.5 rounded-lg text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/10 transition-colors"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Transfer ownership panel */}
              <AnimatePresence>
                {transferTarget && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mt-2 p-4 bg-yellow-500/10 border border-yellow-500/25 rounded-xl space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <Crown size={16} className="text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-300">Transfer Ownership</p>
                        <p className="text-xs text-pulse-text-muted mt-0.5">
                          Transfer to{' '}
                          <span className="text-pulse-text-normal font-medium">
                            {userMap[transferTarget]?.displayName ?? userMap[transferTarget]?.username ?? 'this member'}
                          </span>
                          ? You will become a regular member and can then leave the server.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleTransferOwnership}
                        disabled={transferring}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold rounded-lg text-sm transition-colors"
                      >
                        {transferring && <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
                        {transferring ? 'Transferring…' : 'Confirm Transfer'}
                      </button>
                      <button
                        onClick={() => setTransferTarget(null)}
                        className="px-3 py-1.5 text-sm text-pulse-text-muted hover:text-pulse-text-normal hover:bg-white/5 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Monetization */}
          {tab === 'monetization' && isOwner && (
            <MonetizationTab serverId={server.id} />
          )}

          {/* Delete */}
          {tab === 'danger' && isOwner && (
            <div className="space-y-6 max-w-md">
              <h2 className="text-lg font-bold text-white">Delete Server</h2>

              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm text-pulse-text-muted space-y-1">
                  <p className="font-semibold text-red-400">This action is permanent and cannot be undone.</p>
                  <p>Deleting <span className="font-medium text-pulse-text-normal">"{server.name}"</span> will permanently remove all channels, messages, roles, and members.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-pulse-text-normal mb-1.5">
                  Type <span className="font-bold text-white">{server.name}</span> to confirm
                </label>
                <input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={server.name}
                  className="w-full bg-pulse-bg-primary border border-red-500/30 rounded-xl px-3 py-2.5 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted focus:border-red-500/60 focus:outline-none transition-colors"
                />
              </div>

              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== server.name || deleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm w-full justify-center"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {deleting ? 'Deleting…' : 'Delete Server Forever'}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {showInvite && server && (
        <InviteModal
          open={showInvite}
          serverId={server.id}
          channelId={defaultChannelId}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs font-semibold text-pulse-text-muted uppercase tracking-wide">{label}</span>
      <span className={cn('text-sm text-pulse-text-normal truncate max-w-[60%] text-right', mono && 'font-mono text-xs')}>
        {value}
      </span>
    </div>
  )
}
