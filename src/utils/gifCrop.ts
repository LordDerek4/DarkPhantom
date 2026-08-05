import { parseGIF, decompressFrames } from 'gifuct-js'
import GIF from 'gif.js'
import gifWorkerUrl from 'gif.js/dist/gif.worker.js?url'

interface PixelCropRect {
  x: number
  y: number
  width: number
  height: number
}

// Canvas-based cropping only ever captures whatever single frame is on
// screen at that instant, which is why static crop silently kills GIF
// animation. This decodes every frame (gifuct-js), composites each onto a
// persistent full-size canvas respecting each frame's disposal method,
// crops that composite the same way the static path crops a still image,
// and re-encodes the cropped frames into a new animated GIF (gif.js).
export async function cropAnimatedGif(file: File, crop: PixelCropRect): Promise<File> {
  const buffer = await file.arrayBuffer()
  const parsed = parseGIF(buffer)
  const frames = decompressFrames(parsed, true)

  const fullWidth = parsed.lsd.width
  const fullHeight = parsed.lsd.height
  const outWidth = Math.max(1, Math.round(crop.width))
  const outHeight = Math.max(1, Math.round(crop.height))

  const compositeCanvas = document.createElement('canvas')
  compositeCanvas.width = fullWidth
  compositeCanvas.height = fullHeight
  const compositeCtx = compositeCanvas.getContext('2d')
  if (!compositeCtx) throw new Error('Canvas not supported')

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = outWidth
  cropCanvas.height = outHeight
  const cropCtx = cropCanvas.getContext('2d')
  if (!cropCtx) throw new Error('Canvas not supported')

  // Scratch canvas for each frame's raw patch, so it can be composited onto
  // the persistent canvas via drawImage (alpha-blended) instead of
  // putImageData (a raw overwrite). Most real GIFs only redraw a small delta
  // region per frame using transparency to let the previous frame show
  // through everywhere else — putImageData ignores alpha and blanks that
  // region out instead, which is what was causing the corrupted/glitchy output.
  const patchCanvas = document.createElement('canvas')
  const patchCtx = patchCanvas.getContext('2d')
  if (!patchCtx) throw new Error('Canvas not supported')

  const gif = new GIF({
    workers: 2,
    quality: 10,
    workerScript: gifWorkerUrl,
    width: outWidth,
    height: outHeight,
  })

  let previousSnapshot: ImageData | null = null

  for (const frame of frames) {
    // "Restore to previous" disposal needs the canvas state from before this
    // frame was drawn, captured *before* we composite the new patch in.
    const needsRestore = frame.disposalType === 3
    if (needsRestore) previousSnapshot = compositeCtx.getImageData(0, 0, fullWidth, fullHeight)

    patchCanvas.width = frame.dims.width
    patchCanvas.height = frame.dims.height
    patchCtx.putImageData(
      new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height),
      0, 0
    )
    compositeCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top)

    cropCtx.clearRect(0, 0, outWidth, outHeight)
    cropCtx.drawImage(
      compositeCanvas,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, outWidth, outHeight
    )
    gif.addFrame(cropCtx, { copy: true, delay: frame.delay || 100 })

    if (frame.disposalType === 2) {
      compositeCtx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height)
    } else if (needsRestore && previousSnapshot) {
      compositeCtx.putImageData(previousSnapshot, 0, 0)
    }
  }

  return new Promise((resolve, reject) => {
    gif.on('finished', blob => {
      const base = file.name.replace(/\.[^.]+$/, '')
      resolve(new File([blob], `${base}-cropped.gif`, { type: 'image/gif' }))
    })
    gif.on('error', reject)
    gif.render()
  })
}
