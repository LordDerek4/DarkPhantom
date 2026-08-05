import React, { useRef, useState } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Check, X } from 'lucide-react'

interface ImageCropModalProps {
  file: File
  /** Locks the crop box to this ratio while still letting it be resized (proportionally). Omit to allow fully free resizing — used for banners. */
  aspect?: number
  circular?: boolean
  onCancel: () => void
  onCropped: (file: File) => void
}

function initialCrop(mediaWidth: number, mediaHeight: number, aspect?: number): Crop {
  // No locked aspect (banners) still gets a sensible wide starting box —
  // it's just freely resizable afterward instead of staying that shape.
  const startAspect = aspect ?? 3
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, startAspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  )
}

async function cropToFile(image: HTMLImageElement, crop: PixelCrop, sourceFile: File): Promise<File> {
  const canvas = document.createElement('canvas')
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const pixelRatio = window.devicePixelRatio || 1

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio)
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.scale(pixelRatio, pixelRatio)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    image,
    crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY,
    0, 0, crop.width * scaleX, crop.height * scaleY
  )

  const outputType = sourceFile.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, outputType, 0.92))
  if (!blob) throw new Error('Failed to crop image')

  const ext = outputType === 'image/png' ? 'png' : 'jpg'
  const base = sourceFile.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${base}-cropped.${ext}`, { type: outputType })
}

export function ImageCropModal({ file, aspect, circular = false, onCancel, onCropped }: ImageCropModalProps) {
  const [imageSrc] = useState(() => URL.createObjectURL(file))
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [saving, setSaving] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(initialCrop(width, height, aspect))
  }

  const handleCancel = () => {
    URL.revokeObjectURL(imageSrc)
    onCancel()
  }

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) return
    setSaving(true)
    try {
      const cropped = await cropToFile(imgRef.current, completedCrop, file)
      URL.revokeObjectURL(imageSrc)
      onCropped(cropped)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-pulse-bg-secondary rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-sm font-semibold text-pulse-text-normal">Adjust image</p>
          <button onClick={handleCancel} className="p-1 rounded hover:bg-white/10 text-pulse-text-muted hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 bg-black/80 flex items-center justify-center max-h-[60vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={c => setCompletedCrop(c)}
            aspect={aspect}
            circularCrop={circular}
            minWidth={40}
            minHeight={40}
          >
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img ref={imgRef} src={imageSrc} onLoad={onImageLoad} style={{ maxHeight: '55vh' }} />
          </ReactCrop>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-pulse-text-muted text-center">
            Drag the handles to resize{aspect ? '' : ' — free-form, any shape'}, drag inside to reposition
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-pulse-text-normal transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !completedCrop}
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
