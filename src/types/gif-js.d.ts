declare module 'gif.js' {
  interface GIFOptions {
    workers?: number
    quality?: number
    workerScript?: string
    width?: number
    height?: number
    repeat?: number
    background?: string
    transparent?: string | null
    dither?: boolean
  }

  interface AddFrameOptions {
    delay?: number
    copy?: boolean
  }

  export default class GIF {
    constructor(options?: GIFOptions)
    addFrame(image: CanvasImageSource | CanvasRenderingContext2D | ImageData, options?: AddFrameOptions): void
    on(event: 'finished', callback: (blob: Blob) => void): void
    on(event: 'progress', callback: (fraction: number) => void): void
    on(event: 'error', callback: (err: Error) => void): void
    render(): void
    abort(): void
  }
}
