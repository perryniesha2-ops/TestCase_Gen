// components/requirements/import-requirements-dialog.tsx
"use client";

import * as React from "react";
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
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";

import {
  toastError,
  toastSuccess,
  toastInfo,
  toastWarning,
} from "@/lib/utils/toast-utils";

interface ImportDialogProps {
  onImportComplete?: () => void;
  projectId?: string | null;
  children?: React.ReactNode;
}

type ImportResults = {
  imported: number;
  failed: number;
  total: number;
  errors: string[];
};

type ImportSource = {
  value: string;
  label: string;
  accept: string;
};

const SOURCES: ImportSource[] = [
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

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function readJsonSafely(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function humanizeImportError(data: any): string {
  // Prefer stable server codes when present
  switch (data?.code) {
    case "UNSUPPORTED_JSON_SHAPE":
      return "JSON file is not a supported requirements export.";
    case "NO_IMPORTABLE_ROWS":
      return "No requirements were found in this file.";
    case "INVALID_JSON":
      return "The JSON file is invalid or corrupted.";
    case "PARSE_ERROR":
      return "Could not read this file. Please verify the format.";
    default:
      return String(data?.error || "Import failed.");
  }
}

function normalizeSuccessResults(data: any): ImportResults {
  const imported = toNumber(data?.imported, 0);
  const failed = toNumber(data?.failed, 0);

  // total from server is ideal, but enforce consistency
  const serverTotal = toNumber(data?.total, imported + failed);
  const total = Math.max(serverTotal, imported + failed);

  const errors = Array.isArray(data?.errors) ? data.errors : [];

  return { imported, failed, total, errors };
}

function normalizeFailureResults(data: any): ImportResults {
  return {
    imported: 0,
    failed: 1,
    total: 1,
    errors: [humanizeImportError(data)],
  };
}

export function ImportRequirementsDialog({
                                           onImportComplete,
                                           projectId,
                                           children,
                                         }: ImportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [source, setSource] = React.useState<string>("jira");
  const [file, setFile] = React.useState<File | null>(null);
  const [results, setResults] = React.useState<ImportResults | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedSource = React.useMemo(
      () => SOURCES.find((s) => s.value === source) ?? SOURCES[0],
      [source],
  );

  const reset = React.useCallback(() => {
    setFile(null);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // When dialog closes, reset to avoid stale results/file
  React.useEffect(() => {
    if (!open) {
      setImporting(false);
      reset();
      setSource("jira");
    }
  }, [open, reset]);

  // If user changes source after selecting file, clear file/results to avoid mismatch
  const handleSourceChange = React.useCallback(
      (next: string) => {
        setSource(next);
        reset();
      },
      [reset],
  );

  const handleFileSelect = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
          setFile(selectedFile);
          setResults(null);
        }
      },
      [],
  );

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResults(null);
    }
  }, []);

  const downloadTemplate = React.useCallback(() => {
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

    toastSuccess("Template downloaded");
  }, []);

  const handleImport = React.useCallback(async () => {
    if (!file) {
      toastError("Please select a file");
      return;
    }

    setImporting(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);
      if (projectId) formData.append("project_id", projectId);

      const response = await fetch("/api/requirements/import", {
        method: "POST",
        body: formData,
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        const failure = normalizeFailureResults(data);
        setResults(failure);
        toastError(humanizeImportError(data));
        return;
      }

      const success = normalizeSuccessResults(data);
      setResults(success);

      if (success.imported > 0) {
        toastSuccess(
            `Imported ${success.imported} requirement${success.imported > 1 ? "s" : ""}.`,
        );
        await onImportComplete?.();
      } else {
        toastInfo("No requirements were imported.");
      }

      if (success.failed > 0) {
        toastWarning(
            `${success.failed} requirement${success.failed > 1 ? "s" : ""} failed to import.`,
        );
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to import requirements";
      setResults({ imported: 0, failed: 1, total: 1, errors: [msg] });
      toastError(msg);
    } finally {
      setImporting(false);
    }
  }, [file, source, projectId, onImportComplete]);

  const hasResults = !!results;
  const isSuccess = results ? results.failed === 0 : false;

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
              Upload requirements from Jira, Confluence, Azure DevOps, or CSV/Excel
              files.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Source Selection */}
            <div className="space-y-2">
              <Label>Import Source</Label>
              <Select
                  value={source}
                  onValueChange={handleSourceChange}
                  disabled={importing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
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
                          Drop a file here or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Accepted: {selectedSource.accept}
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
                  accept={selectedSource.accept}
                  onChange={handleFileSelect}
                  className="hidden"
              />
            </div>

            {/* Results */}
            {hasResults && results && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Import Results</h4>
                    <div className="flex items-center gap-2">
                      {isSuccess ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                      )}
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
                              {results.errors.map((err, i) => (
                                  <div key={i} className="truncate">
                                    • {err}
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
