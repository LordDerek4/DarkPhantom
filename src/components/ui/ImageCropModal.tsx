import React, { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react'

interface ImageCropModalProps {
  file: File
  aspect: number
  cropShape?: 'rect' | 'round'
  onCancel: () => void
  onCropped: (file: File) => void
}

async function getCroppedFile(imageSrc: string, area: Area, sourceFile: File): Promise<File> {
  const image = new Image()
  image.src = imageSrc
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = area.width
  canvas.height = area.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)

  const outputType = sourceFile.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, outputType, 0.92))
  if (!blob) throw new Error('Failed to crop image')

  const ext = outputType === 'image/png' ? 'png' : 'jpg'
  const base = sourceFile.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${base}-cropped.${ext}`, { type: outputType })
}

export function ImageCropModal({ file, aspect, cropShape = 'rect', onCancel, onCropped }: ImageCropModalProps) {
  const [imageSrc] = useState(() => URL.createObjectURL(file))
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedArea) return
    setSaving(true)
    try {
      const cropped = await getCroppedFile(imageSrc, croppedArea, file)
      URL.revokeObjectURL(imageSrc)
      onCropped(cropped)
    } catch {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    URL.revokeObjectURL(imageSrc)
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-pulse-bg-secondary rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-sm font-semibold text-pulse-text-normal">Adjust image</p>
          <button onClick={handleCancel} className="p-1 rounded hover:bg-white/10 text-pulse-text-muted hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="relative h-72 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={cropShape === 'rect'}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <ZoomOut size={16} className="text-pulse-text-muted shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-pulse-brand"
            />
            <ZoomIn size={16} className="text-pulse-text-muted shrink-0" />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-pulse-text-normal transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !croppedArea}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-pulse-brand hover:bg-pulse-brand-hover text-white transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Check size={14} />Apply</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
