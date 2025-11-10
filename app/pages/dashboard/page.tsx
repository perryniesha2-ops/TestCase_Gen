"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/pagecomponents/app-sidebar";      
import { SiteHeader } from "@/components/pagecomponents/site-header";     
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

import {
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Plus,
  XCircle,
  Clock,
} from "lucide-react";

// Chart component for execution status
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

type Stat = {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
};

type ExecutionStats = {
  totalTestCases: number;
  passedCases: number;
  failedCases: number;
  notRunCases: number;
  successRate: number;
};

type ChartData = {
  name: string;
  value: number;
  color: string;
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
  const [stats, setStats] = useState<Stat[]>([
    { title: "Total Test Cases", value: "0", description: "All generated test cases", icon: FileText },
    { title: "Passed", value: "0", description: "Successfully executed", icon: CheckCircle },
    { title: "Failed", value: "0", description: "Failed execution", icon: XCircle },
    { title: "Success Rate", value: "0%", description: "Pass rate this month", icon: TrendingUp },
  ]);

  const [executionStats, setExecutionStats] = useState<ExecutionStats>({
    totalTestCases: 0,
    passedCases: 0,
    failedCases: 0,
    notRunCases: 0,
    successRate: 0
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Use the new comprehensive execution stats view
      const { data: stats, error: statsError } = await supabase
        .from('comprehensive_execution_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching stats:', statsError);
        return;
      }

      // Handle case where user has no test cases yet
      const userStats = stats || {
        total_test_cases: 0,
        total_passed: 0,
        total_failed: 0,
        total_skipped: 0,
        total_not_run: 0,
        success_rate: 0
      };

      const newExecutionStats = {
        totalTestCases: userStats.total_test_cases || 0,
        passedCases: userStats.total_passed || 0,
        failedCases: userStats.total_failed || 0,
        notRunCases: userStats.total_not_run || 0,
        successRate: userStats.success_rate || 0
      };

      setExecutionStats(newExecutionStats);

      // Update stats cards
      setStats([
        { title: "Total Test Cases", value: newExecutionStats.totalTestCases.toString(), description: "All generated test cases", icon: FileText },
        { title: "Passed", value: newExecutionStats.passedCases.toString(), description: "Successfully executed", icon: CheckCircle },
        { title: "Failed", value: newExecutionStats.failedCases.toString(), description: "Failed execution", icon: XCircle },
        { title: "Success Rate", value: `${newExecutionStats.successRate}%`, description: "Pass rate overall", icon: TrendingUp },
      ]);

      // Prepare chart data
      const newChartData: ChartData[] = [
        { name: 'Passed', value: newExecutionStats.passedCases, color: '#22c55e' },
        { name: 'Failed', value: newExecutionStats.failedCases, color: '#ef4444' },
        { name: 'Not Run', value: newExecutionStats.notRunCases, color: '#6b7280' }
      ].filter(item => item.value > 0); // Only show categories with values > 0

      setChartData(newChartData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  interface LabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: LabelProps) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label if slice is too small

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

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
                <Link href="/pages/cross-platform-testing">
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

          {/* Charts section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Execution Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Test Execution Status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Distribution of test case execution results
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No execution data yet</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Execute some test cases to see results here
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Legend */}
                {chartData.length > 0 && (
                  <div className="mt-4 flex justify-center gap-4">
                    {chartData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quality Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Success Rate Trend</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Test execution success rate over time
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center border border-dashed rounded-md">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Coming Soon</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Historical success rate trends
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          {executionStats.totalTestCases > 0 && (
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {executionStats.successRate}%
                      </div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round((executionStats.passedCases + executionStats.failedCases) / executionStats.totalTestCases * 100)}%
                      </div>
                      <p className="text-sm text-muted-foreground">Test Coverage</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {executionStats.notRunCases}
                      </div>
                      <p className="text-sm text-muted-foreground">Tests Remaining</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}