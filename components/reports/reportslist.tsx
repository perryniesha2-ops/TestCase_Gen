// components/reports/ReportsList.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import type { SavedReport } from "./reportbuilder";

const DATE_RANGE_LABELS: Record<string, string> = {
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
  "90d": "90 days",
};

export function ReportsList() {
  const router = useRouter();
  const { user } = useAuth();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load reports");
    } else {
      setReports((data ?? []) as SavedReport[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchReports();
  }, [user]);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Delete report "${name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    const supabase = createClient();
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete report");
    } else {
      toast.success("Report deleted");
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build and save custom reports with the metrics that matter to you
          </p>
        </div>
        <Button onClick={() => router.push("/reports/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-16 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-4 opacity-40" />
          <p className="font-medium">No reports yet</p>
          <p className="text-sm mt-1 mb-4">
            Create a custom report with the metrics you care about
          </p>
          <Button onClick={() => router.push("/reports/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first report
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const sectionCount = report.config?.sections?.length ?? 0;
            const dateRange = report.config?.filters?.date_range ?? "30d";
            return (
              <Card
                key={report.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base truncate">
                      {report.name}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/reports/${report.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/reports/${report.id}/edit`)
                          }
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(report.id, report.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="text-xs">
                    Updated {new Date(report.updated_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {DATE_RANGE_LABELS[dateRange] ?? dateRange}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {sectionCount} section{sectionCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <Link href={`/reports/${report.id}`}>
                      <Eye className="h-3 w-3 mr-2" />
                      View Report
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
