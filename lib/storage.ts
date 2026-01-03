// lib/storage.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client with service role key for server-side uploads
// This bypasses RLS policies
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Upload a screenshot to Supabase Storage
 * @param buffer - Screenshot buffer from Playwright
 * @param path - Storage path (e.g., 'execution-123/step-1.png')
 * @returns Public URL of the uploaded file
 */
export async function uploadScreenshot(
  buffer: Buffer,
  path: string
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('automation-screenshots')
      .upload(path, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('Screenshot upload error:', error)
      throw error
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('automation-screenshots')
      .getPublicUrl(path)

    return publicUrl
  } catch (error) {
    console.error('Failed to upload screenshot:', error)
    throw error
  }
}

/**
 * Upload a video recording to Supabase Storage
 * @param filePath - Local path to video file
 * @param storagePath - Storage path (e.g., 'execution-123/recording.webm')
 * @returns Public URL of the uploaded file
 */
export async function uploadVideo(
  filePath: string,
  storagePath: string
): Promise<string> {
  try {
    const fs = await import('fs')
    const fileBuffer = fs.readFileSync(filePath)

    const { data, error } = await supabaseAdmin.storage
      .from('automation-videos')
      .upload(storagePath, fileBuffer, {
        contentType: 'video/webm',
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('Video upload error:', error)
      throw error
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('automation-videos')
      .getPublicUrl(storagePath)

    // Clean up local file
    try {
      fs.unlinkSync(filePath)
    } catch (cleanupError) {
      console.warn('Failed to cleanup video file:', cleanupError)
    }

    return publicUrl
  } catch (error) {
    console.error('Failed to upload video:', error)
    throw error
  }
}

/**
 * Upload a file from a Buffer
 * @param bucket - Storage bucket name
 * @param path - Storage path
 * @param buffer - File buffer
 * @param contentType - MIME type
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('File upload error:', error)
      throw error
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path)

    return publicUrl
  } catch (error) {
    console.error('Failed to upload file:', error)
    throw error
  }
}

/**
 * Delete a file from storage
 * @param bucket - Storage bucket name
 * @param path - File path to delete
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('File deletion error:', error)
      throw error
    }
  } catch (error) {
    console.error('Failed to delete file:', error)
    throw error
  }
}

/**
 * Delete all files in a folder
 * @param bucket - Storage bucket name
 * @param folder - Folder path (e.g., 'execution-123')
 */
export async function deleteFolder(
  bucket: string,
  folder: string
): Promise<void> {
  try {
    // List all files in folder
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucket)
      .list(folder)

    if (listError) throw listError

    if (!files || files.length === 0) return

    // Delete all files
    const filePaths = files.map(file => `${folder}/${file.name}`)
    const { error: deleteError } = await supabaseAdmin.storage
      .from(bucket)
      .remove(filePaths)

    if (deleteError) throw deleteError
  } catch (error) {
    console.error('Failed to delete folder:', error)
    throw error
  }
}

/**
 * Get signed URL for private files
 * @param bucket - Storage bucket name
 * @param path - File path
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) throw error
    if (!data) throw new Error('No signed URL returned')

    return data.signedUrl
  } catch (error) {
    console.error('Failed to create signed URL:', error)
    throw error
  }
}

/**
 * Check if a file exists
 * @param bucket - Storage bucket name
 * @param path - File path
 * @returns True if file exists
 */
export async function fileExists(
  bucket: string,
  path: string
): Promise<boolean> {
  try {
    const pathParts = path.split('/')
    const fileName = pathParts.pop()
    const folder = pathParts.join('/')
    
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(folder || undefined)

    if (error) return false
    if (!data) return false

    return data.some(file => file.name === fileName)
  } catch (error) {
    return false
  }
}