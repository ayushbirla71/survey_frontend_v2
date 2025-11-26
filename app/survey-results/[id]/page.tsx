"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Download,
  Share2,
  Users,
  Clock,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import { surveyResults } from "@/lib/assist-data";
import { useParams } from "next/navigation";
import { surveyResultsApi, apiWithFallback, responseApi } from "@/lib/api";
import { useApi, usePaginatedApi } from "@/hooks/useApi";
import { useEffect, useState } from "react";
import { exportResponsesToExcel } from "@/lib/exportExcel";
import { toast } from "react-toastify";

export default function SurveyResults() {
  const params = useParams();
  const surveyId = params.id as string;

  const [exportExcelLoading, setExportExcelLoading] = useState(false);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);

  // console.log(">>>>>>>>> THE VALUE OF SURVEYRESULTS IS : ", surveyResults);

  // API calls using new survey-results endpoints
  const {
    data: resultsData,
    loading: resultsLoading,
    error: resultsError,
    refetch: refetchResults,
  } = useApi(() => {
    return responseApi.getSurveyResults(surveyId);
  }, [surveyId]);
  // console.log("Results data is", resultsData);
  // console.log(">>> Results Error is", resultsError);

  // const {
  //   data: summaryData,
  //   loading: summaryLoading,
  //   error: summaryError,
  //   refetch: refetchSummary,
  // } = useApi(() => {
  //   return surveyResultsApi.getSummary(surveyId);
  // }, [surveyId]);

  // Use API data if available, otherwise use demo data
  let survey = null;
  if (resultsData) {
    // Transform new API response to match old format
    survey = {
      title: resultsData.title || "Survey",
      description: resultsData.description || "Survey Results",
      stats: {
        totalResponses: resultsData.stats.totalResponses || 0,
        completionRate: resultsData.stats.completionRate || "0",
        avgTime: 0,
        npsScore: 0,
      },
      questionResults: resultsData.questionResults || [],
      demographics: {
        age: [],
        gender: [],
        location: [],
      },
      responseTimeline: resultsData?.responseTimeline
        ? Object.entries(resultsData.responseTimeline).map(
            ([date, responses]) => ({
              date,
              responses: responses as number,
            })
          )
        : [],
      individualResponses: resultsData.individualResponses || [],
      // resultsData.responses?.map((response) => ({
      //   id: response.id,
      //   submittedAt: new Date(response.created_at).toLocaleDateString(),
      //   completionTime: 0,
      //   answers: response.response_answers?.map((answer) => ({
      //     question: answer.question?.question_text || "",
      //     answer:
      //       answer.answer_value ||
      //       answer.selected_option_ids?.join(", ") ||
      //       answer.scaleRatingValue?.toString() ||
      //       "",
      //   })),
      // })),
    };
  } else {
    // Fallback to demo data
    survey = surveyResults["survey-1"];
  }

  // const handleExport = async (format: "csv" | "json") => {
  //   try {
  //     const result = await surveyResultsApi.exportResults(surveyId, format);
  //     if (result.data) {
  //       // For JSON format, download as JSON file
  //       if (format === "json") {
  //         const blob = new Blob([JSON.stringify(result.data, null, 2)], {
  //           type: "application/json",
  //         });
  //         const url = URL.createObjectURL(blob);
  //         const a = document.createElement("a");
  //         a.href = url;
  //         a.download = `survey_results_${surveyId}.json`;
  //         document.body.appendChild(a);
  //         a.click();
  //         document.body.removeChild(a);
  //         URL.revokeObjectURL(url);
  //       } else {
  //         // For CSV format, the API should return CSV data
  //         alert("CSV export successful! Check your downloads.");
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Export failed:", error);
  //     alert("Export failed. Please try again.");
  //   }
  // };

  // ✨ UPDATED EXPORT HANDLER
  const handleExport = async (format: "excel" | "pdf") => {
    if (format === "excel") {
      setExportExcelLoading(true);
      try {
        const result: any = await surveyResultsApi.exportResults(surveyId);
        // console.log("Export result is", result);
        if (result.data) {
          exportResponsesToExcel(
            result.data.title,
            result.data.questionResults,
            result.data.individualResponses,
            result.data.stats
          );
        }
      } catch (error) {
        console.error("Excel Export failed:", error);
        toast.error("Excel Export failed. Please try again.");
      } finally {
        setExportExcelLoading(false);
      }
    }

    if (format === "pdf") {
      setExportPdfLoading(true);
      try {
        const { exportSurveyToPDF } = await import("@/lib/exportPDF");
        exportSurveyToPDF();
      } catch (error) {
        console.error("PDF Export failed:", error);
        toast.error("PDF Export failed. Please try again.");
      } finally {
        setExportPdfLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    refetchResults();
    refetchSummary();
  };

  // Helpers for grid rendering
  const getGridColumns = (
    rows: Array<{
      row: string;
      cells: Array<{ column: string; count: number; percentage: number }>;
    }>
  ) => {
    const set = new Set<string>();
    rows?.forEach((r) => r?.cells?.forEach((c) => set.add(c.column)));
    return Array.from(set);
  };

  const fmtPct = (n?: number) => (typeof n === "number" ? `${n}%` : "0%");

  return (
    <div className="p-6" id="export-section">
      {/* <div id="export-section"></div> */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="pdf-hide">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">
              {survey.title}
            </h1>
            <p className="text-slate-500">{survey.description}</p>
          </div>
          <div className="flex gap-2 pdf-hide">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={resultsLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  resultsLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={exportExcelLoading || exportPdfLoading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exportExcelLoading || exportPdfLoading
                    ? "Exporting..."
                    : "Export"}
                </Button>
                {/* <Button variant="outline" onClick={() => handleExport("csv")}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button> */}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => handleExport("excel")}
                  className="cursor-pointer"
                  disabled={exportExcelLoading}
                >
                  {exportExcelLoading ? "Exporting..." : "Export Excel"}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleExport("pdf")}
                  className="cursor-pointer"
                  disabled={exportPdfLoading}
                >
                  {exportPdfLoading ? "Exporting..." : "Export PDF"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* <Button variant="outline">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button> */}
          </div>
        </div>

        {/* Error Display */}
        {resultsError && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ Using demo data - API connection failed: {resultsError}
            </p>
          </div>
        )}

        {/* Survey Status */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center p-4">
              <Users className="mr-3 h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {resultsLoading ? "..." : survey.stats?.totalResponses || 0}
                </p>
                <p className="text-sm text-slate-500">Total Responses</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4">
              <CheckCircle className="mr-3 h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {resultsLoading ? "..." : survey.stats?.completionRate || 0}%
                </p>
                <p className="text-sm text-slate-500">Completion Rate</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4">
              <Clock className="mr-3 h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {resultsLoading ? "..." : survey.stats?.avgTime || 0} min
                </p>
                <p className="text-sm text-slate-500">Avg. Time</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4">
              <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                <span className="text-sm font-bold text-violet-600">
                  {resultsLoading ? "..." : survey.stats?.npsScore || 0}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold">NPS Score</p>
                <p className="text-sm text-slate-500">Net Promoter</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Survey Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {/* <TabsTrigger value="responses">Individual Responses</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger> */}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {resultsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            /* Question Results */
            survey.questionResults?.map((question: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{question.question}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{question.type}</Badge>
                    <span className="text-sm text-slate-500">
                      {question.responses} responses
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {(question.type === "single_choice" ||
                    question.type === "multiple_choice" ||
                    question.type === "checkbox") && (
                    <div className="space-y-3">
                      {question.data?.map((item: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{item.option}</span>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={item.percentage}
                              className="w-32"
                            />
                            <span className="text-sm font-medium">
                              {item.percentage}%
                            </span>
                            <span className="text-xs text-slate-500">
                              ({item.count})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === "rating" && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-violet-600">
                          {question.averageRating}
                        </div>
                        <div className="text-sm text-slate-500">
                          Average Rating
                        </div>
                      </div>
                      <BarChart
                        data={question.data || []}
                        index="rating"
                        categories={["count"]}
                        colors={["violet"]}
                        valueFormatter={(value) => `${value} responses`}
                        className="h-48"
                      />
                    </div>
                  )}

                  {question.type === "text" && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">
                        Recent responses:
                      </p>
                      {question.sampleResponses?.map(
                        (response: any, i: number) => (
                          <div
                            key={i}
                            className="rounded-md bg-slate-50 p-3 text-sm"
                          >
                            "{response}"
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {question.type === "grid" && (
                    <div className="space-y-4">
                      {/* Build headers from the grid data */}
                      {(() => {
                        const rows = (question.data || []) as Array<{
                          row: string;
                          cells: Array<{
                            column: string;
                            count: number;
                            percentage: number;
                          }>;
                        }>;
                        const columns = getGridColumns(rows);

                        if (!rows?.length || !columns?.length) {
                          return (
                            <p className="text-sm text-slate-500">
                              No grid responses yet.
                            </p>
                          );
                        }

                        return (
                          <div className="w-full overflow-x-auto rounded-md border">
                            <table className="min-w-[640px] w-full text-sm">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                                    Row
                                  </th>
                                  {columns.map((col, ci) => (
                                    <th
                                      key={ci}
                                      className="px-3 py-2 text-left font-medium text-slate-600"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r, ri) => (
                                  <tr key={ri} className="border-t">
                                    <td className="px-3 py-2 font-medium text-slate-700">
                                      {r.row}
                                    </td>
                                    {columns.map((col, ci) => {
                                      const cell = r.cells.find(
                                        (c) => c.column === col
                                      ) || { count: 0, percentage: 0 };
                                      return (
                                        <td key={ci} className="px-3 py-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-28">
                                              <Progress
                                                value={cell.percentage ?? 0}
                                              />
                                            </div>
                                            <span className="text-xs text-slate-600">
                                              {cell.count} (
                                              {fmtPct(cell.percentage)})
                                            </span>
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Responses</CardTitle>
            </CardHeader>
            <CardContent>
              {resultsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {(survey.individualResponses || []).map(
                    (response: any, index: number) => (
                      <div
                        key={response.id || index}
                        className="rounded-lg border p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium">
                            Response #{response.id}
                          </span>
                          <div className="flex items-center gap-2">
                            {response.completionTime > 0 && (
                              <Badge variant="outline">
                                {response.completionTime} min
                              </Badge>
                            )}
                            <span className="text-sm text-slate-500">
                              {response.submittedAt}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {response.answers?.map((answer: any, i: number) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium">
                                {answer.question}:
                              </span>
                              <span className="ml-2 text-slate-600">
                                {answer.answer}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Pagination info */}
              {resultsData && (
                <div className="mt-6 text-center text-sm text-slate-500">
                  Showing {resultsData.individualResponses?.length || 0} of{" "}
                  {resultsData.stats?.totalResponses || 0} responses
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          {resultsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Age Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <PieChart
                    data={survey.demographics?.age || []}
                    index="ageGroup"
                    categories={["count"]}
                    colors={["violet", "indigo", "emerald", "amber", "rose"]}
                    className="h-64"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gender Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <PieChart
                    data={survey.demographics?.gender || []}
                    index="gender"
                    categories={["count"]}
                    colors={["violet", "indigo", "emerald"]}
                    className="h-64"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={survey.demographics?.location || []}
                    index="location"
                    categories={["count"]}
                    colors={["violet"]}
                    valueFormatter={(value) => `${value} responses`}
                    className="h-64"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={survey.responseTimeline || []}
                    index="date"
                    categories={["responses"]}
                    colors={["violet"]}
                    valueFormatter={(value) => `${value} responses`}
                    className="h-64"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export Survey Data</CardTitle>
              <p className="text-slate-500">
                Download your survey results in various formats
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Button
                    variant="outline"
                    className="h-20 flex-col bg-transparent"
                    onClick={() => handleExport("excel")}
                    disabled={exportExcelLoading}
                  >
                    {exportExcelLoading ? (
                      <RefreshCw className="mb-2 h-6 w-6 animate-spin" />
                    ) : (
                      <Download className="mb-2 h-6 w-6" />
                    )}
                    {exportExcelLoading ? "Exporting..." : "Export as Excel"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col bg-transparent"
                    onClick={() => handleExport("pdf")}
                    disabled={exportPdfLoading}
                  >
                    {exportPdfLoading ? (
                      <RefreshCw className="mb-2 h-6 w-6 animate-spin" />
                    ) : (
                      <Download className="mb-2 h-6 w-6" />
                    )}
                    {exportPdfLoading ? "Exporting..." : "Export PDF"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// "use client";

// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Badge } from "@/components/ui/badge";
// import { Progress } from "@/components/ui/progress";
// import {
//   ArrowLeft,
//   Download,
//   Share2,
//   Users,
//   Clock,
//   CheckCircle,
//   RefreshCw,
// } from "lucide-react";
// import Link from "next/link";
// import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
// import { surveyResults } from "@/lib/assist-data";
// import { useParams } from "next/navigation";
// import { surveyResultsApi, apiWithFallback, responseApi } from "@/lib/api";
// import { useApi, usePaginatedApi } from "@/hooks/useApi";
// import { useEffect } from "react";

// export default function SurveyResults() {
//   const params = useParams();
//   const surveyId = params.id as string;

//   // API calls using new survey-results endpoints
//   const {
//     data: resultsData,
//     loading: resultsLoading,
//     error: resultsError,
//     refetch: refetchResults,
//   } = useApi(() => {
//     return responseApi.getSurveyResults(surveyId);
//   }, [surveyId]);
//   console.log("Results data is", resultsData);
//   console.log(">>> Results Error is", resultsError);

//   const {
//     data: summaryData,
//     loading: summaryLoading,
//     error: summaryError,
//     refetch: refetchSummary,
//   } = useApi(() => {
//     return surveyResultsApi.getSummary(surveyId);
//   }, [surveyId]);

//   // Use API data if available, otherwise use demo data
//   let survey = null;
//   if (resultsData?.data) {
//     // Transform new API response to match old format
//     survey = {
//       title: resultsData.survey.title || "Survey",
//       description: resultsData.survey.description || "Survey Results",
//       stats: {
//         totalResponses: resultsData.totalResponses || 0,
//         completionRate: summaryData?.completionRate || "0",
//         avgTime: 0,
//         npsScore: 0,
//       },
//       questionResults: [],
//       demographics: {
//         age: [],
//         gender: [],
//         location: [],
//       },
//       responseTimeline: summaryData?.data?.responseTimeline
//         ? Object.entries(summaryData.data.responseTimeline).map(
//             ([date, responses]) => ({
//               date,
//               responses: responses as number,
//             })
//           )
//         : [],
//       individualResponses: resultsData.data.responses?.map((response) => ({
//         id: response.id,
//         submittedAt: new Date(response.created_at).toLocaleDateString(),
//         completionTime: 0,
//         answers: response.response_answers?.map((answer) => ({
//           question: answer.question?.question_text || "",
//           answer:
//             answer.answer_value ||
//             answer.selected_option_ids?.join(", ") ||
//             answer.scaleRatingValue?.toString() ||
//             "",
//         })),
//       })),
//     };
//   } else {
//     // Fallback to demo data
//     survey = surveyResults[surveyId] || surveyResults["survey-1"];
//   }

//   const handleExport = async (format: "csv" | "json") => {
//     try {
//       const result = await surveyResultsApi.exportResults(surveyId, format);
//       if (result.data) {
//         // For JSON format, download as JSON file
//         if (format === "json") {
//           const blob = new Blob([JSON.stringify(result.data, null, 2)], {
//             type: "application/json",
//           });
//           const url = URL.createObjectURL(blob);
//           const a = document.createElement("a");
//           a.href = url;
//           a.download = `survey_results_${surveyId}.json`;
//           document.body.appendChild(a);
//           a.click();
//           document.body.removeChild(a);
//           URL.revokeObjectURL(url);
//         } else {
//           // For CSV format, the API should return CSV data
//           alert("CSV export successful! Check your downloads.");
//         }
//       }
//     } catch (error) {
//       console.error("Export failed:", error);
//       alert("Export failed. Please try again.");
//     }
//   };

//   const handleRefresh = () => {
//     refetchResults();
//     refetchSummary();
//   };

//   return (
//     <div className="p-6">
//       <div className="mb-8">
//         <div className="flex items-center gap-4">
//           <Button variant="outline" size="icon" asChild>
//             <Link href="/">
//               <ArrowLeft className="h-4 w-4" />
//             </Link>
//           </Button>
//           <div className="flex-1">
//             <h1 className="text-3xl font-bold text-slate-800">
//               {survey.title}
//             </h1>
//             <p className="text-slate-500">{survey.description}</p>
//           </div>
//           <div className="flex gap-2">
//             <Button
//               variant="outline"
//               onClick={handleRefresh}
//               disabled={resultsLoading}
//             >
//               <RefreshCw
//                 className={`mr-2 h-4 w-4 ${
//                   resultsLoading ? "animate-spin" : ""
//                 }`}
//               />
//               Refresh
//             </Button>
//             <Button variant="outline" onClick={() => handleExport("csv")}>
//               <Download className="mr-2 h-4 w-4" />
//               Export
//             </Button>
//             <Button variant="outline">
//               <Share2 className="mr-2 h-4 w-4" />
//               Share
//             </Button>
//           </div>
//         </div>

//         {/* Error Display */}
//         {resultsError && (
//           <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//             <p className="text-yellow-800 text-sm">
//               ⚠️ Using demo data - API connection failed: {resultsError}
//             </p>
//           </div>
//         )}

//         {/* Survey Status */}
//         <div className="mt-6 grid gap-4 md:grid-cols-4">
//           <Card>
//             <CardContent className="flex items-center p-4">
//               <Users className="mr-3 h-8 w-8 text-blue-500" />
//               <div>
//                 <p className="text-2xl font-bold">
//                   {resultsLoading ? "..." : survey.stats?.totalResponses || 0}
//                 </p>
//                 <p className="text-sm text-slate-500">Total Responses</p>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardContent className="flex items-center p-4">
//               <CheckCircle className="mr-3 h-8 w-8 text-green-500" />
//               <div>
//                 <p className="text-2xl font-bold">
//                   {resultsLoading ? "..." : survey.stats?.completionRate || 0}%
//                 </p>
//                 <p className="text-sm text-slate-500">Completion Rate</p>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardContent className="flex items-center p-4">
//               <Clock className="mr-3 h-8 w-8 text-orange-500" />
//               <div>
//                 <p className="text-2xl font-bold">
//                   {resultsLoading ? "..." : survey.stats?.avgTime || 0} min
//                 </p>
//                 <p className="text-sm text-slate-500">Avg. Time</p>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardContent className="flex items-center p-4">
//               <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
//                 <span className="text-sm font-bold text-violet-600">
//                   {resultsLoading ? "..." : survey.stats?.npsScore || 0}
//                 </span>
//               </div>
//               <div>
//                 <p className="text-2xl font-bold">NPS Score</p>
//                 <p className="text-sm text-slate-500">Net Promoter</p>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </div>

//       {/* Survey Details */}
//       <Tabs defaultValue="overview" className="space-y-4">
//         <TabsList>
//           <TabsTrigger value="overview">Overview</TabsTrigger>
//           <TabsTrigger value="responses">Individual Responses</TabsTrigger>
//           <TabsTrigger value="demographics">Demographics</TabsTrigger>
//           <TabsTrigger value="export">Export Data</TabsTrigger>
//         </TabsList>

//         <TabsContent value="overview" className="space-y-6">
//           {resultsLoading ? (
//             <div className="flex items-center justify-center py-12">
//               <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
//             </div>
//           ) : (
//             /* Question Results */
//             survey.questionResults?.map((question, index) => (
//               <Card key={index}>
//                 <CardHeader>
//                   <CardTitle className="text-lg">{question.question}</CardTitle>
//                   <div className="flex items-center gap-2">
//                     <Badge variant="secondary">{question.type}</Badge>
//                     <span className="text-sm text-slate-500">
//                       {question.responses} responses
//                     </span>
//                   </div>
//                 </CardHeader>
//                 <CardContent>
//                   {question.type === "single_choice" && (
//                     <div className="space-y-3">
//                       {question.data?.map((item, i) => (
//                         <div
//                           key={i}
//                           className="flex items-center justify-between"
//                         >
//                           <span className="text-sm">{item.option}</span>
//                           <div className="flex items-center gap-2">
//                             <Progress
//                               value={item.percentage}
//                               className="w-32"
//                             />
//                             <span className="text-sm font-medium">
//                               {item.percentage}%
//                             </span>
//                             <span className="text-xs text-slate-500">
//                               ({item.count})
//                             </span>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   {question.type === "rating" && (
//                     <div className="space-y-4">
//                       <div className="text-center">
//                         <div className="text-3xl font-bold text-violet-600">
//                           {question.averageRating}
//                         </div>
//                         <div className="text-sm text-slate-500">
//                           Average Rating
//                         </div>
//                       </div>
//                       <BarChart
//                         data={question.data || []}
//                         index="rating"
//                         categories={["count"]}
//                         colors={["violet"]}
//                         valueFormatter={(value) => `${value} responses`}
//                         className="h-48"
//                       />
//                     </div>
//                   )}

//                   {question.type === "text" && (
//                     <div className="space-y-2">
//                       <p className="text-sm text-slate-500">
//                         Recent responses:
//                       </p>
//                       {question.sampleResponses?.map((response, i) => (
//                         <div
//                           key={i}
//                           className="rounded-md bg-slate-50 p-3 text-sm"
//                         >
//                           "{response}"
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>
//             ))
//           )}
//         </TabsContent>

//         <TabsContent value="responses" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>Individual Responses</CardTitle>
//             </CardHeader>
//             <CardContent>
//               {resultsLoading ? (
//                 <div className="flex items-center justify-center py-12">
//                   <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {(survey.individualResponses || []).map((response, index) => (
//                     <div
//                       key={response.id || index}
//                       className="rounded-lg border p-4"
//                     >
//                       <div className="mb-2 flex items-center justify-between">
//                         <span className="font-medium">
//                           Response #{response.id}
//                         </span>
//                         <div className="flex items-center gap-2">
//                           {response.completionTime > 0 && (
//                             <Badge variant="outline">
//                               {response.completionTime} min
//                             </Badge>
//                           )}
//                           <span className="text-sm text-slate-500">
//                             {response.submittedAt}
//                           </span>
//                         </div>
//                       </div>
//                       <div className="space-y-2">
//                         {response.answers?.map((answer, i) => (
//                           <div key={i} className="text-sm">
//                             <span className="font-medium">
//                               {answer.question}:
//                             </span>
//                             <span className="ml-2 text-slate-600">
//                               {answer.answer}
//                             </span>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* Pagination info */}
//               {resultsData?.data && (
//                 <div className="mt-6 text-center text-sm text-slate-500">
//                   Showing {resultsData.data.responses?.length || 0} of{" "}
//                   {resultsData.data.totalResponses || 0} responses
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="demographics" className="space-y-6">
//           {resultsLoading ? (
//             <div className="flex items-center justify-center py-12">
//               <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
//             </div>
//           ) : (
//             <div className="grid gap-6 md:grid-cols-2">
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Age Distribution</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <PieChart
//                     data={survey.demographics?.age || []}
//                     index="ageGroup"
//                     categories={["count"]}
//                     colors={["violet", "indigo", "emerald", "amber", "rose"]}
//                     className="h-64"
//                   />
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader>
//                   <CardTitle>Gender Distribution</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <PieChart
//                     data={survey.demographics?.gender || []}
//                     index="gender"
//                     categories={["count"]}
//                     colors={["violet", "indigo", "emerald"]}
//                     className="h-64"
//                   />
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader>
//                   <CardTitle>Location Distribution</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <BarChart
//                     data={survey.demographics?.location || []}
//                     index="location"
//                     categories={["count"]}
//                     colors={["violet"]}
//                     valueFormatter={(value) => `${value} responses`}
//                     className="h-64"
//                   />
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader>
//                   <CardTitle>Response Timeline</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <LineChart
//                     data={survey.responseTimeline || []}
//                     index="date"
//                     categories={["responses"]}
//                     colors={["violet"]}
//                     valueFormatter={(value) => `${value} responses`}
//                     className="h-64"
//                   />
//                 </CardContent>
//               </Card>
//             </div>
//           )}
//         </TabsContent>

//         <TabsContent value="export">
//           <Card>
//             <CardHeader>
//               <CardTitle>Export Survey Data</CardTitle>
//               <p className="text-slate-500">
//                 Download your survey results in various formats
//               </p>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 <div className="grid gap-4 md:grid-cols-2">
//                   <Button
//                     variant="outline"
//                     className="h-20 flex-col bg-transparent"
//                     onClick={() => handleExport("csv")}
//                   >
//                     <Download className="mb-2 h-6 w-6" />
//                     Export as CSV
//                   </Button>
//                   <Button
//                     variant="outline"
//                     className="h-20 flex-col bg-transparent"
//                     onClick={() => handleExport("json")}
//                   >
//                     <Download className="mb-2 h-6 w-6" />
//                     Export Raw Data (JSON)
//                   </Button>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
