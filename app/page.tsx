"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import {
  BarChart3,
  LineChartIcon,
  PieChartIcon,
  Share,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { surveyApi, analyticsApi, apiWithFallback, demoData } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const [sentSurveys, setSentSurveys] = useState([]);
  const { user } = useAuth();

  // API calls with fallback to demo data
  // Note: Dashboard APIs are not yet implemented in the new backend
  // Using demo data until backend APIs are available
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApi(() => Promise.resolve({ data: demoData.dashboardStats }));

  const {
    data: charts,
    loading: chartsLoading,
    refetch: refetchCharts,
  } = useApi(() => Promise.resolve({ data: demoData.dashboardCharts }));

  const {
    data: recentSurveys,
    loading: surveysLoading,
    refetch: refetchSurveys,
  } = useApi(() =>
    apiWithFallback(() => surveyApi.getSurveys(), demoData.surveys)
  );

  useEffect(() => {
    // Load sent surveys from localStorage as fallback
    const savedSurveys = JSON.parse(
      localStorage.getItem("sentSurveys") || "[]"
    );
    setSentSurveys(savedSurveys);
  }, []);

  const handleShare = (survey) => {
    if (navigator.share) {
      navigator.share({
        title: survey.title,
        text: `Check out this survey: ${survey.title}`,
        url: window.location.origin + `/survey/${survey.id}`,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(
        `${window.location.origin}/survey/${survey.id}`
      );
      alert("Survey link copied to clipboard!");
    }
  };

  const handleRefresh = () => {
    refetchStats();
    refetchCharts();
    refetchSurveys();
  };

  // Use API data if available, otherwise use localStorage data
  const displaySurveys = recentSurveys || sentSurveys;
  const displayStats = stats || demoData.dashboardStats;
  const displayCharts = charts || demoData.dashboardCharts;

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Welcome back, {user?.name || "User"}!
            </h1>
            <p className="text-slate-600 mt-1">
              Here's an overview of your survey activity
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={statsLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${statsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/generate-survey">Generate Survey</Link>
            </Button>
          </div>
        </div>

        {/* Demo Data Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Demo Mode</h3>
              <p className="text-sm text-blue-700 mt-1">
                You're viewing demo data. Some backend APIs are still being
                implemented. Your surveys and data will be available once the
                backend is fully connected.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Total Surveys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : displayStats.totalSurveys}
              </div>
              <p className="text-xs text-slate-500">
                +{displayStats.surveyGrowth}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : displayStats.totalResponses}
              </div>
              <p className="text-xs text-slate-500">
                +{displayStats.responseGrowth}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : displayStats.completionRate}%
              </div>
              <p className="text-xs text-slate-500">
                +{displayStats.completionRateGrowth}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Avg. Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : displayStats.avgResponseTime} min
              </div>
              <p className="text-xs text-slate-500">
                -{displayStats.responseTimeImprovement}% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {statsError && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ Using demo data - API connection failed: {statsError}
            </p>
          </div>
        )}

        {/* Charts */}
        <div className="mt-6">
          <Tabs defaultValue="bar">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Survey Analytics
              </h2>
              <TabsList>
                <TabsTrigger value="bar">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Bar
                </TabsTrigger>
                <TabsTrigger value="line">
                  <LineChartIcon className="mr-2 h-4 w-4" />
                  Line
                </TabsTrigger>
                <TabsTrigger value="pie">
                  <PieChartIcon className="mr-2 h-4 w-4" />
                  Pie
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="bar" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {chartsLoading ? (
                    <div className="h-80 flex items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <BarChart
                      data={displayCharts.barChart}
                      index="category"
                      categories={["responses"]}
                      colors={["violet"]}
                      valueFormatter={(value) => `${value} responses`}
                      className="h-80"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="line" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {chartsLoading ? (
                    <div className="h-80 flex items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <LineChart
                      data={displayCharts.lineChart}
                      index="month"
                      categories={["surveys", "responses"]}
                      colors={["violet", "indigo"]}
                      valueFormatter={(value) => `${value}`}
                      className="h-80"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pie" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {chartsLoading ? (
                    <div className="h-80 flex items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <PieChart
                      data={displayCharts.pieChart}
                      index="category"
                      categories={["value"]}
                      colors={["violet", "indigo", "emerald", "amber", "rose"]}
                      valueFormatter={(value) => `${value}%`}
                      className="h-80"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Recent Surveys */}
        <div className="mt-6">
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            Recent Surveys
          </h2>
          <div className="space-y-4">
            {surveysLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                </CardContent>
              </Card>
            ) : displaySurveys.length > 0 ? (
              displaySurveys.slice(0, 5).map((survey, index) => (
                <Card key={survey.id || index}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-medium">{survey.title}</h3>
                      <p className="text-sm text-slate-500">
                        {survey.category} • {survey.responses || 0} responses •
                        Target: {survey.target}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/survey-results/${survey.id}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Results
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShare(survey)}
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-slate-700 mb-2">
                      No surveys yet
                    </h3>
                    <p className="text-slate-500 mb-4">
                      Create your first survey to see it here
                    </p>
                    <Button asChild>
                      <Link href="/generate-survey">Create Survey</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
