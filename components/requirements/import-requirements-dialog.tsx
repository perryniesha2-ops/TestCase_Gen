// components/requirements/import-requirements-dialog.tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";

interface ImportDialogProps {
  onImportComplete?: () => void;
  projectId?: string | null;
  children?: React.ReactNode;
}

export function ImportRequirementsDialog({
  onImportComplete,
  projectId,
  children,
}: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [source, setSource] = useState<string>("jira");
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<{
    imported: number;
    failed: number;
    total: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sources = [
    { value: "jira", label: "Jira (CSV/JSON)", accept: ".csv,.json" },
    { value: "confluence", label: "Confluence (JSON)", accept: ".json" },
    {
      value: "azure",
      label: "Azure DevOps (CSV/JSON/Excel)",
      accept: ".csv,.json,.xlsx",
    },
    { value: "csv", label: "Generic CSV", accept: ".csv" },
    { value: "excel", label: "Excel Spreadsheet", accept: ".xlsx,.xls" },
    { value: "json", label: "JSON File", accept: ".json" },
  ];

  const selectedSource = sources.find((s) => s.value === source);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResults(null);
    }
  }

  async function handleImport() {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setImporting(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);
      if (projectId) {
        formData.append("project_id", projectId);
      }

      const response = await fetch("/api/requirements/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResults({
        imported: data.imported,
        failed: data.failed,
        total: data.total,
        errors: data.errors || [],
      });

      if (data.imported > 0) {
        toast.success(
          `Imported ${data.imported} requirement${data.imported > 1 ? "s" : ""}!`,
        );
        await onImportComplete?.();
      }

      if (data.failed > 0) {
        toast.warning(
          `${data.failed} requirement${data.failed > 1 ? "s" : ""} failed to import`,
        );
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error?.message || "Failed to import requirements");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFile(null);
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function downloadTemplate() {
    // Create CSV template
    const template = `title,description,type,priority,status,external_id,acceptance_criteria
"User Login Feature","Users should be able to log in with email and password","functional","high","draft","JIRA-123","User enters valid credentials; System authenticates; User is redirected to dashboard"
"Password Reset","Users can reset their password via email","functional","medium","draft","JIRA-124","User clicks Forgot Password; Email sent with reset link; User creates new password"`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "requirements-template.csv";
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Template downloaded");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Requirements</DialogTitle>
          <DialogDescription>
            Upload requirements from Jira, Confluence, Azure DevOps, or
            CSV/Excel files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Selection */}
          <div className="space-y-2">
            <Label>Import Source</Label>
            <Select
              value={source}
              onValueChange={setSource}
              disabled={importing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload File</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                file
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-3">
                  <FileText className="h-12 w-12 mx-auto text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    disabled={importing}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      Drop file here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Accepted: {selectedSource?.accept}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                  >
                    Select File
                  </Button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={selectedSource?.accept}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Import Results</h4>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    {results.imported} / {results.total} imported
                  </span>
                </div>
              </div>

              {results.failed > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {results.failed} failed
                    </span>
                  </div>
                  {results.errors.length > 0 && (
                    <div className="text-xs space-y-1 text-muted-foreground max-h-32 overflow-y-auto">
                      {results.errors.map((error, i) => (
                        <div key={i} className="truncate">
                          • {error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              <strong>Required columns:</strong> title, description
            </p>
            <p>
              <strong>Optional columns:</strong> type, priority, status,
              external_id, acceptance_criteria
            </p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={downloadTemplate}
            >
              <Download className="h-3 w-3 mr-1" />
              Download CSV Template
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
            disabled={importing}
          >
            Close
          </Button>
          <Button
            className="flex-1"
            onClick={handleImport}
            disabled={!file || importing}
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Requirements
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
