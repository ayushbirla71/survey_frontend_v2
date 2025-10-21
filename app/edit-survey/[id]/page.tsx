"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { surveyApi, Survey } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";

export default function EditSurvey() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [flowType, setFlowType] = useState<"STATIC" | "INTERACTIVE" | "GAME">(
    "STATIC"
  );
  const [surveySendBy, setSurveySendBy] = useState<
    "WHATSAPP" | "EMAIL" | "BOTH" | "NONE"
  >("NONE");
  const [status, setStatus] = useState<"DRAFT" | "SCHEDULED" | "PUBLISHED">(
    "DRAFT"
  );
  const [scheduledDate, setScheduledDate] = useState("");

  // API calls
  const {
    data: surveyResponse,
    loading: surveyLoading,
    error: surveyError,
  } = useApi<{ survey: Survey }>(() =>
    surveyApi.getSurvey(surveyId).then((response) => ({ data: response.data }))
  );

  const {
    mutate: updateSurvey,
    loading: updateLoading,
    error: updateError,
  } = useMutation((updateData: any) =>
    surveyApi.updateSurvey(surveyId, updateData)
  );

  // Load survey data into form
  useEffect(() => {
    if (surveyResponse?.survey) {
      const survey = surveyResponse.survey;
      setTitle(survey.title || "");
      setDescription(survey.description || "");
      setFlowType(survey.flow_type || "STATIC");
      setSurveySendBy(survey.survey_send_by || "NONE");
      setStatus(survey.status || "DRAFT");
      setScheduledDate(
        survey.scheduled_date
          ? new Date(survey.scheduled_date).toISOString().slice(0, 16)
          : ""
      );
    }
  }, [surveyResponse]);

  // Check if survey can be edited
  const canEdit =
    surveyResponse?.survey &&
    (surveyResponse.survey.status === "DRAFT" ||
      surveyResponse.survey.status === "SCHEDULED");

  const handleSave = async () => {
    if (!canEdit) return;

    const updateData = {
      title,
      description,
      flow_type: flowType,
      survey_send_by: surveySendBy,
      status,
      scheduled_date: scheduledDate || undefined,
      scheduled_type:
        status === "SCHEDULED"
          ? ("SCHEDULED" as const)
          : ("IMMEDIATE" as const),
    };

    const result = await updateSurvey(updateData);

    if (result) {
      // Redirect back to dashboard on success
      router.push("/");
    }
  };

  if (surveyLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading survey...</p>
        </div>
      </div>
    );
  }

  if (surveyError || !surveyResponse?.survey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-red-600 mb-2">Error</h3>
              <p className="text-slate-600 mb-4">
                {surveyError || "Survey not found"}
              </p>
              <Button asChild>
                <Link href="/">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-amber-600 mb-2">
                Cannot Edit
              </h3>
              <p className="text-slate-600 mb-4">
                This survey cannot be edited because it has been published.
              </p>
              <Button asChild>
                <Link href="/">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-4xl py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Edit Survey</h1>
              <p className="text-slate-600">Modify your survey details</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {updateError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              Failed to update survey: {updateError}
            </p>
          </div>
        )}

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Survey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Survey Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter survey title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter survey description"
                rows={3}
              />
            </div>

            {/* Flow Type */}
            <div className="space-y-2">
              <Label htmlFor="flowType">Flow Type</Label>
              <Select
                value={flowType}
                onValueChange={(value: any) => setFlowType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STATIC">Static</SelectItem>
                  <SelectItem value="INTERACTIVE">Interactive</SelectItem>
                  <SelectItem value="GAME">Game</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Send By */}
            <div className="space-y-2">
              <Label htmlFor="sendBy">Send By</Label>
              <Select
                value={surveySendBy}
                onValueChange={(value: any) => setSurveySendBy(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value: any) => setStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled Date (only show if status is SCHEDULED) */}
            {status === "SCHEDULED" && (
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={updateLoading}>
                {updateLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
