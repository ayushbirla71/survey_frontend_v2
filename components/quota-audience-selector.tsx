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
import { Switch } from "@/components/ui/switch";
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

// Default age group options - exported for reuse in survey page
export const DEFAULT_AGE_GROUPS: AgeQuota[] = [
  { min_age: 18, max_age: 24, quota_type: "COUNT", target_count: 0 },
  { min_age: 25, max_age: 34, quota_type: "COUNT", target_count: 0 },
  { min_age: 35, max_age: 44, quota_type: "COUNT", target_count: 0 },
  { min_age: 45, max_age: 54, quota_type: "COUNT", target_count: 0 },
  { min_age: 55, max_age: 64, quota_type: "COUNT", target_count: 0 },
  { min_age: 65, max_age: 100, quota_type: "COUNT", target_count: 0 },
];

// Default gender options - exported for reuse in survey page
export const DEFAULT_GENDERS: GenderQuota[] = [
  { gender: "MALE", quota_type: "COUNT", target_count: 0 },
  { gender: "FEMALE", quota_type: "COUNT", target_count: 0 },
  { gender: "OTHER", quota_type: "COUNT", target_count: 0 },
  { gender: "PREFER_NOT_TO_SAY", quota_type: "COUNT", target_count: 0 },
];

// Gender display labels - exported for reuse in survey page
export const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Non-binary / Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export interface QuotaAudienceData {
  quotaEnabled: boolean; // Toggle to enable/disable quota
  ageQuotas: AgeQuota[];
  genderQuotas: GenderQuota[];
  locationQuotas: LocationQuota[];
  categoryQuotas: CategoryQuota[]; // Used for industry/category qualification
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
  onQuotaAudienceUpdate: (
    updater:
      | QuotaAudienceData
      | ((prev: QuotaAudienceData) => QuotaAudienceData)
  ) => void;
  onUserUniqueIdsUpdate: (userUniqueIds: string[]) => void;
  onValidationError?: (error: string | null) => void;
  categories?: Array<{ id: string; name: string }>;
  isEditMode?: boolean; // Flag to indicate if we're editing existing survey
}

// State for expanded quota cards
interface ExpandedQuotas {
  age: Record<number, boolean>;
  gender: Record<number, boolean>;
  location: Record<number, boolean>;
  industry: Record<number, boolean>;
}

// Validation errors interface
interface QuotaValidationErrors {
  totalTarget?: string; // Error if quota enabled but total target not set
  ageCountSum?: string;
  agePercentageSum?: string;
  genderCountSum?: string;
  genderPercentageSum?: string;
  locationCountSum?: string;
  locationPercentageSum?: string;
  categoryCountSum?: string;
  categoryPercentageSum?: string;
}

