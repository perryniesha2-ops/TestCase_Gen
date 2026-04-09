// components/requirements/import-requirements-dialog.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Sparkles,
  Target,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  /** IDs returned by the import API — needed for post-import analysis */
  imported_ids?: string[];
};

type AnalysisSummary = {
  requirementId: string;
  title: string;
  quality_score: number;
  critical_issues: number;
  suggested_criteria: number;
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
  const serverTotal = toNumber(data?.total, imported + failed);
  const total = Math.max(serverTotal, imported + failed);
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  const imported_ids = Array.isArray(data?.imported_ids)
    ? data.imported_ids
    : [];
  return { imported, failed, total, errors, imported_ids };
}

function normalizeFailureResults(data: any): ImportResults {
  return {
    imported: 0,
    failed: 1,
    total: 1,
    errors: [humanizeImportError(data)],
  };
}

function getScoreBadgeClass(score: number) {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export function ImportRequirementsDialog({
  onImportComplete,
  projectId,
  children,
}: ImportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [source, setSource] = React.useState<string>("jira");
  const [file, setFile] = React.useState<File | null>(null);
  const [results, setResults] = React.useState<ImportResults | null>(null);

  // Post-import analysis state
  const [analyzing, setAnalyzing] = React.useState(false);
  const [analysisProgress, setAnalysisProgress] = React.useState(0);
  const [analysisSummaries, setAnalysisSummaries] = React.useState<
    AnalysisSummary[]
  >([]);
  const [showAnalysis, setShowAnalysis] = React.useState(false);
  const [analysisComplete, setAnalysisComplete] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedSource = React.useMemo(
    () => SOURCES.find((s) => s.value === source) ?? SOURCES[0],
    [source],
  );

  const reset = React.useCallback(() => {
    setFile(null);
    setResults(null);
    setAnalysisSummaries([]);
    setAnalysisProgress(0);
    setShowAnalysis(false);
    setAnalysisComplete(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  React.useEffect(() => {
    if (!open) {
      setImporting(false);
      reset();
      setSource("jira");
    }
  }, [open, reset]);

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
    setAnalysisSummaries([]);
    setAnalysisComplete(false);

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

        // Refresh the list — call parent callback AND router.refresh()
        // router.refresh() handles server components; onImportComplete handles
        // client-side state in RequirementsList
        await onImportComplete?.();
        router.refresh();
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
  }, [file, source, projectId, onImportComplete, router]);

  /**
   * Runs quality analysis on each successfully imported requirement.
   * Fetches each requirement by ID, then calls /api/requirements/analyze.
   * Results are shown incrementally as each analysis completes.
   */
  const handleAnalyzeImported = React.useCallback(async () => {
    const ids = results?.imported_ids;
    if (!ids || ids.length === 0) {
      toastInfo(
        "Analysis not available — the import API did not return requirement IDs. Check that your import route returns imported_ids.",
      );
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisSummaries([]);
    setShowAnalysis(true);

    const summaries: AnalysisSummary[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        // Fetch requirement details
        const detailRes = await fetch(`/api/requirements/${id}`);
        if (!detailRes.ok) continue;
        const req = await detailRes.json();

        // Run quality analysis — saves result to DB via requirement_id
        const analysisRes = await fetch("/api/requirements/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requirement_id: id,
            title: req.title,
            description: req.description,
            acceptance_criteria: req.acceptance_criteria || [],
            type: req.type,
          }),
        });

        if (!analysisRes.ok) continue;
        const analysis = await analysisRes.json();

        summaries.push({
          requirementId: id,
          title: req.title,
          quality_score: analysis.quality_score ?? 0,
          critical_issues: Array.isArray(analysis.issues)
            ? analysis.issues.filter(
                (iss: any) => iss.level === "critical" || iss.level === "high",
              ).length
            : 0,
          suggested_criteria: Array.isArray(analysis.suggested_criteria)
            ? analysis.suggested_criteria.length
            : 0,
        });

        // Update progressively so user sees results as they come in
        setAnalysisSummaries([...summaries]);
        setAnalysisProgress(Math.round(((i + 1) / ids.length) * 100));
      } catch {
        // Skip failed analyses without blocking the rest
      }
    }

    setAnalysisComplete(true);
    setAnalyzing(false);

    if (summaries.length > 0) {
      const avg = Math.round(
        summaries.reduce((s, r) => s + r.quality_score, 0) / summaries.length,
      );
      if (avg >= 80) {
        toastSuccess(`Analysis complete — average quality score ${avg}/100`);
      } else if (avg >= 60) {
        toastInfo(`Analysis complete — average quality score ${avg}/100`);
      } else {
        toastWarning(
          `Analysis complete — average quality score ${avg}/100. Review requirements before use.`,
        );
      }
    }
  }, [results]);

  const hasResults = !!results;
  const isSuccess = results ? results.failed === 0 : false;
  // Can analyze if import succeeded and IDs were returned
  const hasImportedIds = (results?.imported_ids?.length ?? 0) > 0;
  const canAnalyze =
    hasResults && results!.imported > 0 && !analyzing && !analysisComplete;

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

      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Requirements</DialogTitle>
          <DialogDescription>
            Upload requirements from Jira, Confluence, Azure DevOps, or
            CSV/Excel files.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
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

          {/* Import Results */}
          {hasResults && results && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              {/* Summary row */}
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

              {/* Errors */}
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

              {/* AI Analysis section — only shown after successful import */}
              {results.imported > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        Quality Analysis
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {hasImportedIds
                          ? `Check ${results.imported} imported requirement${results.imported > 1 ? "s" : ""} for ambiguities and missing criteria`
                          : "Upgrade your import API to return imported_ids to enable per-requirement analysis"}
                      </p>
                    </div>

                    {canAnalyze && hasImportedIds ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAnalyzeImported}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze {results.imported}
                      </Button>
                    ) : analyzing ? (
                      <Button size="sm" variant="outline" disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing…
                      </Button>
                    ) : analysisComplete ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    ) : null}
                  </div>

                  {/* Progress bar while analyzing */}
                  {analyzing && (
                    <div className="space-y-1">
                      <Progress value={analysisProgress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        {analysisSummaries.length} / {results.imported}{" "}
                        analyzed…
                      </p>
                    </div>
                  )}

                  {/* Analysis results — shown progressively */}
                  {analysisSummaries.length > 0 && (
                    <Collapsible
                      open={showAnalysis}
                      onOpenChange={setShowAnalysis}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between p-0 h-auto"
                        >
                          <span className="text-sm font-medium">
                            Analysis Results ({analysisSummaries.length})
                          </span>
                          {showAnalysis ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="space-y-2 pt-2">
                        {analysisSummaries.map((s) => (
                          <div
                            key={s.requirementId}
                            className="flex items-center justify-between p-2 rounded border bg-background text-sm"
                          >
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="truncate font-medium">{s.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {s.critical_issues > 0
                                  ? `${s.critical_issues} critical issue${s.critical_issues > 1 ? "s" : ""}`
                                  : "No critical issues"}
                                {s.suggested_criteria > 0 &&
                                  ` · ${s.suggested_criteria} suggested criteria`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                className={getScoreBadgeClass(s.quality_score)}
                              >
                                {s.quality_score}/100
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                asChild
                              >
                                <a
                                  href={`/requirements/${s.requirementId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
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
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
            disabled={importing || analyzing}
          >
            Close
          </Button>

          <Button
            className="flex-1"
            onClick={handleImport}
            disabled={!file || importing || analyzing}
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
