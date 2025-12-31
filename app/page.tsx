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
  Edit,
  Trash2,
  Download,
} from "lucide-react";
import Link from "next/link";
import { surveyApi, demoData, Survey } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

export default function Dashboard() {
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

  // Fetch surveys from API
  const {
    data: surveysResponse,
    loading: surveysLoading,
    error: surveysError,
    refetch: refetchSurveys,
  } = useApi<{ surveys: Survey[] }>(() =>
    surveyApi.getAllSurveys().then((response) => ({ data: response }))
  );

  // const createExcelFile = (survey: any) => {
  //   const worksheetData = [
  //     ["userUniqueId", "surveyLink"],
  //     ...survey.share_tokens.map((item: any) => [
  //       item.agentUserUniqueId,
  //       `${process.env.NEXT_PUBLIC_FRONTEND_URL}/survey/${item.token_hash}`,
  //     ]),
  //   ];

  //   const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, "SurveyLinks");

  //   const excelBuffer = XLSX.write(workbook, {
  //     bookType: "xlsx",
  //     type: "array",
  //   });

  //   const blob = new Blob([excelBuffer], {
  //     type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //   });

  //   const file = new File([blob], "SurveyLinks.xlsx", {
  //     type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //   });

  //   return { workbook, file };
  // };

  // const handleDownload = (survey: any) => {
  //   try {
  //     if (survey.share_tokens && survey.share_tokens.length > 0) {
  //       const { workbook } = createExcelFile(survey);
  //       XLSX.writeFile(workbook, "SurveyLinks.xlsx");
  //     } else {
  //       // No agent share tokens → nothing to export as Excel
  //       toast.info(
  //         "No agent share tokens to export. Try sharing the survey link instead."
  //       );
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     toast.error("Failed to download Excel");
  //   }
  // };

  // const handleShare = async (survey: any) => {
  //   try {
  //     // ✅ Case 1: share_tokens.length > 0 → share Excel file via navigator.share
  //     if (survey.share_tokens && survey.share_tokens.length > 0) {
  //       const { file: blob } = createExcelFile(survey);
  //       console.log("File is", blob);

  //       if (navigator.canShare && navigator.canShare({ files: [blob] })) {
  //         console.log("Sharing file...");
  //         const file = new File([blob], "SurveyLinks.xlsx", {
  //           type: blob.type,
  //         });

  //         await navigator.share({
  //           title: "Survey Links",
  //           text: "Here are the survey sharing links.",
  //           files: [file],
  //         });
  //       } else {
  //         toast.info(
  //           "File sharing not supported on this device. Try downloading instead."
  //         );
  //       }
  //       return;
  //     }

  //     // ✅ Case 2: share_tokens.length == 0 → share single survey link (your original logic)
  //     const firstToken = survey.share_tokens?.[0];

  //     if (!firstToken || !firstToken.token_hash) {
  //       // This defends against undefined access
  //       toast.info("No share token available to create survey link.");
  //       return;
  //     }

  //     const url = window.location.origin + `/survey/${firstToken.token_hash}`;

  //     if (navigator.share) {
  //       await navigator.share({
  //         title: survey.title,
  //         text: `Check out this survey: ${survey.title}`,
  //         url,
  //       });
  //     } else {
  //       toast.info("Share feature not available on this device.");
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     toast.error("Failed to share survey");
  //   }
  // };

  // const handleShare = (survey: any) => {
  //   try {
  //     console.log(">>>>>> the value of the SURVEY IS : ", survey);
  //     if (survey.share_tokens.length > 0) {
  //       // Prepare worksheet data, header row first
  //       const worksheetData = [
  //         ["userUniqueId", "surveyLink"], // header row
  //         ...survey.share_tokens.map((item: any) => [
  //           item.agentUserUniqueId,
  //           `${process.env.NEXT_PUBLIC_FRONTEND_URL}/survey/${item.token_hash}`,
  //         ]),
  //       ];

  //       // Create worksheet and workbook
  //       const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  //       const workbook = XLSX.utils.book_new();
  //       XLSX.utils.book_append_sheet(workbook, worksheet, "SurveyLinks");

  //       // Trigger download
  //       XLSX.writeFile(workbook, "SurveyLinks.xlsx");
  //     } else {
  //       if (navigator.share) {
  //         navigator.share({
  //           title: survey.title,
  //           text: `Check out this survey: ${survey.title}`,
  //           url:
  //             window.location.origin +
  //             `/survey/${survey.share_tokens[0].token_hash}`,
  //         });
  //       } else {
  //         toast.info("Share feature not available on this device.");
  //       }
  //     }
  //   } catch (error) {
  //     toast.error("Failed to share survey");
  //   }
  // };

  // --- Helper function to prepare Workbook for Personalized Surveys ---
  const prepareWorkbook = (survey: any) => {
    // 1. Prepare worksheet data
    const worksheetData = [
      ["userUniqueId", "surveyLink"], // header row
      ...survey.share_tokens.map((item: any) => [
        item.agentUserUniqueId,
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/survey/${item.token_hash}`,
      ]),
    ];

    // 2. Create worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SurveyLinks");

    return workbook;
  };

  // =======================================================
  // Function for the DOWNLOAD Button (Personalized Surveys)
  // =======================================================
  const handleDownload = (survey: any) => {
    try {
      if (!survey.share_tokens || survey.share_tokens.length === 0) {
        toast.info("No survey links available to download.");
        return;
      }

      // For personalized surveys (share_tokens.length > 1), download Excel
      if (survey.share_tokens.length > 1) {
        const workbook = prepareWorkbook(survey);
        XLSX.writeFile(workbook, `${survey.title}_PersonalizedLinks.xlsx`);
        toast.success("Personalized survey links downloaded successfully!");
      } else {
        // For public surveys (share_tokens.length == 1), just show info
        toast.info(
          "This is a public survey. Use the share button to share the link."
        );
      }
    } catch (error) {
      console.error("Failed to download survey links:", error);
      toast.error("Failed to download survey links.");
    }
  };

  // =======================================================
  // Function for the SHARE Button
  // =======================================================
  const handleShare = async (survey: any) => {
    try {
      if (!survey.share_tokens || survey.share_tokens.length === 0) {
        toast.info("No survey links available to share.");
        return;
      }

      // Case 1: Personalized Survey (share_tokens.length > 1) - Share Excel File
      if (survey.share_tokens.length > 1) {
        console.log("📊 Personalized survey detected, preparing Excel file...");

        const workbook = prepareWorkbook(survey);
        const fileName = `${survey.title.replace(
          /[^a-z0-9]/gi,
          "_"
        )}_PersonalizedLinks.xlsx`;

        // Generate Excel file as Blob
        const excelBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });

        const mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        const excelBlob = new Blob([excelBuffer], { type: mimeType });

        // Create File object for sharing
        const fileToShare = new File([excelBlob], fileName, {
          type: mimeType,
          lastModified: Date.now(),
        });

        console.log("📁 File created:", {
          name: fileName,
          size: fileToShare.size,
          type: fileToShare.type,
        });

        // Try to share the file using Web Share API
        if (typeof navigator.share === "function") {
          try {
            // First check if we can share files
            if (
              typeof navigator.canShare === "function" &&
              navigator.canShare({ files: [fileToShare] })
            ) {
              console.log(
                "📱 Attempting to share Excel file via Web Share API..."
              );

              await navigator.share({
                files: [fileToShare],
                title: `Personalized Survey Links - ${survey.title}`,
                text: "Personalized survey links for distribution",
              });

              console.log("✅ Excel file shared successfully");
              toast.success("Excel file shared successfully!");
              return;
            } else {
              console.log(
                "⚠️ File sharing not supported, falling back to download"
              );
            }
          } catch (shareError: any) {
            if (shareError.name === "AbortError") {
              console.log("ℹ️ User cancelled the share dialog");
              return; // User cancelled, don't show error or download
            } else {
              console.error("❌ Share failed:", shareError);
              console.log("⚠️ Falling back to download");
            }
          }
        } else {
          console.log(
            "⚠️ Web Share API not available, falling back to download"
          );
        }

        // Fallback: Download the file
        console.log("📥 Downloading Excel file...");
        XLSX.writeFile(workbook, fileName);
        toast.success(
          "Excel file downloaded! You can now share it via email or messaging apps."
        );
        console.log("✅ Excel file downloaded successfully");
      }
      // Case 2: Public Survey (share_tokens.length == 1) - Share Public Link
      else if (survey.share_tokens.length === 1) {
        console.log("🔗 Public survey detected, preparing to share link...");

        const publicToken = survey.share_tokens[0];
        const publicUrl = `${window.location.origin}/survey/${publicToken.token_hash}`;

        // Check if Web Share API is available
        if (navigator.share) {
          try {
            console.log("📱 Attempting to share via Web Share API...");
            await navigator.share({
              title: survey.title,
              text: `Check out this survey: ${survey.title}`,
              url: publicUrl,
            });
            console.log("✅ Share successful");
            toast.success("Survey link shared successfully!");
          } catch (shareError: any) {
            if (shareError.name === "AbortError") {
              console.log("ℹ️ User cancelled the share dialog");
              // User cancelled, don't show error
            } else {
              console.error("❌ Share failed:", shareError);
              // Fallback to clipboard
              await navigator.clipboard.writeText(publicUrl);
              toast.success("Survey link copied to clipboard!");
            }
          }
        } else {
          // Web Share API not available, use clipboard
          console.log(
            "📋 Web Share API not available, copying to clipboard..."
          );
          await navigator.clipboard.writeText(publicUrl);
          toast.success("Survey link copied to clipboard!");
        }
      }
    } catch (error: any) {
      console.error("❌ Failed to share survey:", error);

      // Provide specific error messages
      if (error.name === "NotAllowedError") {
        toast.error(
          "Permission denied. Please allow clipboard/share access in your browser settings."
        );
      } else if (error.name === "AbortError") {
        // User dismissed the share dialog - don't show error
        console.log("ℹ️ Share dialog dismissed by user");
      } else {
        toast.error(`Failed to share: ${error.message || "Unknown error"}`);
      }
    }
  };

  const deleteSurveyFunction = async (survey: any) => {
    if (confirm("Are you sure you want to delete this survey?")) {
      const result = await surveyApi.deleteSurvey(survey.id);
      if (result) {
        refetchSurveys();
      }
    }
  };

  const handleRefresh = () => {
    refetchStats();
    refetchSurveys();
  };

  // Extract surveys from API response and handle empty state
  const surveys = surveysResponse?.surveys || [];
  const totalResponses = surveys.reduce(
    (sum: number, survey: any) => sum + survey?.responses?.length,
    0
  );
  const displayStats = stats || demoData.dashboardStats;

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

        {/* Error Display for Surveys */}
        {surveysError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-red-600 mt-0.5">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Surveys
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Failed to load your surveys: {surveysError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Total Surveys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : surveys.length}
              </div>
              {/* <p className="text-xs text-slate-500">
                +{displayStats.surveyGrowth}% from last month
              </p> */}
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
                {statsLoading
                  ? "..."
                  : totalResponses || displayStats.totalResponses}
              </div>
              {/* <p className="text-xs text-slate-500">
                +{displayStats.responseGrowth}% from last month
              </p> */}
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
                {statsLoading ? "..." : 100}%
                {/* {statsLoading ? "..." : displayStats.completionRate}% */}
              </div>
              {/* <p className="text-xs text-slate-500">
                +{displayStats.completionRateGrowth}% from last month
              </p> */}
            </CardContent>
          </Card>

          {/* <Card>
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
          </Card> */}
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
        {/* <div className="mt-6">
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
        </div> */}

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
            ) : surveys.length > 0 ? (
              surveys.slice(0, 5).map((survey: any, index: number) => (
                <Card key={survey.id || index}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{survey.title}</h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            survey.status === "DRAFT"
                              ? "bg-gray-100 text-gray-700"
                              : survey.status === "SCHEDULED"
                              ? "bg-blue-100 text-blue-700"
                              : survey.status === "PUBLISHED"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {survey.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {survey.description || "No description"} •{" "}
                        {survey.questions.length} questions
                        {survey.status === "SCHEDULED" &&
                          survey.scheduled_date && (
                            <>
                              {" "}
                              • Scheduled:{" "}
                              {new Date(
                                survey.scheduled_date
                              ).toLocaleDateString()}
                            </>
                          )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Show Edit button for DRAFT and SCHEDULED surveys */}
                      {(survey.status === "DRAFT" ||
                        survey.status === "SCHEDULED" ||
                        (survey.share_tokens?.length == 0 &&
                          survey.survey_send_by !== "VENDOR")) && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/generate-survey?edit=${survey.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      )}
                      {(survey.status === "DRAFT" ||
                        survey.status === "SCHEDULED" ||
                        (survey.share_tokens?.length == 0 &&
                          survey.survey_send_by !== "VENDOR")) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSurveyFunction(survey)}
                          className="h-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        // <Button asChild variant="outline" size="sm">
                        //   <Link href={`/generate-survey?edit=${survey.id}`}>
                        //     <Edit className="mr-2 h-4 w-4" />
                        //     Edit
                        //   </Link>
                        // </Button>
                      )}

                      {/* Show View Results for PUBLISHED surveys */}
                      {survey.status === "PUBLISHED" &&
                        (survey.share_tokens?.length > 0 ||
                          survey.survey_send_by === "VENDOR") && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/survey-results/${survey.id}`}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Results
                            </Link>
                          </Button>
                        )}

                      {/* Show Share button for DRAFT and SCHEDULED surveys */}
                      {survey.status === "PUBLISHED" &&
                        survey.share_tokens?.length === 1 &&
                        survey.survey_send_by !== "VENDOR" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare(survey)}
                          >
                            <Share className="h-4 w-4" />
                          </Button>
                        )}
                      {survey.status === "PUBLISHED" &&
                        survey.share_tokens?.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            // onClick={() => handleShare(survey)}
                            onClick={() => handleDownload(survey)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-slate-700 mb-2">
                      No surveys created
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
