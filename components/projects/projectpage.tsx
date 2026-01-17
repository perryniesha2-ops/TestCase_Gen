"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, FolderOpen, ArrowRight } from "lucide-react";

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string | null;
  color: string | null;
  icon: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function ProjectPageClient({ projectId }: { projectId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void loadProject();
  }, [user, projectId]);

  async function loadProject() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, user_id, name, description, status, color, icon, created_at, updated_at"
        )
        .eq("id", projectId)
        .single();

      if (error) throw error;

      if (data?.user_id !== user?.id) {
        toast.error("You do not have access to this project.");
        setProject(null);
        return;
      }

      setProject(data as ProjectRow);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load project");
      setProject(null);
    } finally {
      setLoading(false);
    }
  }

  // ---- Guards ----
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">
          Please sign in to view projects.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full gap-4">
      {/* Main */}
      <div className="flex min-h-screen flex-col px-4 md:px-6">
        <main className="mt-6 flex-1 w-full space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">
                Loading project…
              </span>
            </div>
          ) : !project ? (
            <Card className="w-[260px] shrink-0">
              <CardHeader>
                <CardTitle>Project not found</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>This project may not exist, or you may not have access.</p>
                <Button asChild variant="outline">
                  <Link href="/project-manager">Back to Projects</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                      Overview
                    </CardTitle>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Link
                        href={`/projects/${projectId}/settings/integrations`}
                      >
                        <Settings className="h-4 w-4" />
                        Integrations
                      </Link>
                    </Button>
                  </CardHeader>

                  <CardContent className="text-sm text-muted-foreground space-y-3">
                    <p>
                      Use this project as the “container” for requirements, test
                      cases, suites, and integrations.
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" className="gap-2">
                        <Link
                          href={`/requirements?project=${encodeURIComponent(
                            projectId
                          )}`}
                        >
                          Requirements <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <Link
                          href={`/test-cases?project=${encodeURIComponent(
                            projectId
                          )}`}
                        >
                          Test cases <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Project details</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <div>
                      <span className="font-medium text-foreground">
                        Status:
                      </span>{" "}
                      {project.status ?? "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Created:
                      </span>{" "}
                      {project.created_at
                        ? new Date(project.created_at).toLocaleString()
                        : "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Updated:
                      </span>{" "}
                      {project.updated_at
                        ? new Date(project.updated_at).toLocaleString()
                        : "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
