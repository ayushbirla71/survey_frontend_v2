"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Target,
  Database,
  RefreshCw,
  AlertCircle,
  Download,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Settings,
} from "lucide-react";
import {
  audienceApi,
  apiWithFallback,
  demoData,
  QuotaType,
  AgeQuota,
  GenderQuota,
  LocationQuota,
  CategoryQuota,
  QuotaConfig,
  ScreeningQuestion,
} from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

// Default age group options
const DEFAULT_AGE_GROUPS: AgeQuota[] = [
  { min_age: 18, max_age: 24, quota_type: "COUNT", target_count: 0 },
  { min_age: 25, max_age: 34, quota_type: "COUNT", target_count: 0 },
  { min_age: 35, max_age: 44, quota_type: "COUNT", target_count: 0 },
  { min_age: 45, max_age: 54, quota_type: "COUNT", target_count: 0 },
  { min_age: 55, max_age: 64, quota_type: "COUNT", target_count: 0 },
  { min_age: 65, max_age: 100, quota_type: "COUNT", target_count: 0 },
];

// Default gender options
const DEFAULT_GENDERS: GenderQuota[] = [
  { gender: "MALE", quota_type: "COUNT", target_count: 0 },
  { gender: "FEMALE", quota_type: "COUNT", target_count: 0 },
  { gender: "OTHER", quota_type: "COUNT", target_count: 0 },
  { gender: "PREFER_NOT_TO_SAY", quota_type: "COUNT", target_count: 0 },
];

// Gender display labels
const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Non-binary / Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export interface QuotaAudienceData {
  ageQuotas: AgeQuota[];
  genderQuotas: GenderQuota[];
  locationQuotas: LocationQuota[];
  categoryQuotas: CategoryQuota[];
  totalTarget: number;
  completedUrl?: string;
  terminatedUrl?: string;
  quotaFullUrl?: string;
  dataSource: string;
  screeningQuestions: ScreeningQuestion[];
}

interface QuotaAudienceSelectorProps {
  createdSurvey: any;
  surveySettings: any;
  quotaAudience: QuotaAudienceData;
  onQuotaAudienceUpdate: (quotaAudience: QuotaAudienceData) => void;
  onUserUniqueIdsUpdate: (userUniqueIds: string[]) => void;
  categories?: Array<{ id: string; name: string }>;
}

