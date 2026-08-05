import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Camera } from 'lucide-react'
import { useServers } from '@/hooks/useServer'
import { useAppStore } from '@/store/useAppStore'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { validateImageFile } from '@/services/storage.service'
import { ImageCropModal } from '@/components/ui/ImageCropModal'
import toast from 'react-hot-toast'

interface CreateServerModalProps {
  open: boolean
  onClose: () => void
}

export function CreateServerModal({ open, onClose }: CreateServerModalProps) {
  const { create } = useServers()
  const { setActiveServer, setViewMode } = useAppStore()
  const [serverName, setServerName] = useState('')
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [cropTarget, setCropTarget] = useState<File | null>(null)

  const onDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    const error = validateImageFile(file)
    if (error) { toast.error(error); return }
    // GIFs skip cropping — rasterizing a single frame to canvas would kill the animation
    if (file.type === 'image/gif') { setIconFile(file); setIconPreview(URL.createObjectURL(file)); return }
    setCropTarget(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serverName.trim()) return
    setLoading(true)
    try {
      const server = await create(serverName.trim(), iconFile ?? undefined)
      setActiveServer(server.id)
      setViewMode('server')
      toast.success(`Server "${server.name}" created!`)
      onClose()
      setServerName('')
      setIconFile(null)
      setIconPreview(null)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to create server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Modal open={open} onClose={onClose} title="Create Your Server" size="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Icon upload */}
        <div className="flex justify-center">
          <div
            {...getRootProps()}
            className="relative w-24 h-24 rounded-full cursor-pointer group"
          >
            <input {...getInputProps()} />
            {iconPreview ? (
              <img src={iconPreview} alt="Server icon" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-pulse-bg-elevated border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 hover:border-pulse-brand transition-colors">
                <Camera size={20} className="text-pulse-text-muted" />
                <span className="text-xs text-pulse-text-muted text-center leading-tight">
                  {isDragActive ? 'Drop here' : 'Upload\nIcon'}
                </span>
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
          </div>
        </div>

        <Input
          label="Server Name"
          placeholder="My Awesome Server"
          value={serverName}
          onChange={e => setServerName(e.target.value)}
          maxLength={100}
        />

        <p className="text-xs text-pulse-text-muted">
          By creating a server, you agree to AevixChat's Community Guidelines.
        </p>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Back
          </Button>
          <Button type="submit" loading={loading} disabled={!serverName.trim()}>
            Create Server
          </Button>
        </div>
      </form>
    </Modal>

    {cropTarget && (
      <ImageCropModal
        file={cropTarget}
        aspect={1}
        cropShape="round"
        onCancel={() => setCropTarget(null)}
        onCropped={cropped => {
          setCropTarget(null)
          setIconFile(cropped)
          setIconPreview(URL.createObjectURL(cropped))
        }}
      />
    )}
    </>
  )
}
