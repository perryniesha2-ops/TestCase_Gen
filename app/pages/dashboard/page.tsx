"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";      // <-- ensure this path matches your project
import { SiteHeader } from "@/components/pagecomponents/site-header";      // <-- remove if your layout already has a header
import { cn } from "@/lib/utils";

import {
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Plus,
} from "lucide-react";

type Stat = {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
};

function StatCard({ s }: { s: Stat }) {
  const Icon = s.icon;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{s.value}</div>
        <p className="text-xs text-muted-foreground">{s.description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  // TODO: Replace with live data (Supabase) — this is placeholder
  const stats: Stat[] = [
    { title: "Total Test Cases", value: "0", description: "All generated test cases", icon: FileText },
    { title: "Completed", value: "0", description: "Test cases executed", icon: CheckCircle },
    { title: "Pending", value: "0", description: "Awaiting execution", icon: AlertCircle },
    { title: "Success Rate", value: "0%", description: "Pass rate this month", icon: TrendingUp },
  ];

  return (
<div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] md:gap-x-4 lg:gap-x-6">
      {/* Sidebar (visible on md+, Sheet inside AppSidebar for mobile) */}
      <AppSidebar className="hidden md:block" />

      {/* Main column */}
  <div className="flex min-h-screen flex-col">
        {/* Top header (remove if your root layout already renders one) */}
        <SiteHeader />

        {/* Page content */}
    <main className="container mx-auto w-full flex-1 px-4 py-6">
          
          {/* Top row: title + actions */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Overview of your testing activity and quality metrics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link href="/pages/generate">
                  <Plus className="mr-2 h-4 w-4" />
                  New Generation
                </Link>
              </Button>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.title} s={s} />
            ))}
          </div>

          <Separator className="my-6" />

          {/* Chart area (placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>Execution & Quality Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Replace this with your data chart (Recharts, Chart.js, etc.) */}
              <div
                id="dashboard-chart"
                className="h-[320px] w-full rounded-md border border-dashed text-sm text-muted-foreground grid place-items-center"
              >
                Chart placeholder — add your chart component here
              </div>
            </CardContent>
          </Card>

          {/* (Optional) second row for tables/sections later */}
          {/* <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <YourRecentActivity />
            <YourQualityGates />
          </div> */}
        </main>
      </div>
    </div>
  );
}
