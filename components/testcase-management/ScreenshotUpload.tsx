"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Upload, Camera, X, Loader2, Download, Eye } from "lucide-react"

interface TestAttachment {
  id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number | null
  description?: string | null
  step_number?: number | null
  created_at: string
}

interface ScreenshotUploadProps {
  executionId: string
  testCaseId: string
  stepNumber?: number
  onUploadComplete?: (attachment: TestAttachment) => void
  attachments?: TestAttachment[]
  onDeleteAttachment?: (attachmentId: string) => void
}

const BUCKET = "test-attachments"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]

/**
 * Creates a signed URL for a storage object path.
 * Works with PRIVATE buckets.
 */
async function createSignedUrl(filePath: string, expiresInSeconds: number) {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

export function ScreenshotUpload({
  executionId,
  testCaseId,
  stepNumber,
  onUploadComplete,
  attachments = [],
  onDeleteAttachment,
}: ScreenshotUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewFile, setPreviewFile] = useState<TestAttachment | null>(null)
  const [description, setDescription] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please upload an image (PNG, JPEG, GIF, or WebP).")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 10MB.")
      return
    }

    await uploadFile(file)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId, testCaseId, stepNumber, description])

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr
      if (!user) {
        toast.error("Please log in to upload files.")
        return
      }

      // Create storage path (user-owned folder)
      const timestamp = Date.now()
      const fileExt = file.name.split(".").pop() || "png"
      const storageName = `screenshot-${timestamp}.${fileExt}`
      const filePath = `${user.id}/executions/${executionId}/${storageName}`

      // Upload to Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { cacheControl: "3600", upsert: false })

      if (uploadError) throw uploadError

      // Insert metadata into DB
      const { data: attachment, error: dbError } = await supabase
        .from("test_attachments")
        .insert({
          execution_id: executionId,
          test_case_id: testCaseId,
          step_number: stepNumber ?? null,
          file_name: file.name,           // original filename
          file_path: uploadData.path,      // storage object path
          file_type: file.type,
          file_size: file.size,
          description: description.trim() ? description.trim() : null,
          uploaded_by: user.id,
        })
        .select()
        .single()

      if (dbError) {
        // best effort cleanup of storage object
        await supabase.storage.from(BUCKET).remove([uploadData.path])
        throw dbError
      }

      toast.success("Screenshot uploaded successfully.")
      setDescription("")
      if (fileInputRef.current) fileInputRef.current.value = ""

      onUploadComplete?.(attachment as TestAttachment)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message ? `Upload failed: ${err.message}` : "Failed to upload screenshot.")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(attachmentId: string, filePath: string) {
    const confirmed = window.confirm("Delete this screenshot?")
    if (!confirmed) return

    try {
      const supabase = createClient()

      // Delete from storage (best effort)
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([filePath])
      if (storageError) console.error("Storage delete error:", storageError)

      // Delete from DB
      const { error: dbError } = await supabase.from("test_attachments").delete().eq("id", attachmentId)
      if (dbError) throw dbError

      toast.success("Screenshot deleted.")
      onDeleteAttachment?.(attachmentId)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message ? `Delete failed: ${err.message}` : "Failed to delete screenshot.")
    }
  }

  const handlePreview = useCallback((attachment: TestAttachment) => {
    setPreviewFile(attachment)
    setShowPreview(true)
  }, [])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card>
        <CardContent className="pt-6">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-muted-foreground/50 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Camera className="h-6 w-6 text-primary" />
              </div>

              <div className="text-center">
                <p className="text-sm font-medium">Upload Screenshot</p>
                <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse</p>
              </div>

              <Input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                onChange={(e) => void handleFileSelect(e.target.files)}
                className="hidden"
                id="screenshot-upload"
                disabled={uploading}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </>
                  )}
                </Button>
              </div>

              {/* Optional Description */}
              <div className="w-full space-y-2">
                <Label htmlFor="description" className="text-xs">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a note about this screenshot..."
                  rows={2}
                  className="text-sm resize-none"
                  disabled={uploading}
                />
              </div>

              <p className="text-xs text-muted-foreground">PNG, JPEG, GIF, WebP • Max 10MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachments Gallery */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Screenshots ({attachments.length})</Label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {attachments.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                onPreview={handlePreview}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      {previewFile && (
        <PreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          attachment={previewFile}
        />
      )}
    </div>
  )
}

/** Card preview uses a short-lived signed URL */
function AttachmentCard({
  attachment,
  onPreview,
  onDelete,
}: {
  attachment: TestAttachment
  onPreview: (attachment: TestAttachment) => void
  onDelete: (id: string, path: string) => void
}) {
  const [imageUrl, setImageUrl] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const signed = await createSignedUrl(attachment.file_path, 60 * 10) // 10 min
        if (!cancelled) setImageUrl(signed)
      } catch (e) {
        if (!cancelled) setImageUrl("")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [attachment.file_path])

  return (
    <Card className="group relative overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="aspect-video relative bg-muted">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt={attachment.file_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Preview unavailable
            </div>
          )}

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => onPreview(attachment)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(attachment.id, attachment.file_path)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-2">
          <p className="text-xs font-medium truncate">{attachment.file_name}</p>
          {attachment.step_number != null && (
            <Badge variant="outline" className="text-[10px] mt-1">
              Step {attachment.step_number}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** Dialog uses a longer-lived signed URL + refresh-before-download */
function PreviewDialog({
  open,
  onOpenChange,
  attachment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  attachment: TestAttachment
}) {
  const [imageUrl, setImageUrl] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const signed = await createSignedUrl(attachment.file_path, 60 * 30) // 30 min
      setImageUrl(signed)
    } catch (e) {
      setImageUrl("")
    } finally {
      setLoading(false)
    }
  }, [attachment.file_path])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  async function handleDownload() {
    // refresh to avoid expiry edge cases
    await refresh()
    if (!imageUrl) return
    const a = document.createElement("a")
    a.href = imageUrl
    a.download = attachment.file_name
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{attachment.file_name}</DialogTitle>
          <DialogDescription>
            {attachment.description || "No description"}
            {attachment.step_number != null ? ` • Step ${attachment.step_number}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : imageUrl ? (
            <img src={imageUrl} alt={attachment.file_name} className="w-full h-auto rounded-lg" />
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Preview unavailable (check storage policies).
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDownload} disabled={!imageUrl}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
