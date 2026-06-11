import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type StorageReference,
} from 'firebase/storage'
import { storage } from './firebase'
import { generateId } from '@/utils/helpers'

export type UploadProgressCallback = (progress: number) => void

export async function uploadAvatar(
  userId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `avatars/${userId}/avatar.${ext}`
  return uploadFile(path, file, onProgress)
}

export async function uploadServerIcon(
  serverId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `servers/${serverId}/icon.${ext}`
  return uploadFile(path, file, onProgress)
}

export async function uploadServerBanner(
  serverId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `servers/${serverId}/banner.${ext}`
  return uploadFile(path, file, onProgress)
}

export async function uploadMessageAttachment(
  channelId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; filename: string; size: number; contentType: string }> {
  const attachmentId = generateId()
  const path = `attachments/${channelId}/${attachmentId}_${file.name}`
  const url = await uploadFile(path, file, onProgress)
  return {
    url,
    filename: file.name,
    size: file.size,
    contentType: file.type,
  }
}

export async function uploadUserBanner(
  userId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `banners/${userId}/banner.${ext}`
  return uploadFile(path, file, onProgress)
}

function uploadFile(
  path: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path)
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    })

    uploadTask.on(
      'state_changed',
      snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.(progress)
      },
      error => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref)
        resolve(url)
      }
    )
  })
}

export async function deleteFile(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url)
    await deleteObject(storageRef)
  } catch {
    // File may not exist — ignore
  }
}

export function validateImageFile(file: File): string | null {
  const MAX_SIZE = 8 * 1024 * 1024 // 8MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'File must be JPEG, PNG, GIF, or WebP'
  }
  if (file.size > MAX_SIZE) {
    return 'File must be under 8MB'
  }
  return null
}

export function validateAttachmentFile(file: File): string | null {
  const MAX_SIZE = 25 * 1024 * 1024 // 25MB
  if (file.size > MAX_SIZE) return 'File must be under 25MB'
  return null
}
