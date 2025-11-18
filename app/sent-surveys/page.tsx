"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  MoreHorizontal,
  Search,
  Filter,
  Share,
  Trash2,
  Edit,
  Copy,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { surveyApi } from "@/lib/api";
import { usePaginatedApi, useMutation, useApi } from "@/hooks/useApi";
import { toast } from "react-toastify";

// Survey model from new API
export interface Survey {
  id: string;
  title: string;
  description?: string;
  no_of_questions: number;
  userId: string;
  survey_send_by: "WHATSAPP" | "EMAIL" | "BOTH" | "NONE";
  flow_type: "STATIC" | "INTERACTIVE" | "GAME";
  settings: {
    isAnonymous?: boolean;
    showProgressBar?: boolean;
    shuffleQuestions?: boolean;
  };
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  scheduled_date?: string;
  scheduled_type: "IMMEDIATE" | "SCHEDULED";
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  surveyCategoryId: string;
  autoGenerateQuestions: any;
}

export default function SentSurveys() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [localSurveys, setLocalSurveys] = useState([]);

  // API calls with pagination
  // const {
  //   data: surveys,
  //   // pagination,
  //   loading,
  //   error,
  //   updateParams,
  //   refetch,
  // } = usePaginatedApi((params) => surveyApi.getAllSurveys(params), {
  //   page: 1,
  //   limit: 12,
  //   search: searchQuery,
  //   status: statusFilter === "all" ? undefined : statusFilter,
  // });

  const {
    data: surveysResponse,
    loading: loading,
    error: error,
    refetch,
  } = useApi<{ surveys: Survey[] }>(() =>
    surveyApi.getAllSurveys().then((response) => ({ data: response }))
  );
  const surveys = surveysResponse?.surveys || [];
  console.log("Surveys are", surveys);

  // const {
  //   data: surveys,
  //   // pagination,
  //   loading,
  //   error,
  //   updateParams,
  //   refetch,
  // } = usePaginatedApi((params) => surveyApi.getAllSurveys(params), {
  //   page: 1,
  //   limit: 12,
  //   search: searchQuery,
  //   status: statusFilter === "all" ? undefined : statusFilter,
  // });

  // Mutations
  const { mutate: deleteSurvey, loading: deleteLoading } = useMutation(
    surveyApi.deleteSurvey
  );
  // const { mutate: duplicateSurvey, loading: duplicateLoading } = useMutation(
  //   surveyApi.duplicateSurvey
  // );
  // const { mutate: updateSurvey, loading: updateLoading } = useMutation(
  //   surveyApi.updateSurvey
  // );

  useEffect(() => {
    // Load surveys from localStorage as fallback
    const savedSurveys = JSON.parse(
      localStorage.getItem("sentSurveys") || "[]"
    );
    setLocalSurveys(savedSurveys);
  }, []);

  // useEffect(() => {
  //   // Update API params when filters change
  //   const timeoutId = setTimeout(() => {
  //     updateParams({
  //       page: 1,
  //       search: searchQuery || undefined,
  //       status: statusFilter === "all" ? undefined : statusFilter,
  //     });
  //   }, 500); // Debounce search

  //   return () => clearTimeout(timeoutId);
  // }, [searchQuery, statusFilter]);

  // Use API data if available, otherwise use localStorage data
  const displaySurveys =
    surveys ||
    localSurveys.filter((survey: any) => {
      const matchesSearch =
        survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        survey.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || survey.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case "PUBLISHED":
      case "ACTIVE":
        return "bg-green-100 text-green-800 hover:bg-green-800 hover:text-gray-100";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800 hover:bg-blue-800 hover:text-blue-100";
      case "DRAFT":
        return "bg-gray-100 text-gray-800 hover:bg-gray-800 hover:text-gray-100";
      case "SCHEDULED":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-800 hover:text-yellow-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-800 hover:text-gray-100";
    }
  };

  const handleShare = (survey: any) => {
    const surveyUrl = `${window.location.origin}/survey/${survey.share_tokens[0].token_hash}`;
    if (navigator.share) {
      navigator.share({
        title: survey.title,
        text: `Check out this survey: ${survey.title}`,
        url: surveyUrl,
      });
    } else {
      navigator.clipboard.writeText(surveyUrl);
      alert("Survey link copied to clipboard!");
    }
  };

  // const handleDuplicate = async (survey: any) => {
  //   const result = await duplicateSurvey(survey.id);
  //   if (result) {
  //     refetch();
  //     alert("Survey duplicated successfully!");
  //   }
  // };

  const handleDelete = async (surveyId: string) => {
    if (confirm("Are you sure you want to delete this survey?")) {
      const result = await deleteSurvey(surveyId);
      if (result) {
        refetch();
        // Also remove from localStorage
        const updatedSurveys = localSurveys.filter(
          (survey: any) => survey.id !== surveyId
        );
        setLocalSurveys(updatedSurveys);
        localStorage.setItem("sentSurveys", JSON.stringify(updatedSurveys));
      }
    }
  };

  // const handleStatusChange = async (surveyId, newStatus) => {
  //   const result = await updateSurvey(surveyId, { status: newStatus });
  //   if (result) {
  //     refetch();
  //     // Also update localStorage
  //     const updatedSurveys = localSurveys.map((survey) =>
  //       survey.id === surveyId ? { ...survey, status: newStatus } : survey
  //     );
  //     setLocalSurveys(updatedSurveys);
  //     localStorage.setItem("sentSurveys", JSON.stringify(updatedSurveys));
  //   }
  // };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Sent Surveys</h1>
            <p className="text-slate-500">
              Manage and view results of your sent surveys
            </p>
          </div>
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            ⚠️ Using local data - API connection failed: {error}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search surveys..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button asChild>
          <Link href="/generate-survey">Create New Survey</Link>
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {/* Survey Grid */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displaySurveys.map((survey: any) => (
            <Card key={survey.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{survey.title}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {survey.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(survey.status)}>
                      {survey.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={
                            deleteLoading
                            //  || duplicateLoading || updateLoading
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {survey.status.toLowerCase() !== "draft" && (
                          <DropdownMenuItem onClick={() => handleShare(survey)}>
                            <Share className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                        )}
                        {/* <DropdownMenuItem
                          onClick={() => handleDuplicate(survey)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem> */}
                        {/* <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(
                              survey.id,
                              survey.status === "active"
                                ? "completed"
                                : "active"
                            )
                          }
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          {survey.status === "active"
                            ? "Mark Complete"
                            : "Reactivate"}
                        </DropdownMenuItem> */}
                        <DropdownMenuItem
                          onClick={() => handleDelete(survey.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* <div>
                      <p className="text-slate-500">Responses</p>
                      <p className="font-semibold">
                        {survey.response_count || survey.responses || 0}
                      </p>
                    </div> */}
                    <div>
                      <p className="text-slate-500">Status</p>
                      <p className="font-semibold capitalize">
                        {survey.status || "Draft"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Flow Type</p>
                      <p className="font-semibold">
                        {survey.flow_type || "STATIC"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Created</p>
                      <p className="font-semibold">
                        {survey.created_at
                          ? new Date(survey.created_at).toLocaleDateString()
                          : survey.createdAt || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div>
                    {survey.status.toLowerCase() !== "draft" ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                          asChild
                        >
                          <Link href={`/survey-results/${survey.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
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
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                          asChild
                        >
                          <Link href={`/generate-survey?edit=${survey.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Survey
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(survey.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {/* {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() =>
              updateParams({ page: Math.max(1, pagination.page - 1) })
            }
            disabled={pagination.page === 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() =>
              updateParams({
                page: Math.min(pagination.totalPages, pagination.page + 1),
              })
            }
            disabled={pagination.page === pagination.totalPages || loading}
          >
            Next
          </Button>
        </div>
      )} */}

      {/* Empty State */}
      {!loading && displaySurveys.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">
            No surveys found matching your criteria.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/generate-survey">Create Your First Survey</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
