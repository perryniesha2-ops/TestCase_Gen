"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import {
  Upload,
  Camera,
  X,
  Loader2,
  Download,
  Eye,
  Chrome,
} from "lucide-react";
import { extensionRequest } from "@/lib/extensions/extensionRequest";
import { detectExtensionInstalled } from "@/lib/extensions/detectExtension";

interface TestAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  description?: string | null;
  step_number?: number | null;
  created_at: string;
}

interface ScreenshotUploadProps {
  executionId: string;
  testCaseId?: string; // ← Made optional
  platformTestCaseId?: string; // ← NEW
  stepNumber?: number;
  onUploadComplete?: (attachment: TestAttachment) => void;
  attachments?: TestAttachment[];
  onDeleteAttachment?: (attachmentId: string) => void;
  targetUrl?: string;
  ensureExtensionInstalled?: () => Promise<boolean>;
  extensionInstalled?: boolean | null;
  checkingExtension?: boolean;
}

const BUCKET = "test-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];

/**
 * Creates a signed URL for a storage object path.
 * Works with PRIVATE buckets.
 */
async function createSignedUrl(filePath: string, expiresInSeconds: number) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export function ScreenshotUpload({
  executionId,
  testCaseId,
  platformTestCaseId, // ← NEW
  stepNumber,
  targetUrl,
  onUploadComplete,
  attachments = [],
  onDeleteAttachment,
  ensureExtensionInstalled,
  extensionInstalled: extensionInstalledProp,
  checkingExtension,
}: ScreenshotUploadProps) {
  // ✅ Validation: Must have exactly one case ID
  useEffect(() => {
    if (!testCaseId && !platformTestCaseId) {
      console.error(
        "ScreenshotUpload: Must provide either testCaseId or platformTestCaseId",
      );
    }
    if (testCaseId && platformTestCaseId) {
      console.error(
        "ScreenshotUpload: Cannot provide both testCaseId and platformTestCaseId",
      );
    }
  }, [testCaseId, platformTestCaseId]);

  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<TestAttachment | null>(null);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(
    null,
  );
  const resolvedExtensionInstalled =
    extensionInstalledProp ?? extensionInstalled;

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(
        "Invalid file type. Please upload an image (PNG, JPEG, GIF, or WebP).",
      );
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    await uploadFile(file);
  }, []);

  async function uploadFile(file: File) {
    // ✅ Validate case ID before upload
    if (!testCaseId && !platformTestCaseId) {
      toast.error("No test case ID provided. Cannot upload screenshot.");
      return;
    }
    if (testCaseId && platformTestCaseId) {
      toast.error(
        "Invalid state: both testCaseId and platformTestCaseId provided.",
      );
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) {
        toast.error("Please log in to upload files.");
        return;
      }

      // ✅ Verify the test case exists and belongs to user
      if (testCaseId) {
        const { data: testCase, error } = await supabase
          .from("test_cases")
          .select("id, user_id")
          .eq("id", testCaseId)
          .single();

        if (error || !testCase) {
          toast.error(`Test case not found: ${testCaseId}`);
          return;
        }

        if (testCase.user_id !== user.id) {
          toast.error("Unauthorized: Test case belongs to another user");
          return;
        }
      }

      if (platformTestCaseId) {
        const { data: platformCase, error } = await supabase
          .from("platform_test_cases")
          .select("id, user_id")
          .eq("id", platformTestCaseId)
          .single();

        if (error || !platformCase) {
          toast.error(`Platform test case not found: ${platformTestCaseId}`);
          return;
        }

        if (platformCase.user_id !== user.id) {
          toast.error(
            "Unauthorized: Platform test case belongs to another user",
          );
          return;
        }
      }

      // Create storage path (user-owned folder)
      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop() || "png";
      const storageName = `screenshot-${timestamp}.${fileExt}`;
      const filePath = `${user.id}/executions/${executionId}/${storageName}`;

      // Upload to Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      // ✅ Insert metadata into DB with correct foreign key
      const { data: attachment, error: dbError } = await supabase
        .from("test_attachments")
        .insert({
          execution_id: executionId,
          test_case_id: testCaseId || null, // ← One will be null
          platform_test_case_id: platformTestCaseId || null, // ← One will be null
          step_number: stepNumber ?? null,
          file_name: file.name, // original filename
          file_path: uploadData.path, // storage object path
          file_type: file.type,
          file_size: file.size,
          description: description.trim() ? description.trim() : null,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) {
        // best effort cleanup of storage object
        await supabase.storage.from(BUCKET).remove([uploadData.path]);
        throw dbError;
      }

      toast.success("Screenshot uploaded successfully.");
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      onUploadComplete?.(attachment as TestAttachment);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.message
          ? `Upload failed: ${err.message}`
          : "Failed to upload screenshot.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachmentId: string, filePath: string) {
    const confirmed = window.confirm("Delete this screenshot?");
    if (!confirmed) return;

    try {
      const supabase = createClient();

      // Delete from storage (best effort)
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([filePath]);
      if (storageError) console.error("Storage delete error:", storageError);

      // Delete from DB
      const { error: dbError } = await supabase
        .from("test_attachments")
        .delete()
        .eq("id", attachmentId);
      if (dbError) throw dbError;

      toast.success("Screenshot deleted.");
      onDeleteAttachment?.(attachmentId);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.message
          ? `Delete failed: ${err.message}`
          : "Failed to delete screenshot.",
      );
    }
  }

  const handlePreview = useCallback((attachment: TestAttachment) => {
    setPreviewFile(attachment);
    setShowPreview(true);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      void handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  async function captureFromExtension(mode: "full" | "region") {
    // ✅ Validate case ID before capture
    if (!testCaseId && !platformTestCaseId) {
      toast.error("No test case ID provided. Cannot capture screenshot.");
      return;
    }

    const installed = ensureExtensionInstalled
      ? await ensureExtensionInstalled()
      : await detectExtensionInstalled();

    setExtensionInstalled(installed);

    if (!installed) {
      toast.error(
        "Please install the SynthQA browser extension to capture screenshots.",
      );
      return;
    }

    if (!targetUrl || !targetUrl.trim()) {
      toast.error("Please enter a Target URL first.");
      return;
    }

    setUploading(true);
    try {
      const command =
        mode === "region" ? "CAPTURE_REGION" : "CAPTURE_SCREENSHOT";

      // ✅ Pass both IDs to extension (one will be null)
      const resp = await extensionRequest<{
        dataUrl: string;
        mimeType?: string;
        fileName?: string;
      }>(command, {
        executionId,
        testCaseId: testCaseId || null, // ← Pass to extension
        platformTestCaseId: platformTestCaseId || null, // ← Pass to extension
        stepNumber,
        targetUrl,
      });

      const blob = await (await fetch(resp.dataUrl)).blob();
      const file = new File(
        [blob],
        resp.fileName ||
          `${
            mode === "region" ? "screenshot-region" : "screenshot"
          }-${Date.now()}.png`,
        {
          type: resp.mimeType || blob.type || "image/png",
        },
      );

      await uploadFile(file);
    } catch (e: any) {
      toast.error(
        e?.message ? `Capture failed: ${e.message}` : "Capture failed",
      );
    } finally {
      setUploading(false);
    }
  }

  const captureDisabled =
    uploading || resolvedExtensionInstalled === false || !targetUrl?.trim();

  return (
    <div className="space-y-4">
      {/* Upload Area (compact) */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <div
            className="border border-dashed border-muted-foreground/25 rounded-md px-3 py-3 hover:border-muted-foreground/50 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 mt-0.5 shrink-0">
                <Camera className="h-4 w-4 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      Screenshots
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      Upload or capture. (The preview appears below.)
                    </p>
                  </div>

                  <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                    Max 10MB
                  </p>
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

                <div className="mt-3 flex flex-wrap gap-2">
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

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void captureFromExtension("full")}
                    disabled={captureDisabled}
                    title={
                      resolvedExtensionInstalled === false
                        ? "Install the SynthQA browser extension to use Capture"
                        : !targetUrl?.trim()
                          ? "Enter a target URL to capture screenshots"
                          : undefined
                    }
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Full
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void captureFromExtension("region")}
                    disabled={captureDisabled}
                    title={
                      extensionInstalled === false
                        ? "Install the SynthQA browser extension to use Capture"
                        : !targetUrl?.trim()
                          ? "Enter a target URL to capture screenshots"
                          : "Select a region on the page"
                    }
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Region
                  </Button>
                </div>

                {resolvedExtensionInstalled === false && (
                  <p className="text-xs text-amber-600 mt-2">
                    Browser extension required for Capture.
                    <Link
                      href="/downloads/SynthQA-Evidence-Extension-v0.1.1.zip"
                      className="ml-1 underline underline-offset-2 font-medium hover:text-amber-700"
                    >
                      Install
                    </Link>
                  </p>
                )}

                {/* Optional Description */}
                <div className="mt-3 space-y-2">
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachments Gallery */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Screenshots ({attachments.length})
            </Label>
          </div>

          <div className="max-h-[260px] overflow-y-auto pr-1">
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
  );
}

