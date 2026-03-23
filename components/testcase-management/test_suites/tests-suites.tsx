"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";

import type { TestSuite, SuiteType, Project } from "@/types/test-cases";
import { TestSuiteTable } from "./test-suite-table";
import { CreateSuiteDialog } from "./dialogs/CreateSuiteDialog";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";

interface SuiteEditForm {
  name: string;
  status: string;
  suite_type: SuiteType;
}

export function TestSuitesPage() {
  const { user } = useAuth();
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  async function refreshSuites() {
    try {
      setLoading(true);

      const res = await fetch("/api/suites/overview", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const raw = await res.text().catch(() => "");
      let payload: any = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {}

      if (res.status === 401) {
        toast.error("Please log in again.");
        setTestSuites([]);
        return;
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? `Failed (${res.status})`);
      }

      setTestSuites((payload?.suites ?? []) as TestSuite[]);
    } catch (error: any) {
      console.error("Error fetching test suites:", error);
      toast.error(error?.message ?? "Failed to load test suites");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshSuites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getSuiteTypeColor(type: string) {
    switch (type) {
      case "regression":
        return "bg-blue-500 text-white";
      case "smoke":
        return "bg-green-500 text-white";
      case "integration":
        return "bg-purple-500 text-white";
      case "automated":
        return "bg-green-500 text-white";
      case "partial":
        return "bg-orange-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500">
            Active
          </Badge>
        );
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  }

  function getStatusIcon(status: string) {
    if (status === "active")
      return <Clock className="h-4 w-4 text-green-500" />;
    if (status === "completed")
      return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    return <AlertTriangle className="h-4 w-4 text-gray-400" />;
  }

  function getProjectColor(color: string): string {
    const colors: Record<string, string> = {
      blue: "text-blue-500",
      green: "text-green-500",
      purple: "text-purple-500",
      orange: "text-orange-500",
      red: "text-red-500",
      pink: "text-pink-500",
      indigo: "text-indigo-500",
      yellow: "text-yellow-500",
      gray: "text-gray-500",
    };
    return colors[color] || "text-gray-500";
  }

  function getDisplaySuiteType(suite: TestSuite) {
    if (suite.suite_type !== "manual") return suite.suite_type;
    return "manual";
  }

  const filteredSuites = testSuites.filter((suite) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      suite.name.toLowerCase().includes(s) ||
      (suite.description ?? "").toLowerCase().includes(s);
    const matchesType = filterType === "all" || suite.suite_type === filterType;
    const matchesProject =
      filterProject === "all" ||
      suite.project_id === filterProject ||
      (filterProject === "none" && !suite.project_id);
    return matchesSearch && matchesType && matchesProject;
  });

  function handleViewDetails(suite: TestSuite) {
    router.push(`/test-library/${suite.id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Test Suite
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading suites…
        </div>
      ) : (
        <TestSuiteTable
          suites={filteredSuites}
          searchTerm={searchTerm}
          filterType={filterType}
          onCreateSuite={() => setShowCreateDialog(true)}
          onViewDetails={handleViewDetails}
          getStatusIcon={getStatusIcon}
          getStatusBadge={getStatusBadge}
          getSuiteTypeColor={getSuiteTypeColor}
          getDisplaySuiteType={getDisplaySuiteType}
          getProjectColor={getProjectColor}
        />
      )}
      <CreateSuiteDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => void refreshSuites()}
      />{" "}
      <div className="h-4" />
    </div>
  );
}