export default function QuotaAudienceSelector({
  createdSurvey,
  surveySettings,
  quotaAudience,
  onQuotaAudienceUpdate,
  onUserUniqueIdsUpdate,
  onValidationError,
  categories = [],
  isEditMode = false,
}: QuotaAudienceSelectorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("age");
  const [editingAgeQuota, setEditingAgeQuota] = useState<AgeQuota | null>(null);
  const [editingGenderQuota, setEditingGenderQuota] =
    useState<GenderQuota | null>(null);
  const [editingLocationQuota, setEditingLocationQuota] =
    useState<LocationQuota | null>(null);
  const [showScreeningPreview, setShowScreeningPreview] = useState(false);

  // Track which quota cards are expanded to show target input
  const [expandedQuotas, setExpandedQuotas] = useState<ExpandedQuotas>({
    age: {},
    gender: {},
    location: {},
    industry: {},
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] =
    useState<QuotaValidationErrors>({});

  // Dialog states for editing
  const [ageDialogOpen, setAgeDialogOpen] = useState(false);
  const [genderDialogOpen, setGenderDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [screeningDialogOpen, setScreeningDialogOpen] = useState(false);
  const [editingScreeningQuestion, setEditingScreeningQuestion] =
    useState<ScreeningQuestion | null>(null);

  // Validate AGENT mode and quota settings
  useEffect(() => {
    // Check AGENT mode validation
    if (surveySettings.survey_send_by === "AGENT" && !file) {
      onValidationError?.(
        "Please upload an Excel file with user IDs for Agent mode"
      );
      return;
    }

    // Check quota validation - total target required when quota is enabled
    if (quotaAudience.quotaEnabled) {
      if (!quotaAudience.totalTarget || quotaAudience.totalTarget <= 0) {
        onValidationError?.(
          "Total Responses Required is mandatory when quota is enabled"
        );
        setValidationErrors((prev) => ({
          ...prev,
          totalTarget: "Total target is required",
        }));
        return;
      } else {
        setValidationErrors((prev) => ({
          ...prev,
          totalTarget: undefined,
        }));
      }
    }

    // All validations passed
    onValidationError?.(null);
  }, [
    file,
    surveySettings.survey_send_by,
    quotaAudience.quotaEnabled,
    quotaAudience.totalTarget,
    onValidationError,
  ]);

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

  // State to track if initialization has been done
  const [hasInitialized, setHasInitialized] = useState(false);

  // normalize quotas so UI always has full lists
  const normalizeQuotaAudience = (
    quotaAudience: QuotaAudienceData,
    categories: Array<{ id: string; name: string }>
  ): QuotaAudienceData => {
    const ageMap = new Map(
      quotaAudience.ageQuotas.map((q) => [`${q.min_age}-${q.max_age}`, q])
    );

    const genderMap = new Map(
      quotaAudience.genderQuotas.map((q) => [q.gender, q])
    );

    const categoryMap = new Map(
      (quotaAudience.categoryQuotas || []).map((q) => [q.surveyCategoryId, q])
    );

    return {
      ...quotaAudience,

      // FIX AGE
      ageQuotas: DEFAULT_AGE_GROUPS.map(
        (defaultQ) =>
          ageMap.get(`${defaultQ.min_age}-${defaultQ.max_age}`) || defaultQ
      ),

      // FIX GENDER
      genderQuotas: DEFAULT_GENDERS.map(
        (defaultQ) => genderMap.get(defaultQ.gender) || defaultQ
      ),

      // FIX CATEGORY / INDUSTRY
      categoryQuotas: categories.map((cat) => {
        const existingQuota = categoryMap.get(cat.id);

        if (existingQuota) {
          return {
            ...existingQuota,
            // normalize name for UI usage
            categoryName: existingQuota.surveyCategory?.name ?? cat.name,
          };
        }

        // category exists but has NO quota yet
        return {
          surveyCategoryId: cat.id,
          categoryName: cat.name,
          quota_type: "COUNT",
          target_count: 0,
          target_percentage: 0,
          current_count: 0,
          is_active: false,
        };
      }),
    };
  };

  // normalize quotas for BOTH create & edit
  useEffect(() => {
    if (hasInitialized) return;

    const normalized = normalizeQuotaAudience(quotaAudience, categories);

    onQuotaAudienceUpdate(normalized);
    setHasInitialized(true);
  }, [categories]);

  // Generate screening questions based on selected quotas
  // Show ALL options for proper screening, not just the ones with targets
  const generateScreeningQuestions = useMemo((): ScreeningQuestion[] => {
    const questions: ScreeningQuestion[] = [];
    // console.log("quotaAudience is ----->>>>>>> : ", quotaAudience);

    // Check if any age quotas have targets (to determine if we need age screening)
    const hasActiveAgeQuotas = quotaAudience.ageQuotas.some(
      (q) =>
        (q.target_count && q.target_count > 0) ||
        (q.target_percentage && q.target_percentage > 0)
    );
    // If there are active age quotas, show ALL age groups for proper screening
    if (hasActiveAgeQuotas) {
      questions.push({
        id: "screening_age",
        type: "age",
        question_text: "What is your age group?",
        // Show all age groups from the configured quotas (includes all DEFAULT_AGE_GROUPS)
        options: quotaAudience.ageQuotas.map((q, idx) => ({
          id: `age_option_${idx}`,
          label:
            q.max_age >= 100 ? `${q.min_age}+` : `${q.min_age}-${q.max_age}`,
          value: `${q.min_age}-${q.max_age}`,
        })),
        required: true,
      });
    }

    // Check if any gender quotas have targets
    const hasActiveGenderQuotas = quotaAudience.genderQuotas.some(
      (q) =>
        (q.target_count && q.target_count > 0) ||
        (q.target_percentage && q.target_percentage > 0)
    );
    // If there are active gender quotas, show ALL gender options for proper screening
    if (hasActiveGenderQuotas) {
      questions.push({
        id: "screening_gender",
        type: "gender",
        question_text: "What is your gender?",
        // Show all gender options from the configured quotas (includes all DEFAULT_GENDERS)
        options: quotaAudience.genderQuotas.map((q, idx) => ({
          id: `gender_option_${idx}`,
          label: GENDER_LABELS[q.gender] || q.gender,
          value: q.gender,
        })),
        required: true,
      });
    }

    // Check if any location quotas have targets
    const hasActiveLocationQuotas = quotaAudience.locationQuotas.some(
      (q) =>
        (q.target_count && q.target_count > 0) ||
        (q.target_percentage && q.target_percentage > 0)
    );
    // For location, show all configured locations for proper screening
    if (hasActiveLocationQuotas) {
      questions.push({
        id: "screening_location",
        type: "location",
        question_text: "Where are you located?",
        options: quotaAudience.locationQuotas.map((q, idx) => ({
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

    // Generate category/industry screening question if category quotas exist
    // Show ALL categories for proper screening, not just the ones with targets
    const hasActiveCategoryQuotas = quotaAudience.categoryQuotas.some(
      (q) =>
        (q.target_count && q.target_count > 0) ||
        (q.target_percentage && q.target_percentage > 0)
    );
    if (hasActiveCategoryQuotas && categories.length > 0) {
      questions.push({
        id: "screening_category",
        type: "category",
        question_text: "Which industry do you work in?",
        // Show all categories from the configured quotas (includes all available categories)
        options: categories.map((cat, idx) => ({
          id: `category_option_${idx}`,
          label: cat.name,
          value: cat.id,
        })),
        required: true,
      });
    }
    console.log("Generated screening questions:", questions);

    return questions;
  }, [
    quotaAudience.ageQuotas,
    quotaAudience.genderQuotas,
    quotaAudience.locationQuotas,
    quotaAudience.categoryQuotas,
  ]);

  useEffect(() => {
    const existingQuestions = quotaAudience.screeningQuestions;
    const newQuestions = generateScreeningQuestions;

    // Merge: keep custom text from existing questions, but ALWAYS use options from generated
    const mergedQuestions = newQuestions.map((newQ) => {
      const existing = existingQuestions.find((eq) => eq.id === newQ.id);
      if (existing) {
        // Only keep the custom question_text, always use new options from quota state
        return {
          id: newQ.id,
          type: newQ.type,
          question_text: existing.question_text, // Keep custom text
          options: newQ.options, // ALWAYS use regenerated options (all available options)
          required: newQ.required,
        };
      }
      return newQ;
    });

    // Check if options have changed (compare stringified versions)
    const hasOptionsChanged =
      JSON.stringify(mergedQuestions.map((q) => q.options)) !==
      JSON.stringify(existingQuestions.map((q) => q.options));
    const hasQuestionsChanged =
      JSON.stringify(mergedQuestions) !== JSON.stringify(existingQuestions);

    if (hasOptionsChanged || hasQuestionsChanged) {
      onQuotaAudienceUpdate((prev) => ({
        ...prev,
        screeningQuestions: mergedQuestions,
      }));
    }
  }, [generateScreeningQuestions]);

  // Helper to format age range display
  const formatAgeRange = (quota: AgeQuota) => {
    return quota.max_age >= 100
      ? `${quota.min_age}+`
      : `${quota.min_age}-${quota.max_age}`;
  };

  // Toggle expanded state for a quota card
  const toggleQuotaExpanded = (
    type: "age" | "gender" | "location" | "industry",
    index: number
  ) => {
    setExpandedQuotas((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [index]: !prev[type][index],
      },
    }));
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

  // Handle quota type change - sync all quotas of that type and recalculate
  const handleQuotaTypeChange = (
    type: "age" | "gender" | "location" | "industry",
    newQuotaType: QuotaType
  ) => {
    const totalTarget = quotaAudience.totalTarget || 100;

    if (type === "age") {
      const updatedQuotas = quotaAudience.ageQuotas.map((q) => {
        const currentValue = q.target_count || q.target_percentage || 0;
        if (newQuotaType === "PERCENTAGE" && q.quota_type === "COUNT") {
          // Convert count to percentage
          const percentage =
            totalTarget > 0
              ? Math.round((currentValue / totalTarget) * 100)
              : 0;
          return {
            ...q,
            quota_type: newQuotaType,
            target_count: undefined,
            target_percentage: percentage,
          };
        } else if (newQuotaType === "COUNT" && q.quota_type === "PERCENTAGE") {
          // Convert percentage to count
          const count = Math.round((currentValue / 100) * totalTarget);
          return {
            ...q,
            quota_type: newQuotaType,
            target_count: count,
            target_percentage: undefined,
          };
        }
        return { ...q, quota_type: newQuotaType };
      });
      onQuotaAudienceUpdate({ ...quotaAudience, ageQuotas: updatedQuotas });
    } else if (type === "gender") {
      const updatedQuotas = quotaAudience.genderQuotas.map((q) => {
        const currentValue = q.target_count || q.target_percentage || 0;
        if (newQuotaType === "PERCENTAGE" && q.quota_type === "COUNT") {
          const percentage =
            totalTarget > 0
              ? Math.round((currentValue / totalTarget) * 100)
              : 0;
          return {
            ...q,
            quota_type: newQuotaType,
            target_count: undefined,
            target_percentage: percentage,
          };
        } else if (newQuotaType === "COUNT" && q.quota_type === "PERCENTAGE") {
          const count = Math.round((currentValue / 100) * totalTarget);
          return {
            ...q,
            quota_type: newQuotaType,
            target_count: count,
            target_percentage: undefined,
          };
        }
        return { ...q, quota_type: newQuotaType };
      });
      onQuotaAudienceUpdate({ ...quotaAudience, genderQuotas: updatedQuotas });
    } else if (type === "location") {
      const updatedQuotas = quotaAudience.locationQuotas.map((q) => {
        const currentValue = q.target_count || q.target_percentage || 0;
        if (newQuotaType === "PERCENTAGE" && q.quota_type === "COUNT") {
          const percentage =
            totalTarget > 0
              ? Math.round((currentValue / totalTarget) * 100)
              : 0;
          return {
            ...q,
            quota_type: newQuotaType,
            target_count: undefined,
            target_percentage: percentage,
          };
        } else if (newQuotaType === "COUNT" && q.quota_type === "PERCENTAGE") {
          const count = Math.round((currentValue / 100) * totalTarget);
          return {
            ...q,
            quota_type: newQuotaType,
            target_count: count,
            target_percentage: undefined,
          };
        }
        return { ...q, quota_type: newQuotaType };
      });
      onQuotaAudienceUpdate({
        ...quotaAudience,
        locationQuotas: updatedQuotas,
      });
    } else if (type === "industry") {
      const updatedQuotas = (quotaAudience.categoryQuotas || []).map((q) => {
        const currentValue = q.target_count || q.target_percentage || 0;
        if (newQuotaType === "PERCENTAGE" && q.quota_type === "COUNT") {
          const percentage =
            totalTarget > 0
              ? Math.round((currentValue / totalTarget) * 100)
              : 0;
          return {
            ...q,
            quota_type: newQuotaType,
            target_count: undefined,
            target_percentage: percentage,
          };
        } else if (newQuotaType === "COUNT" && q.quota_type === "PERCENTAGE") {
          const count = Math.round((currentValue / 100) * totalTarget);
          return {
            ...q,
            quota_type: newQuotaType,
            target_count: count,
            target_percentage: undefined,
          };
        }
        return { ...q, quota_type: newQuotaType };
      });
      onQuotaAudienceUpdate({
        ...quotaAudience,
        categoryQuotas: updatedQuotas,
      });
    }
  };

  // Update quota target value
  const handleQuotaTargetChange = (
    type: "age" | "gender" | "location" | "industry",
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
    } else if (type === "industry") {
      const updatedQuotas = [...(quotaAudience.categoryQuotas || [])];
      updatedQuotas[index] = {
        ...updatedQuotas[index],
        quota_type: quotaType,
        target_count: quotaType === "COUNT" ? value : undefined,
        target_percentage: quotaType === "PERCENTAGE" ? value : undefined,
      };
      onQuotaAudienceUpdate({
        ...quotaAudience,
        categoryQuotas: updatedQuotas,
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

  // Validation calculations
  const calculateQuotaValidation = useMemo(() => {
    const totalTarget = quotaAudience.totalTarget || 100;
    const errors: QuotaValidationErrors = {};

    // Age quota validation
    const ageCountSum = quotaAudience.ageQuotas
      .filter((q) => q.quota_type === "COUNT" && q.target_count)
      .reduce((sum, q) => sum + (q.target_count || 0), 0);
    const agePercentageSum = quotaAudience.ageQuotas
      .filter((q) => q.quota_type === "PERCENTAGE" && q.target_percentage)
      .reduce((sum, q) => sum + (q.target_percentage || 0), 0);

    if (ageCountSum > 0 && ageCountSum !== totalTarget) {
      errors.ageCountSum = `Age quota count sum (${ageCountSum}) must equal Total Responses (${totalTarget})`;
    }
    if (agePercentageSum > 0 && agePercentageSum !== 100) {
      errors.agePercentageSum = `Age quota percentage sum (${agePercentageSum}%) must equal 100%`;
    }

    // Gender quota validation
    const genderCountSum = quotaAudience.genderQuotas
      .filter((q) => q.quota_type === "COUNT" && q.target_count)
      .reduce((sum, q) => sum + (q.target_count || 0), 0);
    const genderPercentageSum = quotaAudience.genderQuotas
      .filter((q) => q.quota_type === "PERCENTAGE" && q.target_percentage)
      .reduce((sum, q) => sum + (q.target_percentage || 0), 0);

    if (genderCountSum > 0 && genderCountSum !== totalTarget) {
      errors.genderCountSum = `Gender quota count sum (${genderCountSum}) must equal Total Responses (${totalTarget})`;
    }
    if (genderPercentageSum > 0 && genderPercentageSum !== 100) {
      errors.genderPercentageSum = `Gender quota percentage sum (${genderPercentageSum}%) must equal 100%`;
    }

    // Location quota validation
    const locationCountSum = quotaAudience.locationQuotas
      .filter((q) => q.quota_type === "COUNT" && q.target_count)
      .reduce((sum, q) => sum + (q.target_count || 0), 0);
    const locationPercentageSum = quotaAudience.locationQuotas
      .filter((q) => q.quota_type === "PERCENTAGE" && q.target_percentage)
      .reduce((sum, q) => sum + (q.target_percentage || 0), 0);

    if (locationCountSum > 0 && locationCountSum !== totalTarget) {
      errors.locationCountSum = `Location quota count sum (${locationCountSum}) must equal Total Responses (${totalTarget})`;
    }
    if (locationPercentageSum > 0 && locationPercentageSum !== 100) {
      errors.locationPercentageSum = `Location quota percentage sum (${locationPercentageSum}%) must equal 100%`;
    }

    // CATEGORY / INDUSTRY quota validation
    const categoryCountSum = (quotaAudience.categoryQuotas || [])
      .filter(
        (q) => q.quota_type === "COUNT" && q.target_count && q.target_count > 0
      )
      .reduce((sum, q) => sum + (q.target_count || 0), 0);

    const categoryPercentageSum = (quotaAudience.categoryQuotas || [])
      .filter(
        (q) =>
          q.quota_type === "PERCENTAGE" &&
          q.target_percentage &&
          q.target_percentage > 0
      )
      .reduce((sum, q) => sum + (q.target_percentage || 0), 0);

    // only validate if at least one category quota is active
    const hasActiveCategoryQuota = (quotaAudience.categoryQuotas || []).some(
      (q) =>
        (q.target_count && q.target_count > 0) ||
        (q.target_percentage && q.target_percentage > 0)
    );

    if (hasActiveCategoryQuota) {
      if (categoryCountSum > 0 && categoryCountSum !== totalTarget) {
        errors.categoryCountSum = `Industry quota count sum (${categoryCountSum}) must equal Total Responses (${totalTarget})`;
      }

      if (categoryPercentageSum > 0 && categoryPercentageSum !== 100) {
        errors.categoryPercentageSum = `Industry quota percentage sum (${categoryPercentageSum}%) must equal 100%`;
      }
    }

    return {
      errors,
      hasErrors: Object.keys(errors).length > 0,
      sums: {
        ageCount: ageCountSum,
        agePercentage: agePercentageSum,
        genderCount: genderCountSum,
        genderPercentage: genderPercentageSum,
        locationCount: locationCountSum,
        locationPercentage: locationPercentageSum,
      },
    };
  }, [
    quotaAudience.ageQuotas,
    quotaAudience.genderQuotas,
    quotaAudience.locationQuotas,
    quotaAudience.categoryQuotas,
    quotaAudience.totalTarget,
  ]);

  // Update validation errors for parent component
  useEffect(() => {
    if (calculateQuotaValidation.hasErrors) {
      const errorMessages = Object.values(calculateQuotaValidation.errors).join(
        "; "
      );
      setValidationErrors(calculateQuotaValidation.errors);
      // Only show validation error if quotas have been configured
      const hasActiveQuotas =
        quotaAudience.ageQuotas.some(isQuotaActive) ||
        quotaAudience.genderQuotas.some(isQuotaActive) ||
        quotaAudience.locationQuotas.some(isQuotaActive) ||
        (quotaAudience.categoryQuotas || []).some(isQuotaActive);
      if (hasActiveQuotas && surveySettings.survey_send_by !== "AGENT") {
        onValidationError?.(errorMessages);
      }
    } else {
      setValidationErrors({});
      if (surveySettings.survey_send_by !== "AGENT") {
        onValidationError?.(null);
      }
    }
  }, [calculateQuotaValidation, surveySettings.survey_send_by]);

  // Handle total target change
  const handleTotalTargetChange = (newTotal: number) => {
    onQuotaAudienceUpdate({
      ...quotaAudience,
      totalTarget: newTotal,
    });
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
  const isQuotaActive = (
    quota: AgeQuota | GenderQuota | LocationQuota | CategoryQuota
  ) => {
    return (
      (quota.target_count && quota.target_count > 0) ||
      (quota.target_percentage && quota.target_percentage > 0)
    );
  };

  // AGENT mode render
  // if (surveySettings.survey_send_by === "AGENT") {
  //   return (

  //   );
  // }

  return (
    <div className="space-y-4">
      {/* AGENT mode */}
      {surveySettings.survey_send_by == "AGENT" && (
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
      )}

      {/* Quota Enable/Disable Toggle */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-violet-600" />
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  Enable Quota Management
                </h2>
                <p className="text-sm text-slate-500">
                  Turn on to set response limits and audience targeting
                </p>
              </div>
            </div>
            <Switch
              checked={quotaAudience.quotaEnabled}
              // disabled={true}
              onCheckedChange={(checked) =>
                onQuotaAudienceUpdate({
                  ...quotaAudience,
                  quotaEnabled: checked,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Show quota settings only when enabled */}
      {quotaAudience.quotaEnabled && (
        <>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Define Target Audience & Quotas
            </h2>
            <p className="text-slate-500">
              Configure quota targets for different audience segments. Screening
              questions will be auto-generated.
            </p>
          </div>

          {/* Total Responses Input */}
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-violet-600" />
                  <Label
                    htmlFor="total-responses"
                    className="text-lg font-semibold"
                  >
                    Total Responses Required{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                </div>
                <Input
                  id="total-responses"
                  type="number"
                  className={`w-32 ${
                    validationErrors.totalTarget
                      ? "border-red-500 focus:ring-red-500"
                      : ""
                  }`}
                  value={quotaAudience.totalTarget || ""}
                  onChange={(e) =>
                    handleTotalTargetChange(parseInt(e.target.value) || 0)
                  }
                  min={1}
                  placeholder="Enter target"
                />
                <span className="text-sm text-slate-500">respondents</span>
              </div>
              {validationErrors.totalTarget && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {validationErrors.totalTarget}
                </p>
              )}
              <p className="text-sm text-slate-500 mt-2">
                This is the total number of survey responses you want to
                collect. Quota counts should sum up to this number, or
                percentages should sum to 100%.
              </p>
            </CardContent>
          </Card>

          {/* Validation Errors Display */}
          {calculateQuotaValidation.hasErrors && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800 mb-2">
                    Quota Validation Errors:
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {Object.values(calculateQuotaValidation.errors).map(
                      (error, idx) => (
                        <li key={idx}>{error}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="age">Age Groups</TabsTrigger>
                  <TabsTrigger value="gender">Gender</TabsTrigger>
                  <TabsTrigger value="location" disabled>
                    Location
                  </TabsTrigger>
                  <TabsTrigger value="industry">Industry</TabsTrigger>
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
                      <p className="text-sm text-slate-500 mb-4">
                        Click on any age group card to set target quotas
                      </p>
                      <div className="space-y-3">
                        {quotaAudience.ageQuotas.map((quota, index) => (
                          <div
                            key={index}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors hover:border-violet-400 ${
                              isQuotaActive(quota) || expandedQuotas.age[index]
                                ? "border-violet-300 bg-violet-50"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                            onClick={() => toggleQuotaExpanded("age", index)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant={
                                    isQuotaActive(quota) ? "default" : "outline"
                                  }
                                  className="text-sm px-3 py-1"
                                >
                                  {formatAgeRange(quota)}
                                </Badge>
                                {isQuotaActive(quota) && (
                                  <span className="text-sm text-violet-600 font-medium">
                                    Target:{" "}
                                    {quota.target_count ||
                                      quota.target_percentage}
                                    {quota.quota_type === "PERCENTAGE"
                                      ? "%"
                                      : ""}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAgeQuota(index);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAgeQuota(index);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>

                            {(isQuotaActive(quota) ||
                              expandedQuotas.age[index]) && (
                              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm">Type:</Label>
                                  <Select
                                    value={quota.quota_type}
                                    onValueChange={(value: QuotaType) => {
                                      handleQuotaTypeChange("age", value);
                                    }}
                                  >
                                    <SelectTrigger
                                      className="w-32"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="COUNT">
                                        Count
                                      </SelectItem>
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
                                    onClick={(e) => e.stopPropagation()}
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
                      <p className="text-sm text-slate-500 mb-4">
                        Click on any gender card to set target quotas
                      </p>
                      <div className="space-y-3">
                        {quotaAudience.genderQuotas.map((quota, index) => (
                          <div
                            key={index}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors hover:border-violet-400 ${
                              isQuotaActive(quota) ||
                              expandedQuotas.gender[index]
                                ? "border-violet-300 bg-violet-50"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                            onClick={() => toggleQuotaExpanded("gender", index)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant={
                                    isQuotaActive(quota) ? "default" : "outline"
                                  }
                                  className="text-sm px-3 py-1"
                                >
                                  {GENDER_LABELS[quota.gender]}
                                </Badge>
                                {isQuotaActive(quota) && (
                                  <span className="text-sm text-violet-600 font-medium">
                                    Target:{" "}
                                    {quota.target_count ||
                                      quota.target_percentage}
                                    {quota.quota_type === "PERCENTAGE"
                                      ? "%"
                                      : ""}
                                  </span>
                                )}
                              </div>
                            </div>

                            {(isQuotaActive(quota) ||
                              expandedQuotas.gender[index]) && (
                              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm">Type:</Label>
                                  <Select
                                    value={quota.quota_type}
                                    onValueChange={(value: QuotaType) => {
                                      handleQuotaTypeChange("gender", value);
                                    }}
                                  >
                                    <SelectTrigger
                                      className="w-32"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="COUNT">
                                        Count
                                      </SelectItem>
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
                                    onClick={(e) => e.stopPropagation()}
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
                        <CardTitle className="text-lg">
                          Location Quotas
                        </CardTitle>
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
                                    onClick={() =>
                                      handleDeleteLocationQuota(index)
                                    }
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
                                      handleQuotaTypeChange("location", value)
                                    }
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="COUNT">
                                        Count
                                      </SelectItem>
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

                {/* Industry Tab */}
                <TabsContent value="industry" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Industry / Category Quotas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-500 mb-4">
                        Click on any industry/category card to set target
                        quotas. All industries are shown for proper screening.
                      </p>

                      {(quotaAudience.categoryQuotas || []).length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <p>No categories available.</p>
                          <p className="text-sm">
                            Categories will appear here once loaded.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(quotaAudience.categoryQuotas || []).map(
                            (quota, index) => {
                              const hasTarget =
                                (quota.target_count &&
                                  quota.target_count > 0) ||
                                (quota.target_percentage &&
                                  quota.target_percentage > 0);
                              const isExpanded =
                                hasTarget || expandedQuotas.industry[index];

                              return (
                                <div
                                  key={quota.surveyCategoryId}
                                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:border-violet-400 ${
                                    hasTarget || isExpanded
                                      ? "border-violet-300 bg-violet-50"
                                      : "border-slate-200 hover:bg-slate-50"
                                  }`}
                                  onClick={() =>
                                    toggleQuotaExpanded("industry", index)
                                  }
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Badge
                                        variant={
                                          hasTarget ? "default" : "outline"
                                        }
                                        className="text-sm px-3 py-1"
                                      >
                                        {quota.categoryName ||
                                          quota.surveyCategory?.name ||
                                          quota.surveyCategoryId}
                                      </Badge>
                                      {hasTarget && (
                                        <span className="text-sm text-violet-600 font-medium">
                                          Target:{" "}
                                          {quota.target_count ||
                                            quota.target_percentage}
                                          {quota.quota_type === "PERCENTAGE"
                                            ? "%"
                                            : ""}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {(hasTarget || isExpanded) && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <Label className="text-sm">Type:</Label>
                                        <Select
                                          value={quota.quota_type}
                                          onValueChange={(value: QuotaType) => {
                                            handleQuotaTypeChange(
                                              "industry",
                                              value
                                            );
                                          }}
                                        >
                                          <SelectTrigger
                                            className="w-32"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="COUNT">
                                              Count
                                            </SelectItem>
                                            <SelectItem value="PERCENTAGE">
                                              Percentage
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Label className="text-sm">
                                          Target:
                                        </Label>
                                        <Input
                                          type="number"
                                          className="w-24"
                                          value={
                                            quota.target_count ||
                                            quota.target_percentage ||
                                            0
                                          }
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) =>
                                            handleQuotaTargetChange(
                                              "industry",
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
                              );
                            }
                          )}
                        </div>
                      )}

                      {(quotaAudience.categoryQuotas || []).filter(
                        (q) =>
                          (q.target_count && q.target_count > 0) ||
                          (q.target_percentage && q.target_percentage > 0)
                      ).length > 0 && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            <strong>
                              {
                                (quotaAudience.categoryQuotas || []).filter(
                                  (q) =>
                                    (q.target_count && q.target_count > 0) ||
                                    (q.target_percentage &&
                                      q.target_percentage > 0)
                                ).length
                              }
                            </strong>{" "}
                            industry/categories with targets. All industries
                            will be shown to respondents during screening.
                          </p>
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
                        {quotaAudience.genderQuotas.filter(isQuotaActive)
                          .length > 0 ? (
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
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs"
                            >
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

                    <div>
                      <Label className="text-sm font-medium text-slate-600">
                        Active Industry Quotas
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(quotaAudience.categoryQuotas || []).filter(
                          isQuotaActive
                        ).length > 0 ? (
                          (quotaAudience.categoryQuotas || [])
                            .filter(isQuotaActive)
                            .map((q, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs"
                              >
                                {q.categoryName ||
                                  q.surveyCategory?.name ||
                                  q.surveyCategoryId}
                                : {q.target_count || q.target_percentage}
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
                      onClick={() =>
                        setShowScreeningPreview(!showScreeningPreview)
                      }
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
                          {generateScreeningQuestions.map((question) => {
                            const savedQuestion =
                              quotaAudience.screeningQuestions.find(
                                (q) => q.id === question.id
                              );

                            const previewQuestion = {
                              ...question,
                              question_text:
                                savedQuestion?.question_text ||
                                question.question_text,
                            };

                            return (
                              <div
                                key={previewQuestion.id}
                                className="p-3 bg-slate-50 rounded-lg"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <Label className="text-xs text-slate-500 uppercase">
                                      {question.type} Question
                                    </Label>
                                    <Input
                                      value={previewQuestion.question_text}
                                      onChange={(e) =>
                                        handleScreeningQuestionTextChange(
                                          previewQuestion.id,
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
                                    Options:{" "}
                                    <span className="text-green-600">
                                      Green = Qualifying
                                    </span>{" "}
                                    |{" "}
                                    <span className="text-slate-400">
                                      Gray = Non-qualifying
                                    </span>
                                  </Label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {previewQuestion.options.map((opt) => {
                                      // Check if this option is a qualifying option (has quota target)
                                      let isQualifying = false;
                                      if (question.type === "age") {
                                        const ageQuota =
                                          quotaAudience.ageQuotas.find(
                                            (q) =>
                                              `${q.min_age}-${q.max_age}` ===
                                              opt.value
                                          );
                                        isQualifying = !!(
                                          ageQuota &&
                                          ((ageQuota.target_count &&
                                            ageQuota.target_count > 0) ||
                                            (ageQuota.target_percentage &&
                                              ageQuota.target_percentage > 0))
                                        );
                                      } else if (question.type === "gender") {
                                        const genderQuota =
                                          quotaAudience.genderQuotas.find(
                                            (q) => q.gender === opt.value
                                          );
                                        isQualifying = !!(
                                          genderQuota &&
                                          ((genderQuota.target_count &&
                                            genderQuota.target_count > 0) ||
                                            (genderQuota.target_percentage &&
                                              genderQuota.target_percentage >
                                                0))
                                        );
                                      } else if (question.type === "location") {
                                        const locationQuota =
                                          quotaAudience.locationQuotas.find(
                                            (q) => {
                                              try {
                                                const parsed = JSON.parse(
                                                  opt.value
                                                );
                                                return (
                                                  q.country ===
                                                    parsed.country &&
                                                  q.state === parsed.state &&
                                                  q.city === parsed.city
                                                );
                                              } catch {
                                                return false;
                                              }
                                            }
                                          );
                                        isQualifying = !!(
                                          locationQuota &&
                                          ((locationQuota.target_count &&
                                            locationQuota.target_count > 0) ||
                                            (locationQuota.target_percentage &&
                                              locationQuota.target_percentage >
                                                0))
                                        );
                                      } else if (question.type === "category") {
                                        const categoryQuota =
                                          quotaAudience.categoryQuotas.find(
                                            (q) =>
                                              q.surveyCategoryId === opt.value
                                          );
                                        isQualifying = !!(
                                          categoryQuota &&
                                          ((categoryQuota.target_count &&
                                            categoryQuota.target_count > 0) ||
                                            (categoryQuota.target_percentage &&
                                              categoryQuota.target_percentage >
                                                0))
                                        );
                                      }

                                      return (
                                        <Badge
                                          key={opt.id}
                                          variant="outline"
                                          className={`text-xs ${
                                            isQualifying
                                              ? "bg-green-50 border-green-500 text-green-700"
                                              : "bg-slate-50 border-slate-300 text-slate-400"
                                          }`}
                                        >
                                          {opt.label}
                                          {isQualifying && " ✓"}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
        </>
      )}

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