/** Card preview uses a short-lived signed URL */
function AttachmentCard({
  attachment,
  onPreview,
  onDelete,
}: {
  attachment: TestAttachment;
  onPreview: (attachment: TestAttachment) => void;
  onDelete: (id: string, path: string) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const signed = await createSignedUrl(attachment.file_path, 60 * 10); // 10 min
        if (!cancelled) setImageUrl(signed);
      } catch (e) {
        if (!cancelled) setImageUrl("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attachment.file_path]);

  return (
    <Card className="group relative overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="aspect-video relative bg-muted">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={attachment.file_name}
              className="w-full max-h-[55vh] object-contain rounded-lg mx-auto"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Preview unavailable
            </div>
          )}

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onPreview(attachment)}
            >
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
  );
}

/** Dialog uses a longer-lived signed URL + refresh-before-download */
function PreviewDialog({
  open,
  onOpenChange,
  attachment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: TestAttachment;
}) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const signed = await createSignedUrl(attachment.file_path, 60 * 30); // 30 min
      setImageUrl(signed);
    } catch (e) {
      setImageUrl("");
    } finally {
      setLoading(false);
    }
  }, [attachment.file_path]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  async function handleDownload() {
    // refresh to avoid expiry edge cases
    await refresh();
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = attachment.file_name;
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
        w-[95vw]
        sm:max-w-[95vw]
        lg:max-w-4xl
        max-h-[90vh]
        overflow-hidden
        flex
        flex-col
      "
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{attachment.file_name}</DialogTitle>
          <DialogDescription>
            {attachment.description || "No description"}
            {attachment.step_number != null
              ? ` • Step ${attachment.step_number}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 pb-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={attachment.file_name}
              className="w-full h-auto rounded-lg"
            />
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Preview unavailable (check storage policies).
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-3">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={!imageUrl}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