export default function QuotaAudienceSelector({
  createdSurvey,
  surveySettings,
  quotaAudience,
  onQuotaAudienceUpdate,
  onUserUniqueIdsUpdate,
  categories = [],
}: QuotaAudienceSelectorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("age");
  const [editingAgeQuota, setEditingAgeQuota] = useState<AgeQuota | null>(null);
  const [editingGenderQuota, setEditingGenderQuota] =
    useState<GenderQuota | null>(null);
  const [editingLocationQuota, setEditingLocationQuota] =
    useState<LocationQuota | null>(null);
  const [showScreeningPreview, setShowScreeningPreview] = useState(false);

  // Dialog states for editing
  const [ageDialogOpen, setAgeDialogOpen] = useState(false);
  const [genderDialogOpen, setGenderDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [screeningDialogOpen, setScreeningDialogOpen] = useState(false);
  const [editingScreeningQuestion, setEditingScreeningQuestion] =
    useState<ScreeningQuestion | null>(null);

  // Fetch audience statistics from API
  const {
    data: audienceStats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApi(() =>
    apiWithFallback(
      () => audienceApi.getAudienceStats(),
      demoData.audienceStats
    )
  );

  const stats = audienceStats || demoData.audienceStats;

  // Initialize with default quotas if empty
  useEffect(() => {
    if (quotaAudience.ageQuotas.length === 0) {
      onQuotaAudienceUpdate({
        ...quotaAudience,
        ageQuotas: DEFAULT_AGE_GROUPS,
        genderQuotas: DEFAULT_GENDERS,
      });
    }
  }, []);

  // Generate screening questions based on selected quotas
  const generateScreeningQuestions = useMemo((): ScreeningQuestion[] => {
    const questions: ScreeningQuestion[] = [];

    // Generate age screening question if age quotas have targets
    const activeAgeQuotas = quotaAudience.ageQuotas.filter(
      (q) =>
        (q.target_count && q.target_count > 0) ||
        (q.target_percentage && q.target_percentage > 0)
    );
    if (activeAgeQuotas.length > 0) {
      questions.push({
        id: "screening_age",
        type: "age",
        question_text: "What is your age group?",
        options: activeAgeQuotas.map((q, idx) => ({
          id: `age_option_${idx}`,
          label:
            q.max_age >= 100 ? `${q.min_age}+` : `${q.min_age}-${q.max_age}`,
          value: `${q.min_age}-${q.max_age}`,
        })),
        required: true,
      });
    }

    // Generate gender screening question if gender quotas have targets
    const activeGenderQuotas = quotaAudience.genderQuotas.filter(
      (q) =>
        (q.target_count && q.target_count > 0) ||
        (q.target_percentage && q.target_percentage > 0)
    );
    if (activeGenderQuotas.length > 0) {
      questions.push({
        id: "screening_gender",
        type: "gender",
        question_text: "What is your gender?",
        options: activeGenderQuotas.map((q, idx) => ({
          id: `gender_option_${idx}`,
          label: GENDER_LABELS[q.gender] || q.gender,
          value: q.gender,
        })),
        required: true,
      });
    }

    // Generate location screening question if location quotas have targets
    const activeLocationQuotas = quotaAudience.locationQuotas.filter(
      (q) =>
        (q.target_count && q.target_count > 0) ||
        (q.target_percentage && q.target_percentage > 0)
    );
    if (activeLocationQuotas.length > 0) {
      questions.push({
        id: "screening_location",
        type: "location",
        question_text: "Where are you located?",
        options: activeLocationQuotas.map((q, idx) => ({
          id: `location_option_${idx}`,
          label:
            [q.city, q.state, q.country].filter(Boolean).join(", ") ||
            "Unknown",
          value: JSON.stringify({
            country: q.country,
            state: q.state,
            city: q.city,
          }),
        })),
        required: true,
      });
    }

    return questions;
  }, [
    quotaAudience.ageQuotas,
    quotaAudience.genderQuotas,
    quotaAudience.locationQuotas,
  ]);

  // Update screening questions when quotas change
  useEffect(() => {
    const existingQuestions = quotaAudience.screeningQuestions;
    const newQuestions = generateScreeningQuestions;

    // Merge: keep custom text from existing questions, update options from generated
    const mergedQuestions = newQuestions.map((newQ) => {
      const existing = existingQuestions.find((eq) => eq.id === newQ.id);
      if (existing) {
        return {
          ...newQ,
          question_text: existing.question_text, // Keep custom text
        };
      }
      return newQ;
    });

    if (JSON.stringify(mergedQuestions) !== JSON.stringify(existingQuestions)) {
      onQuotaAudienceUpdate({
        ...quotaAudience,
        screeningQuestions: mergedQuestions,
      });
    }
  }, [generateScreeningQuestions]);

  // Helper to format age range display
  const formatAgeRange = (quota: AgeQuota) => {
    return quota.max_age >= 100
      ? `${quota.min_age}+`
      : `${quota.min_age}-${quota.max_age}`;
  };

  // Handle age quota selection toggle
  const handleAgeQuotaToggle = (index: number) => {
    const updatedQuotas = [...quotaAudience.ageQuotas];
    const quota = updatedQuotas[index];

    // Toggle: if has target, clear it; if no target, set default
    if (
      (quota.target_count && quota.target_count > 0) ||
      (quota.target_percentage && quota.target_percentage > 0)
    ) {
      updatedQuotas[index] = {
        ...quota,
        target_count: 0,
        target_percentage: 0,
      };
    } else {
      updatedQuotas[index] = { ...quota, target_count: 10 }; // Default target
    }

    onQuotaAudienceUpdate({ ...quotaAudience, ageQuotas: updatedQuotas });
  };

  // Handle gender quota selection toggle
  const handleGenderQuotaToggle = (index: number) => {
    const updatedQuotas = [...quotaAudience.genderQuotas];
    const quota = updatedQuotas[index];

    if (
      (quota.target_count && quota.target_count > 0) ||
      (quota.target_percentage && quota.target_percentage > 0)
    ) {
      updatedQuotas[index] = {
        ...quota,
        target_count: 0,
        target_percentage: 0,
      };
    } else {
      updatedQuotas[index] = { ...quota, target_count: 10 };
    }

    onQuotaAudienceUpdate({ ...quotaAudience, genderQuotas: updatedQuotas });
  };

  // Handle location quota add
  const handleAddLocationQuota = () => {
    const newQuota: LocationQuota = {
      country: "",
      state: "",
      city: "",
      quota_type: "COUNT",
      target_count: 10,
    };
    setEditingLocationQuota(newQuota);
    setLocationDialogOpen(true);
  };

  // Save location quota
  const handleSaveLocationQuota = (quota: LocationQuota) => {
    const existingIndex = quotaAudience.locationQuotas.findIndex(
      (q) =>
        q.id === quota.id ||
        (q.country === quota.country &&
          q.state === quota.state &&
          q.city === quota.city)
    );

    let updatedQuotas;
    if (existingIndex >= 0) {
      updatedQuotas = [...quotaAudience.locationQuotas];
      updatedQuotas[existingIndex] = quota;
    } else {
      updatedQuotas = [...quotaAudience.locationQuotas, quota];
    }

    onQuotaAudienceUpdate({ ...quotaAudience, locationQuotas: updatedQuotas });
    setLocationDialogOpen(false);
    setEditingLocationQuota(null);
  };

  // Delete location quota
  const handleDeleteLocationQuota = (index: number) => {
    const updatedQuotas = quotaAudience.locationQuotas.filter(
      (_, i) => i !== index
    );
    onQuotaAudienceUpdate({ ...quotaAudience, locationQuotas: updatedQuotas });
  };

  // Update quota target value
  const handleQuotaTargetChange = (
    type: "age" | "gender" | "location",
    index: number,
    value: number,
    quotaType: QuotaType
  ) => {
    if (type === "age") {
      const updatedQuotas = [...quotaAudience.ageQuotas];
      updatedQuotas[index] = {
        ...updatedQuotas[index],
        quota_type: quotaType,
        target_count: quotaType === "COUNT" ? value : undefined,
        target_percentage: quotaType === "PERCENTAGE" ? value : undefined,
      };
      onQuotaAudienceUpdate({ ...quotaAudience, ageQuotas: updatedQuotas });
    } else if (type === "gender") {
      const updatedQuotas = [...quotaAudience.genderQuotas];
      updatedQuotas[index] = {
        ...updatedQuotas[index],
        quota_type: quotaType,
        target_count: quotaType === "COUNT" ? value : undefined,
        target_percentage: quotaType === "PERCENTAGE" ? value : undefined,
      };
      onQuotaAudienceUpdate({ ...quotaAudience, genderQuotas: updatedQuotas });
    } else if (type === "location") {
      const updatedQuotas = [...quotaAudience.locationQuotas];
      updatedQuotas[index] = {
        ...updatedQuotas[index],
        quota_type: quotaType,
        target_count: quotaType === "COUNT" ? value : undefined,
        target_percentage: quotaType === "PERCENTAGE" ? value : undefined,
      };
      onQuotaAudienceUpdate({
        ...quotaAudience,
        locationQuotas: updatedQuotas,
      });
    }
  };

  // Update screening question text (not options)
  const handleScreeningQuestionTextChange = (
    questionId: string,
    newText: string
  ) => {
    const updatedQuestions = quotaAudience.screeningQuestions.map((q) =>
      q.id === questionId ? { ...q, question_text: newText } : q
    );
    onQuotaAudienceUpdate({
      ...quotaAudience,
      screeningQuestions: updatedQuestions,
    });
  };

  // Edit age quota (for custom ranges)
  const handleEditAgeQuota = (index: number) => {
    setEditingAgeQuota({ ...quotaAudience.ageQuotas[index] });
    setAgeDialogOpen(true);
  };

  // Save edited age quota
  const handleSaveAgeQuota = (quota: AgeQuota, index: number) => {
    const updatedQuotas = [...quotaAudience.ageQuotas];
    updatedQuotas[index] = quota;
    onQuotaAudienceUpdate({ ...quotaAudience, ageQuotas: updatedQuotas });
    setAgeDialogOpen(false);
    setEditingAgeQuota(null);
  };

  // Add new age quota
  const handleAddAgeQuota = () => {
    const newQuota: AgeQuota = {
      min_age: 18,
      max_age: 24,
      quota_type: "COUNT",
      target_count: 10,
    };
    onQuotaAudienceUpdate({
      ...quotaAudience,
      ageQuotas: [...quotaAudience.ageQuotas, newQuota],
    });
  };

  // Delete age quota
  const handleDeleteAgeQuota = (index: number) => {
    const updatedQuotas = quotaAudience.ageQuotas.filter((_, i) => i !== index);
    onQuotaAudienceUpdate({ ...quotaAudience, ageQuotas: updatedQuotas });
  };

  // Calculate total target from all quotas
  const calculateTotalTarget = () => {
    let total = 0;
    quotaAudience.ageQuotas.forEach((q) => {
      if (q.target_count) total += q.target_count;
    });
    return total;
  };

  // File handling for AGENT mode
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (
        !selectedFile.name.endsWith(".xlsx") &&
        !selectedFile.name.endsWith(".xls")
      ) {
        toast.error("Please upload a valid Excel file (.xlsx or .xls)");
        setFile(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

          if (
            !jsonData.length ||
            !jsonData[0].hasOwnProperty("userUniqueIds")
          ) {
            toast.error(
              'Excel file must contain a column named "userUniqueIds"'
            );
            setFile(null);
            return;
          }

          setFile(selectedFile);
          const userUniqueIds = jsonData.map((row) => row.userUniqueIds);
          onUserUniqueIdsUpdate(userUniqueIds);
          toast.success("Excel file uploaded successfully!");
        } catch (err) {
          toast.error("Error reading Excel file. Please upload a valid file.");
          setFile(null);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleDownloadDummyExcel = () => {
    try {
      const excelData = ["9013kjn9832nsd89sds", "879fgdf990fd7gsd98"];
      const worksheetData = [
        ["userUniqueIds"],
        ...excelData.map((item: any) => [item]),
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "SurveyLinks");
      XLSX.writeFile(workbook, "Agent Users List Template.xlsx");
    } catch (error) {
      toast.error("Failed to download Excel");
    }
  };

  // Check if a quota is active (has target)
  const isQuotaActive = (quota: AgeQuota | GenderQuota | LocationQuota) => {
    return (
      (quota.target_count && quota.target_count > 0) ||
      (quota.target_percentage && quota.target_percentage > 0)
    );
  };

  // AGENT mode render
  if (surveySettings.survey_send_by === "AGENT") {
    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Agent Mode
        </h2>
        <p className="text-slate-500">
          Please select the Excel File with the user unique Id's list
        </p>
        <div className="mt-2 flex gap-3">
          <label
            htmlFor="excel-upload"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md mt-4 cursor-pointer"
          >
            Upload Excel
          </label>
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={handleDownloadDummyExcel}
            className="h-10 px-4 py-2 rounded-md mt-4"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Excel Template
          </Button>
        </div>
        {file && (
          <p className="text-green-500 mt-2">
            File uploaded successfully: {file.name}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Define Target Audience & Quotas
        </h2>
        <p className="text-slate-500">
          Configure quota targets for different audience segments. Screening
          questions will be auto-generated.
        </p>
      </div>

      {/* Error Display */}
      {statsError && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <div className="flex-1">
            <p className="text-yellow-800 text-sm">
              ⚠️ Unable to load live audience data. Using demo data for
              calculations.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchStats}
            disabled={statsLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${statsLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Quota Configuration Tabs */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="age">Age Groups</TabsTrigger>
              <TabsTrigger value="gender">Gender</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
            </TabsList>

            {/* Age Groups Tab */}
            <TabsContent value="age" className="space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Age Group Quotas
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddAgeQuota}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Age Group
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quotaAudience.ageQuotas.map((quota, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          isQuotaActive(quota)
                            ? "border-violet-300 bg-violet-50"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button
                              variant={
                                isQuotaActive(quota) ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => handleAgeQuotaToggle(index)}
                            >
                              {formatAgeRange(quota)}
                            </Button>
                            <span className="text-sm text-slate-500">
                              {statsLoading ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                `${(
                                  stats?.byAgeGroup[formatAgeRange(quota)] || 0
                                ).toLocaleString()} available`
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAgeQuota(index)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAgeQuota(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        {isQuotaActive(quota) && (
                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Type:</Label>
                              <Select
                                value={quota.quota_type}
                                onValueChange={(value: QuotaType) =>
                                  handleQuotaTargetChange(
                                    "age",
                                    index,
                                    quota.target_count ||
                                      quota.target_percentage ||
                                      0,
                                    value
                                  )
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COUNT">Count</SelectItem>
                                  <SelectItem value="PERCENTAGE">
                                    Percentage
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Target:</Label>
                              <Input
                                type="number"
                                className="w-24"
                                value={
                                  quota.target_count ||
                                  quota.target_percentage ||
                                  0
                                }
                                onChange={(e) =>
                                  handleQuotaTargetChange(
                                    "age",
                                    index,
                                    parseInt(e.target.value) || 0,
                                    quota.quota_type
                                  )
                                }
                                min={0}
                                max={
                                  quota.quota_type === "PERCENTAGE"
                                    ? 100
                                    : undefined
                                }
                              />
                              {quota.quota_type === "PERCENTAGE" && (
                                <span>%</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gender Tab */}
            <TabsContent value="gender" className="space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Gender Quotas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quotaAudience.genderQuotas.map((quota, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          isQuotaActive(quota)
                            ? "border-violet-300 bg-violet-50"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button
                              variant={
                                isQuotaActive(quota) ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => handleGenderQuotaToggle(index)}
                            >
                              {GENDER_LABELS[quota.gender]}
                            </Button>
                            <span className="text-sm text-slate-500">
                              {statsLoading ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                `${(
                                  stats?.byGender[
                                    GENDER_LABELS[quota.gender]
                                  ] || 0
                                ).toLocaleString()} available`
                              )}
                            </span>
                          </div>
                        </div>

                        {isQuotaActive(quota) && (
                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Type:</Label>
                              <Select
                                value={quota.quota_type}
                                onValueChange={(value: QuotaType) =>
                                  handleQuotaTargetChange(
                                    "gender",
                                    index,
                                    quota.target_count ||
                                      quota.target_percentage ||
                                      0,
                                    value
                                  )
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COUNT">Count</SelectItem>
                                  <SelectItem value="PERCENTAGE">
                                    Percentage
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Target:</Label>
                              <Input
                                type="number"
                                className="w-24"
                                value={
                                  quota.target_count ||
                                  quota.target_percentage ||
                                  0
                                }
                                onChange={(e) =>
                                  handleQuotaTargetChange(
                                    "gender",
                                    index,
                                    parseInt(e.target.value) || 0,
                                    quota.quota_type
                                  )
                                }
                                min={0}
                                max={
                                  quota.quota_type === "PERCENTAGE"
                                    ? 100
                                    : undefined
                                }
                              />
                              {quota.quota_type === "PERCENTAGE" && (
                                <span>%</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Location Quotas</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddLocationQuota}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Location
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {quotaAudience.locationQuotas.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>No location quotas configured.</p>
                      <p className="text-sm">
                        Click "Add Location" to create one.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quotaAudience.locationQuotas.map((quota, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg border-violet-300 bg-violet-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">
                                {[quota.city, quota.state, quota.country]
                                  .filter(Boolean)
                                  .join(", ") || "All Locations"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingLocationQuota(quota);
                                  setLocationDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLocationQuota(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Type:</Label>
                              <Select
                                value={quota.quota_type}
                                onValueChange={(value: QuotaType) =>
                                  handleQuotaTargetChange(
                                    "location",
                                    index,
                                    quota.target_count ||
                                      quota.target_percentage ||
                                      0,
                                    value
                                  )
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COUNT">Count</SelectItem>
                                  <SelectItem value="PERCENTAGE">
                                    Percentage
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Target:</Label>
                              <Input
                                type="number"
                                className="w-24"
                                value={
                                  quota.target_count ||
                                  quota.target_percentage ||
                                  0
                                }
                                onChange={(e) =>
                                  handleQuotaTargetChange(
                                    "location",
                                    index,
                                    parseInt(e.target.value) || 0,
                                    quota.quota_type
                                  )
                                }
                                min={0}
                                max={
                                  quota.quota_type === "PERCENTAGE"
                                    ? 100
                                    : undefined
                                }
                              />
                              {quota.quota_type === "PERCENTAGE" && (
                                <span>%</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Summary & Screening Questions Sidebar */}
        <div className="space-y-6">
          {/* Quota Summary */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quota Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-slate-600">
                    Active Age Quotas
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {quotaAudience.ageQuotas.filter(isQuotaActive).length >
                    0 ? (
                      quotaAudience.ageQuotas
                        .filter(isQuotaActive)
                        .map((q, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
                            {formatAgeRange(q)}:{" "}
                            {q.target_count || q.target_percentage}
                            {q.quota_type === "PERCENTAGE" ? "%" : ""}
                          </Badge>
                        ))
                    ) : (
                      <span className="text-sm text-slate-400">
                        None selected
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-600">
                    Active Gender Quotas
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {quotaAudience.genderQuotas.filter(isQuotaActive).length >
                    0 ? (
                      quotaAudience.genderQuotas
                        .filter(isQuotaActive)
                        .map((q, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
                            {GENDER_LABELS[q.gender]}:{" "}
                            {q.target_count || q.target_percentage}
                            {q.quota_type === "PERCENTAGE" ? "%" : ""}
                          </Badge>
                        ))
                    ) : (
                      <span className="text-sm text-slate-400">
                        None selected
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-600">
                    Location Quotas
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {quotaAudience.locationQuotas.length > 0 ? (
                      quotaAudience.locationQuotas.map((q, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {[q.city, q.state, q.country]
                            .filter(Boolean)
                            .join(", ") || "All"}
                          : {q.target_count || q.target_percentage}
                          {q.quota_type === "PERCENTAGE" ? "%" : ""}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">
                        None configured
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">
                    Total Target (Count)
                  </span>
                  <span className="text-lg font-bold text-violet-600">
                    {calculateTotalTarget().toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Screening Questions Preview */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Screening Questions
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScreeningPreview(!showScreeningPreview)}
                >
                  {showScreeningPreview ? "Hide" : "Preview"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {quotaAudience.screeningQuestions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Select quota targets to auto-generate screening questions.
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">
                    {quotaAudience.screeningQuestions.length} screening
                    question(s) will be shown to respondents.
                  </p>

                  {showScreeningPreview && (
                    <div className="space-y-4 mt-4">
                      {quotaAudience.screeningQuestions.map((question, idx) => (
                        <div
                          key={question.id}
                          className="p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <Label className="text-xs text-slate-500 uppercase">
                                {question.type} Question
                              </Label>
                              <Input
                                value={question.question_text}
                                onChange={(e) =>
                                  handleScreeningQuestionTextChange(
                                    question.id,
                                    e.target.value
                                  )
                                }
                                className="mt-1 text-sm"
                                placeholder="Enter question text..."
                              />
                            </div>
                          </div>
                          <div className="mt-2">
                            <Label className="text-xs text-slate-500">
                              Options (auto-generated, not editable):
                            </Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {question.options.map((opt) => (
                                <Badge
                                  key={opt.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {opt.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Redirect URLs */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Redirect URLs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="completed-url" className="text-sm">
                  Completed URL
                </Label>
                <Input
                  id="completed-url"
                  placeholder="https://example.com/thank-you"
                  value={quotaAudience.completedUrl || ""}
                  onChange={(e) =>
                    onQuotaAudienceUpdate({
                      ...quotaAudience,
                      completedUrl: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="terminated-url" className="text-sm">
                  Terminated URL
                </Label>
                <Input
                  id="terminated-url"
                  placeholder="https://example.com/not-qualified"
                  value={quotaAudience.terminatedUrl || ""}
                  onChange={(e) =>
                    onQuotaAudienceUpdate({
                      ...quotaAudience,
                      terminatedUrl: e.target.value,
                    })
                  }
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Respondents who don't qualify will be redirected here.
                </p>
              </div>
              <div>
                <Label htmlFor="quota-full-url" className="text-sm">
                  Quota Full URL
                </Label>
                <Input
                  id="quota-full-url"
                  placeholder="https://example.com/quota-full"
                  value={quotaAudience.quotaFullUrl || ""}
                  onChange={(e) =>
                    onQuotaAudienceUpdate({
                      ...quotaAudience,
                      quotaFullUrl: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Age Quota Edit Dialog */}
      <Dialog open={ageDialogOpen} onOpenChange={setAgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Age Group</DialogTitle>
            <DialogDescription>
              Customize the age range for this quota group.
            </DialogDescription>
          </DialogHeader>
          {editingAgeQuota && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min-age">Minimum Age</Label>
                  <Input
                    id="min-age"
                    type="number"
                    value={editingAgeQuota.min_age}
                    onChange={(e) =>
                      setEditingAgeQuota({
                        ...editingAgeQuota,
                        min_age: parseInt(e.target.value) || 0,
                      })
                    }
                    min={0}
                    max={120}
                  />
                </div>
                <div>
                  <Label htmlFor="max-age">Maximum Age</Label>
                  <Input
                    id="max-age"
                    type="number"
                    value={editingAgeQuota.max_age}
                    onChange={(e) =>
                      setEditingAgeQuota({
                        ...editingAgeQuota,
                        max_age: parseInt(e.target.value) || 0,
                      })
                    }
                    min={0}
                    max={120}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingAgeQuota) {
                  const index = quotaAudience.ageQuotas.findIndex(
                    (q) =>
                      q.min_age === editingAgeQuota.min_age &&
                      q.max_age === editingAgeQuota.max_age
                  );
                  if (index >= 0) {
                    handleSaveAgeQuota(editingAgeQuota, index);
                  }
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Quota Edit Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocationQuota?.id ? "Edit Location" : "Add Location"}
            </DialogTitle>
            <DialogDescription>
              Configure location-based quota targeting.
            </DialogDescription>
          </DialogHeader>
          {editingLocationQuota && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={editingLocationQuota.country || ""}
                  onChange={(e) =>
                    setEditingLocationQuota({
                      ...editingLocationQuota,
                      country: e.target.value,
                    })
                  }
                  placeholder="e.g., United States"
                />
              </div>
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={editingLocationQuota.state || ""}
                  onChange={(e) =>
                    setEditingLocationQuota({
                      ...editingLocationQuota,
                      state: e.target.value,
                    })
                  }
                  placeholder="e.g., California"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={editingLocationQuota.city || ""}
                  onChange={(e) =>
                    setEditingLocationQuota({
                      ...editingLocationQuota,
                      city: e.target.value,
                    })
                  }
                  placeholder="e.g., San Francisco"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quota Type</Label>
                  <Select
                    value={editingLocationQuota.quota_type}
                    onValueChange={(value: QuotaType) =>
                      setEditingLocationQuota({
                        ...editingLocationQuota,
                        quota_type: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COUNT">Count</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target</Label>
                  <Input
                    type="number"
                    value={
                      editingLocationQuota.target_count ||
                      editingLocationQuota.target_percentage ||
                      0
                    }
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setEditingLocationQuota({
                        ...editingLocationQuota,
                        target_count:
                          editingLocationQuota.quota_type === "COUNT"
                            ? value
                            : undefined,
                        target_percentage:
                          editingLocationQuota.quota_type === "PERCENTAGE"
                            ? value
                            : undefined,
                      });
                    }}
                    min={0}
                    max={
                      editingLocationQuota.quota_type === "PERCENTAGE"
                        ? 100
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLocationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingLocationQuota) {
                  handleSaveLocationQuota(editingLocationQuota);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
