import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  quotaApi,
  quotaFeasibilityApi,
  screeningQuestionsApi,
  vendorsApi,
} from "@/lib/api";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { Button } from "./ui/button";
import { Download } from "lucide-react";
import { deepEqual } from "@/lib/deepCompare";

/** =========================
 * API types (your format)
 * ========================= */
export type ApiScreeningOption = {
  id: string;
  option_text: string;
  vendor_option_id?: string | null;
};

export type QuotaBucketOperator =
  | "BETWEEN"
  | "IN"
  | "EQ"
  | "GTE"
  | "LTE"
  | "INTERSECTS";

export type QuotaBucket = {
  label?: string | null;
  operator: QuotaBucketOperator;
  value: any; // BETWEEN: {min,max} | IN: string[] | EQ: string/number
  target: number;
};

export type ApiScreeningQuestion = {
  id: string;
  country_code: string;
  language: string;
  question_key: string;
  question_text: string;
  question_type: string;
  data_type: string;
  source: "SYSTEM" | "VENDOR" | string;
  vendorId?: string | null;
  vendor_question_id?: string | null;
  primary_vendor_category_id?: string | null;
  primary_vendor_category_name?: string | null;
  categories_meta?: unknown | null;
  is_active: boolean;
  created_at: string;
  options: ApiScreeningOption[];
};

export type Vendor = {
  id: string;
  name: string;
};

export type QuotaOptionTarget = {
  optionId: string;
  target: number;
  vendorOptionId?: string | null;
};

export type QuotaScreeningQuestion = {
  questionId: string;
  vendorQuestionId?: string | null;
  optionTargets?: QuotaOptionTarget[];
  buckets?: QuotaBucket[];
};

// Updated QuotaAudience type to include filter fields
export type QuotaAudience = {
  enabled: boolean;
  totalTarget: number | null;
  screening: QuotaScreeningQuestion[];
  // Add filter fields that will be saved to DB
  vendorId?: string | null;
  countryCode?: string | null;
  language?: string | null;
  incidenceRate?: number | null;
  lengthOfSurvey?: number | null;
  numberOfDays?: number | null;
  exactPrice?: number | null;
};

type SurveySettings = {
  survey_send_by?: "VENDOR" | string;
};

// Estimate payload shape
export type EstimatePayload = {
  vendorId: string;
  countryCode: string;
  language: string;
  totalTarget: number;
  incidenceRate: number;
  lengthOfSurvey: number;
  numberOfDays: number;
};

export type QuotaAudienceSelectorProps = {
  createdSurvey: { id: string; questionsCount?: number };
  surveySettings: SurveySettings;
  quotaAudience: QuotaAudience;
  originalQuotaAudience: QuotaAudience | null;
  handleOriginalQuotaChange: (next: QuotaAudience) => void;
  onQuotaAudienceUpdate: (next: QuotaAudience) => void;
  onUserUniqueIdsUpdate: (userUniqueIds: string[]) => void;
  onValidationError?: (message: string | null) => void;
  onQuotaReady?: (ready: boolean) => void; // Enables parent Preview btn
  // onPriceApproved?: (approved: boolean, exactPrice?: number) => void;
  categories?: { id: string; name: string }[];
  isEditMode?: boolean;
};

/** =========================
 * UI: blocking loading modal
 * ========================= */
function LoadingModal({
  open,
  shortMessage = "Questions",
  title = "Loading",
  message = "Please wait…",
}: {
  open: boolean;
  shortMessage: string;
  title?: string;
  message?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-92 max-w-md rounded bg-white p-5 shadow-lg">
        <div className="text-base font-semibold">{title}</div>
        <div className="mt-2 text-sm text-gray-600">{message}</div>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
          <div className="text-sm text-gray-700">
            Fetching {shortMessage}...
          </div>
        </div>
      </div>
    </div>
  );
}

/** =========================
 * Fetchers
 * ========================= */
type ScreeningQuestionsPayload =
  | { source: "SYSTEM"; countryCode: string; language: string }
  | {
      source: "VENDOR";
      vendorId: string;
      countryCode: string;
      language: string;
    };

async function fetchVendors(): Promise<Vendor[]> {
  const res = await vendorsApi.getVendors();
  const data = res.data?.data || [];
  console.log(">>>>>> the value of the VENDORS data is : ", data);
  return data.filter((d) => d.is_active == true);
}

/** =========================
 * Helpers
 * ========================= */
function normalizeOptionLabel(opt: ApiScreeningOption) {
  return opt.option_text ?? String(opt.id);
}

function validateQuota(
  quotaAudience: QuotaAudience,
  questions: ApiScreeningQuestion[],
  surveySettings: SurveySettings,
  file: File | null,
  fileData: any[],
  isVendorFlow: boolean,
  vendorId?: string, // Added for real-time validation
  countryCode?: string, // Added
  language?: string, // Added
  incidenceRate?: number, // Added
  flowStep?: "fields" | "estimate" | "questions" | "priced", // Added
): string | null {
  // Check AGENT mode validation (runs regardless of quota enabled)
  const isAgentMode = surveySettings?.survey_send_by === "AGENT"; // Access surveySettings (add as param)
  if (isAgentMode && (!file || !fileData))
    return "Please upload an Excel file with user IDs for Agent mode";

  if (quotaAudience.enabled) {
    if (flowStep === "fields") {
      if (isVendorFlow && !vendorId) return "Please Select the Vendor.";
      if (!countryCode) return "Please select Country.";
      if (!language) return "Please select Language.";
      if (!quotaAudience.totalTarget || quotaAudience.totalTarget <= 0) {
        return "Total target must be > 0.";
      }
      if (!incidenceRate || incidenceRate < 0 || incidenceRate > 100)
        return "Incidence Rate must be 0-100.";
    }

    if (flowStep === "questions") {
      if (!quotaAudience.screening || quotaAudience.screening.length === 0) {
        return "Please select at least 1 screening question.";
      }
    }
    if (isAgentMode && file) {
      if (fileData.length != quotaAudience.totalTarget) {
        return "Total target must be equal to the number of user IDs in the Excel file.";
      }
    }
    for (const s of quotaAudience.screening) {
      const q = questions.find((qq) => qq.id === s.questionId);
      if (!q) continue;
      if (q.options?.length) {
        const targets = s.optionTargets ?? [];
        const sum = targets.reduce(
          (acc, t) => acc + (Number.isFinite(t.target) ? t.target : 0),
          0,
        );
        if (sum !== quotaAudience.totalTarget) {
          return `Targets for "${q.question_text}" must sum to total target (${quotaAudience.totalTarget}). Current sum: ${sum}.`;
        }
        continue;
      }

      // open-ended questions -> buckets
      const buckets = s.buckets ?? [];
      if (buckets.length === 0)
        return `Please add at least 1 bucket for "${q.question_text}".`;
      const sum = buckets.reduce(
        (acc, b) => acc + (Number.isFinite(b.target) ? b.target : 0),
        0,
      );
      if (sum !== quotaAudience.totalTarget) {
        return `Bucket targets for "${q.question_text}" must sum to total target ${quotaAudience.totalTarget}. Current sum ${sum}.`;
      }
      // Optional: basic operator validation (recommended)
      for (const b of buckets) {
        if (b.operator === "BETWEEN") {
          const min = Number(b.value?.min);
          const max = Number(b.value?.max);
          if (!Number.isFinite(min) || !Number.isFinite(max))
            return `Bucket "${b.label ?? ""}" in "${
              q.question_text
            }" must have numeric min/max.`;
          if (min > max)
            return `Bucket "${b.label ?? ""}" in "${
              q.question_text
            }" has min > max.`;
        }
        if (b.operator === "IN" || b.operator === "INTERSECTS") {
          if (!Array.isArray(b.value) || b.value.length === 0)
            return `Bucket ${b.label ?? ""} must have at least one zipcode.`;
        }
      }
    }
  }
  return null;
}

function getScreeningEntry(quotaAudience: QuotaAudience, questionId: string) {
  return quotaAudience.screening.find((s) => s.questionId === questionId);
}

function rebalanceToTotal(
  optionTargets: QuotaOptionTarget[],
  totalTarget: number,
  changedOptionId?: string,
): QuotaOptionTarget[] {
  const sum = optionTargets.reduce((a, t) => a + t.target, 0);
  const diff = totalTarget - sum;
  if (diff === 0) return optionTargets;

  let adjustIndex = optionTargets.length - 1;
  if (changedOptionId) {
    const idx = optionTargets.findIndex((t) => t.optionId === changedOptionId);
    if (idx >= 0) adjustIndex = Math.max(0, optionTargets.length - 2);
  }
  if (!optionTargets[adjustIndex]) return optionTargets;

  const next = optionTargets.slice();
  next[adjustIndex] = {
    ...next[adjustIndex],
    target: Math.max(0, next[adjustIndex].target + diff),
  };
  return next;
}

function groupQuestionsByVendorCategory(
  questions: ApiScreeningQuestion[],
  enabledGrouping: boolean,
): Array<{
  categoryId: string;
  categoryName: string;
  questions: ApiScreeningQuestion[];
}> {
  if (!enabledGrouping) {
    return [{ categoryId: "ALL", categoryName: "All questions", questions }];
  }
  const map = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      questions: ApiScreeningQuestion[];
    }
  >();
  for (const q of questions) {
    const key = q.primary_vendor_category_id ?? "UNCATEGORIZED";
    const name = q.primary_vendor_category_name ?? "Uncategorized";
    const existing = map.get(key);
    if (existing) {
      existing.questions.push(q);
    } else {
      map.set(key, { categoryId: key, categoryName: name, questions: [q] });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName),
  );
}

/** =========================
 * Component
 * ========================= */
export default function EnhancedQuotaAudienceSelector({
  createdSurvey,
  surveySettings,
  quotaAudience,
  originalQuotaAudience,
  handleOriginalQuotaChange,
  onQuotaAudienceUpdate,
  onUserUniqueIdsUpdate,
  onValidationError,
  onQuotaReady,
  // onPriceApproved,
  categories = [],
  isEditMode = false,
}: QuotaAudienceSelectorProps) {
  const isVendorFlow = surveySettings?.survey_send_by === "VENDOR";

  // Initialize filters from quotaAudience prop (from DB)
  const [countryCode, setCountryCode] = React.useState<string>(
    quotaAudience.countryCode || "IN",
  );
  const [language, setLanguage] = React.useState<string>(
    quotaAudience.language || "ENGLISH",
  );
  const [vendorId, setVendorId] = React.useState<string>(
    quotaAudience.vendorId || "",
  );

  const [file, setFile] = React.useState<File | null>(null);
  const [fileData, setFileData] = React.useState<any[]>([]);

  // States for EXACT flow
  const [flowStep, setFlowStep] = React.useState<
    "fields" | "estimate" | "questions" | "priced"
  >("fields");
  const [estimateCost, setEstimateCost] = React.useState<number | null>(null);
  const [exactPrice, setExactPrice] = React.useState<number | null>(null);
  // const [isQuotaSaved, setIsQuotaSaved] = React.useState(false); // Tracks Save Quota clicked
  const [incidenceRate, setIncidenceRate] = React.useState<number>(80); // 0-100 default 80
  const [lengthOfSurvey, setLengthOfSurvey] = React.useState<number>(10); // Default; parent passes question count
  const [numberOfDays, setNumberOfDays] = React.useState<number>(7); // Default 7 days Live
  const [isEstimating, setIsEstimating] = React.useState(false);
  const [isAddingQuota, setIsAddingQuota] = React.useState(false);

  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );
  const [lastEstimatePayload, setLastEstimatePayload] =
    React.useState<EstimatePayload | null>(null);

  // Use prop questionCount, fallback to 10
  const questionCount = createdSurvey.questionsCount || 10;
  React.useEffect(() => {
    setLengthOfSurvey(questionCount);
  }, [questionCount]);

  // Real-time validation for 7 fields
  const isAllFieldsFilled = React.useMemo(() => {
    return !!(
      vendorId &&
      countryCode &&
      language &&
      quotaAudience.totalTarget &&
      quotaAudience.totalTarget > 0 &&
      incidenceRate >= 0 &&
      incidenceRate <= 100 &&
      numberOfDays >= 1
    );
  }, [
    vendorId,
    countryCode,
    language,
    quotaAudience.totalTarget,
    incidenceRate,
    numberOfDays,
  ]);

  const currentEstimatePayload = React.useMemo<EstimatePayload | null>(() => {
    if (!isAllFieldsFilled) return null;

    return {
      vendorId,
      countryCode,
      language,
      totalTarget: quotaAudience.totalTarget!,
      incidenceRate,
      lengthOfSurvey,
      numberOfDays,
    };
  }, [
    vendorId,
    countryCode,
    language,
    quotaAudience.totalTarget,
    incidenceRate,
    lengthOfSurvey,
    numberOfDays,
    isAllFieldsFilled,
  ]);

  const hasEstimateInputsChanged = React.useMemo(() => {
    if (!lastEstimatePayload || !currentEstimatePayload) return true;

    return !deepEqual(lastEstimatePayload, currentEstimatePayload);
  }, [lastEstimatePayload, currentEstimatePayload]);

  const withFilters = React.useCallback(
    (next: QuotaAudience): QuotaAudience => ({
      ...next,
      vendorId: isVendorFlow ? vendorId || null : null,
      countryCode: countryCode || null,
      language: language || null,
      // Persist estimate fields to quotaAudience for DB save
      incidenceRate,
      lengthOfSurvey,
      numberOfDays,
    }),
    [
      isVendorFlow,
      vendorId,
      countryCode,
      language,
      incidenceRate,
      lengthOfSurvey,
      numberOfDays,
    ],
  );

  const prevFlowRef = React.useRef<boolean | null>(null);

  // Tracks last applied filters to detect real changes (avoid wiping DB-loaded state)
  const prevFiltersRef = React.useRef<{
    isVendorFlow: boolean;
    vendorId: string;
    countryCode: string;
    language: string;
  } | null>(null);

  // Update filters when quotaAudience changes (Edit Mode)
  React.useEffect(() => {
    if (isEditMode && quotaAudience.enabled) {
      if (quotaAudience.countryCode) setCountryCode(quotaAudience.countryCode);
      if (quotaAudience.language) setLanguage(quotaAudience.language);
      if (quotaAudience.vendorId && isVendorFlow)
        setVendorId(quotaAudience.vendorId);
      // align baseline with DB state to avoid unintended reset
      prevFiltersRef.current = {
        isVendorFlow,
        vendorId: (quotaAudience.vendorId ?? vendorId ?? "") as string,
        countryCode: (quotaAudience.countryCode ?? countryCode ?? "") as string,
        language: (quotaAudience.language ?? language ?? "") as string,
      };
    }
  }, [
    isEditMode,
    quotaAudience.enabled,
    quotaAudience.countryCode,
    quotaAudience.language,
    quotaAudience.vendorId,
    isVendorFlow,
  ]);

  React.useEffect(() => {
    if (!quotaAudience.enabled) return;

    // baseline
    if (prevFlowRef.current === null) {
      prevFlowRef.current = isVendorFlow;
      return;
    }

    // If survey_send_by changed => wipe screening
    if (prevFlowRef.current !== isVendorFlow) {
      prevFlowRef.current = isVendorFlow;

      // Also reset baseline for filter-change tracker so it won't re-trigger weirdly
      prevFiltersRef.current = {
        isVendorFlow,
        vendorId: normalizeVendor(isVendorFlow ? vendorId : ""),
        countryCode: countryCode ?? "",
        language: language ?? "",
      };

      onQuotaAudienceUpdate(
        withFilters({
          ...quotaAudience,
          screening: [],
        }),
      );
      onValidationError?.(null);
    }
  }, [
    quotaAudience.enabled,
    isVendorFlow,
    quotaAudience,
    withFilters,
    onQuotaAudienceUpdate,
    onValidationError,
    vendorId,
    countryCode,
    language,
  ]);

  const didInitEditRef = React.useRef(false);

  const normalizeVendor = (v: string | null | undefined) => (v ?? "").trim();

  React.useEffect(() => {
    if (!quotaAudience.enabled) return;

    if (isEditMode && !didInitEditRef.current) {
      didInitEditRef.current = true;
      prevFiltersRef.current = {
        isVendorFlow,
        vendorId: normalizeVendor(isVendorFlow ? vendorId : ""),
        countryCode: countryCode ?? "",
        language: language ?? "",
      };
      return;
    }

    const curr = {
      isVendorFlow,
      vendorId: normalizeVendor(isVendorFlow ? vendorId : ""), // ✅ ignore in SYSTEM
      countryCode: countryCode ?? "",
      language: language ?? "",
    };

    const prev = prevFiltersRef.current ?? curr;

    const changed =
      prev.countryCode !== curr.countryCode ||
      prev.language !== curr.language ||
      (curr.isVendorFlow && prev.vendorId !== curr.vendorId); // ✅ only compare vendor in VENDOR flow

    if (!prevFiltersRef.current) {
      prevFiltersRef.current = curr;
      return;
    }

    if (!changed) return;

    prevFiltersRef.current = curr;

    onQuotaAudienceUpdate({
      ...quotaAudience,
      screening: [],
      vendorId: curr.isVendorFlow ? curr.vendorId || null : null,
      countryCode: curr.countryCode || null,
      language: curr.language || null,
    });

    onValidationError?.(null);
  }, [
    quotaAudience.enabled,
    isEditMode,
    isVendorFlow,
    vendorId,
    countryCode,
    language,
    quotaAudience,
    onQuotaAudienceUpdate,
    onValidationError,
  ]);

  // Vendor list (only when vendor flow)
  const vendorsQuery = useQuery({
    queryKey: ["vendors"],
    queryFn: fetchVendors,
    enabled: quotaAudience.enabled && isVendorFlow,
    staleTime: 60000,
  });

  // Build payload for questions
  const questionsPayload: ScreeningQuestionsPayload | null =
    React.useMemo(() => {
      if (flowStep !== "questions" || !quotaAudience.enabled) return null;
      if (isVendorFlow && (!vendorId || !countryCode || !language)) return null;
      if (!isVendorFlow && (!countryCode || !language)) return null;
      return isVendorFlow
        ? {
            source: "VENDOR" as const,
            vendorId: vendorId!,
            countryCode,
            language,
          }
        : { source: "SYSTEM" as const, countryCode, language };
    }, [
      flowStep,
      quotaAudience.enabled,
      isVendorFlow,
      vendorId,
      countryCode,
      language,
    ]);

  // Fetch questions only when payload is ready
  const questionsQuery = useQuery({
    queryKey: ["screeningQuestions", questionsPayload],
    queryFn: async () => {
      if (!questionsPayload) throw new Error("Missing payload");
      const screeningQuestionsApiResponse =
        await screeningQuestionsApi.getScreeningQuestions(questionsPayload);
      console.log(
        "screeningQuestionsApiResponse is",
        screeningQuestionsApiResponse,
      );
      return (screeningQuestionsApiResponse.data?.data ??
        []) as ApiScreeningQuestion[];
    },
    enabled: Boolean(questionsPayload),
    staleTime: 30000,
  });

  const questions = (questionsQuery.data ?? []).filter(
    (q) => q.is_active !== false,
  );

  // Grouping (only vendor flow groups by primary_vendor_category_id)
  const grouped = React.useMemo(
    () => groupQuestionsByVendorCategory(questions, isVendorFlow),
    [questions, isVendorFlow],
  );

  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!grouped.length) {
      setActiveCategoryId(null);
      return;
    }
    if (!activeCategoryId) {
      setActiveCategoryId(grouped[0].categoryId);
      return;
    }
    if (!grouped.some((g) => g.categoryId === activeCategoryId)) {
      setActiveCategoryId(grouped[0].categoryId);
    }
  }, [grouped, activeCategoryId]);

  // Validation callback
  React.useEffect(() => {
    const msg = validateQuota(
      quotaAudience,
      questions,
      surveySettings,
      file,
      fileData,
      isVendorFlow,
      vendorId,
      countryCode,
      language,
      incidenceRate,
      flowStep,
    );
    setValidationError(msg);
    onValidationError?.(msg);
  }, [
    quotaAudience,
    questions,
    onValidationError,
    surveySettings,
    file,
    fileData,
    isVendorFlow,
    vendorId,
    countryCode,
    language,
    incidenceRate,
    flowStep,
  ]);

  // RESET flowStep when Input field changes
  React.useEffect(() => {
    if (flowStep !== "fields") {
      setFlowStep("fields"); // 🔥 Force reset
      onQuotaAudienceUpdate(
        withFilters({
          ...quotaAudience,
          screening: [],
        }),
      );
    }
  }, [
    quotaAudience.totalTarget,
    vendorId,
    countryCode,
    language,
    incidenceRate,
    numberOfDays,
  ]);

  // 🔥 AUTO SKIP ESTIMATE IF SCREENING EXISTS (Edit Mode)
  React.useEffect(() => {
    if (
      quotaAudience.enabled &&
      quotaAudience.screening &&
      quotaAudience.screening.length > 0 &&
      flowStep === "fields"
    ) {
      setFlowStep("questions"); // skip estimate
    }
  }, [quotaAudience.enabled]);

  const activeGroup = grouped.find((g) => g.categoryId === activeCategoryId);

  // ====================================
  // HANDLERS
  // ====================================

  // Check Estimate handler
  const handleCheckEstimate = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!isAllFieldsFilled) return toast.error("Fill all 7 fields first.");
    setIsEstimating(true);

    try {
      const payload: EstimatePayload = {
        vendorId,
        countryCode,
        language,
        totalTarget: quotaAudience.totalTarget!,
        incidenceRate,
        lengthOfSurvey,
        numberOfDays,
      };
      const res = await quotaFeasibilityApi.getEstimatedAmount(payload);
      console.log(">>>>>> the value of the ESTIMATED RES is : ", res);
      setEstimateCost(res.data?.data?.estimatedAmount || 170);
      // For saving the CurrentEstimatedPayload in the Last Estimated Payload
      if (currentEstimatePayload) {
        setLastEstimatePayload(currentEstimatePayload);
      }

      setFlowStep("estimate");
      toast.success("Estimate fetched successfully!");
    } catch (error) {
      toast.error("Failed to fetch estimate. Check backend/InnovateMR.");
      console.error("Estimate error:", error);
    } finally {
      setIsEstimating(false);
    }
  };

  // Add Quota Questions handler
  const handleAddQuotaQuestions = () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!estimateCost) {
      toast.error("Get estimate first.");
      return;
    }
    setFlowStep("questions");
    // Questions will auto-fetch due to flowStep change
  };

  function buildEnhancedQuotaPayload(q: QuotaAudience) {
    // Adjust keys to your backend expectation
    return {
      enabled: q.enabled ?? false,
      totalTarget: q.totalTarget ?? 0,
      vendorId: q.vendorId ?? null,
      countryCode: q.countryCode ?? null,
      language: q.language ?? null,
      screening: q.screening.map((s) => ({
        questionId: s.questionId,
        vendorQuestionId: s.vendorQuestionId ?? null,

        optionTargets: (s.optionTargets ?? []).map((t) => ({
          optionId: t.optionId,
          vendorOptionId: t.vendorOptionId ?? null,
          target: t.target,
        })),

        // NEW
        buckets: (s.buckets ?? []).map((b) => ({
          label: b.label ?? null,
          operator: b.operator,
          value: b.value,
          target: b.target,
        })),
      })),
    };
  }

  const handleManualQuotaUpdate = async (
    surveyId: string,
    q: QuotaAudience,
  ) => {
    try {
      // console.log(">>>>> the value of the QUOTA AUDIENCE in STEP 4 is : ", q);

      if (!q.totalTarget || q.totalTarget <= 0) {
        toast.error(
          "Total Responses Required is mandatory when quota is enabled",
        );
        return;
      }

      if (!q.screening || q.screening.length === 0) {
        toast.error("Please select at least 1 screening question");
        return;
      }

      const currentPayload = buildEnhancedQuotaPayload(q);
      // console.log(
      //   ">>>>> the value of the CURRENT PAYLOAD is : ",
      //   currentPayload,
      // );

      const originalPayload = originalQuotaAudience
        ? buildEnhancedQuotaPayload(originalQuotaAudience)
        : null;
      // console.log(
      //   ">>>>> the value of the ORIGINAL PAYLOAD is : ",
      //   originalPayload,
      // );

      const hasChanged =
        !originalPayload || !deepEqual(currentPayload, originalPayload);
      if (!hasChanged) {
        console.log("No quota changes detected. Skipping updateQuota.");
        return;
      }

      // update this call signature to match your API:
      await quotaApi.updateQuota_v2(surveyId, currentPayload);

      handleOriginalQuotaChange(JSON.parse(JSON.stringify(q)));
      toast.success("Quota configuration updated");
    } catch (error: any) {
      console.error("Error updating quota:", error);
      toast.error("Failed to update quota configuration");
      throw new Error("Failed to update quota configuration");
    }
  };

  // Save Quota + Pricing API
  const handleSaveQuota = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!createdSurvey?.id || !quotaAudience.screening?.length) {
      toast.error("No survey or screening questions selected.");
      return;
    }
    setIsAddingQuota(true);
    try {
      // await quotaApi.addQuota(createdSurvey.id!, savePayload);
      await handleManualQuotaUpdate(createdSurvey.id, quotaAudience);

      console.log(">>>>> SAVING the quota details.......");

      // Get EXACT pricing
      const priceRes = await quotaFeasibilityApi.getExactCost(
        createdSurvey.id!,
        vendorId,
      );
      setExactPrice(priceRes.data?.data?.exactAmount || 0);
      // setIsQuotaSaved(true);
      setFlowStep("priced");

      // Notify parent Preview btn is ready
      onQuotaReady?.(true);

      toast.success(`Quota saved!`);
      onQuotaAudienceUpdate(withFilters({ ...quotaAudience, exactPrice: 100 }));
    } catch (error) {
      toast.error("Save quota failed");
    } finally {
      setIsAddingQuota(false);
    }
  };

  const setEnabled = (enabled: boolean) => {
    if (!enabled) {
      onQuotaAudienceUpdate({
        ...quotaAudience,
        enabled: false,
        totalTarget: null,
        screening: [],
      });
      onValidationError?.(null);
      return;
    }
    onQuotaAudienceUpdate({
      enabled: true,
      totalTarget: quotaAudience.totalTarget ?? 100,
      screening: quotaAudience.screening ?? [],
      // Save current filter values
      vendorId: vendorId || null,
      countryCode: countryCode,
      language: language,
    });
  };

  const setTotalTarget = (value: number) => {
    const totalTarget = Math.max(
      0,
      Math.trunc(Number.isFinite(value) ? value : 0),
    );

    const nextScreening = quotaAudience.screening.map((s) => {
      const q = questions.find((qq) => qq.id === s.questionId);
      if (!q?.options?.length) return s;

      const optionIds = q.options.map((o) => o.id);
      const existing = new Map(
        (s.optionTargets ?? []).map((t) => [t.optionId, t.target]),
      );

      const targets: QuotaOptionTarget[] = optionIds.map((id) => ({
        optionId: id,
        vendorOptionId:
          q.options.find((o) => o.id === id)?.vendor_option_id ?? null,
        target: Math.max(0, Math.trunc(existing.get(id) ?? 0)),
      }));

      return { ...s, optionTargets: rebalanceToTotal(targets, totalTarget) };
    });

    onQuotaAudienceUpdate(
      withFilters({ ...quotaAudience, totalTarget, screening: nextScreening }),
    );
  };

  const toggleScreeningQuestion = (
    q: ApiScreeningQuestion,
    checked: boolean,
  ) => {
    if (checked) {
      if (getScreeningEntry(quotaAudience, q.id)) return;

      const total = quotaAudience.totalTarget ?? 0;
      const newEntry: QuotaScreeningQuestion = q.options?.length
        ? {
            questionId: q.id,
            vendorQuestionId: q.vendor_question_id ?? undefined,
            optionTargets: rebalanceToTotal(
              q.options.map((o) => ({
                optionId: o.id,
                vendorOptionId: o.vendor_option_id ?? null,
                target: 0,
              })),
              total,
            ),
          }
        : {
            questionId: q.id,
            vendorQuestionId: q.vendor_question_id ?? undefined,
            buckets: [
              // default bucket
              q.data_type === "NUMBER"
                ? {
                    label: "18-24",
                    operator: "BETWEEN",
                    value: { min: 18, max: 24 },
                    target: total,
                  }
                : {
                    label: "Allowed",
                    operator: "IN",
                    value: [],
                    target: total,
                  },
            ],
          };

      onQuotaAudienceUpdate(
        withFilters({
          ...quotaAudience,
          screening: [...quotaAudience.screening, newEntry],
        }),
      );
    } else {
      onQuotaAudienceUpdate(
        withFilters({
          ...quotaAudience,
          screening: quotaAudience.screening.filter(
            (s) => s.questionId !== q.id,
          ),
        }),
      );
    }
  };

  const addBucket = (questionId: string) => {
    onQuotaAudienceUpdate(
      withFilters({
        ...quotaAudience,
        screening: quotaAudience.screening.map((s) => {
          if (s.questionId !== questionId) return s;

          const nextBuckets = [
            ...(s.buckets ?? []),
            {
              label: "",
              operator: "BETWEEN" as const,
              value: { min: 18, max: 24 },
              target: 0,
            },
          ];

          return { ...s, buckets: nextBuckets };
        }),
      }),
    );
  };

  const removeBucket = (questionId: string, idx: number) => {
    onQuotaAudienceUpdate(
      withFilters({
        ...quotaAudience,
        screening: quotaAudience.screening.map((s) => {
          if (s.questionId !== questionId) return s;
          const next = (s.buckets ?? []).filter((_, i) => i !== idx);
          return { ...s, buckets: next };
        }),
      }),
    );
  };

  const updateBucket = (
    questionId: string,
    idx: number,
    patch: Partial<QuotaBucket>,
  ) => {
    onQuotaAudienceUpdate(
      withFilters({
        ...quotaAudience,
        screening: quotaAudience.screening.map((s) => {
          if (s.questionId !== questionId) return s;
          const next = (s.buckets ?? []).map((b, i) =>
            i === idx ? { ...b, ...patch } : b,
          );
          return { ...s, buckets: next };
        }),
      }),
    );
  };

  const setOptionTarget = (
    questionId: string,
    optionId: string,
    target: number,
  ) => {
    const totalTarget = quotaAudience.totalTarget ?? 0;
    const q = questions.find((qq) => qq.id === questionId);
    if (!q?.options?.length) return;

    const optionIds = q.options.map((o) => o.id);
    const nextScreening = quotaAudience.screening.map((s) => {
      if (s.questionId !== questionId) return s;

      const existing = new Map(
        (s.optionTargets ?? []).map((t) => [t.optionId, t.target]),
      );

      const nextTargets: QuotaOptionTarget[] = optionIds.map((id) => ({
        optionId: id,
        vendorOptionId:
          q.options.find((o) => o.id === id)?.vendor_option_id ?? null,
        target: Math.max(
          0,
          Math.trunc(id === optionId ? target : (existing.get(id) ?? 0)),
        ),
      }));

      return {
        ...s,
        optionTargets: rebalanceToTotal(nextTargets, totalTarget, optionId),
      };
    });

    onQuotaAudienceUpdate(
      withFilters({ ...quotaAudience, totalTarget, screening: nextScreening }),
    );
  };

  // Update filters and save to quotaAudience
  const handleVendorChange = (newVendorId: string) => {
    setVendorId(newVendorId);
    onQuotaAudienceUpdate({
      ...quotaAudience,
      vendorId: newVendorId || null,
      countryCode,
      language,
    });
  };

  const handleCountryChange = (newCountryCode: string) => {
    setCountryCode(newCountryCode);
    onQuotaAudienceUpdate({
      ...quotaAudience,
      vendorId: vendorId || null,
      countryCode: newCountryCode,
      language,
    });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    onQuotaAudienceUpdate({
      ...quotaAudience,
      vendorId: vendorId || null,
      countryCode,
      language: newLanguage,
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
          console.log(">>>>>> the value of the JSON DATA is : ", jsonData);
          setFileData(jsonData);

          if (
            !jsonData.length ||
            !jsonData[0].hasOwnProperty("userUniqueIds")
          ) {
            toast.error(
              'Excel file must contain a column named "userUniqueIds"',
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

  const isLoadingVendors = quotaAudience.enabled && vendorsQuery.isFetching;
  const isLoadingQuestions = quotaAudience.enabled && questionsQuery.isFetching;

  return (
    <div>
      {/* AGENT mode */}
      {surveySettings.survey_send_by == "AGENT" && (
        <div className="mb-6">
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
      <div className="w-full rounded border p-4">
        {isLoadingVendors && (
          <LoadingModal
            open={true}
            shortMessage="vendors"
            title="Loading vendors"
            message="Please wait while fetching available vendors..."
          />
        )}
        {isLoadingQuestions &&
          !isLoadingVendors && ( // Show only if not already showing vendors
            <LoadingModal
              open={true}
              shortMessage="questions"
              title="Fetching vendor questions"
              message="Please wait until vendor questions are loaded."
            />
          )}

        {/* Enable quota */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <input
              id="quotaEnabled"
              type="checkbox"
              checked={quotaAudience.enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <label htmlFor="quotaEnabled" className="font-medium">
              Enable quota
            </label>
          </div>
        </div>

        {quotaAudience.enabled && (
          <div className="space-y-6">
            {/* TOP: ALWAYS 7 FIELDS + Check Estimate */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 border rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50">
              {/* Vendor */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Vendor *
                </label>
                <select
                  value={vendorId || ""}
                  onChange={(e) => handleVendorChange(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Vendor</option>
                  {vendorsQuery.data?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Country */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Country *
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Country</option>
                  <option value="IN">India</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Language *
                </label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Language</option>
                  <option value="ENGLISH">English</option>
                  <option value="HINDI">Hindi</option>
                </select>
              </div>

              {/* Total Target */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Total Target *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quotaAudience.totalTarget ?? ""}
                  onChange={(e) =>
                    setTotalTarget(parseFloat(e.target.value) || 0)
                  }
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Incidence Rate */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Incidence Rate * (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={incidenceRate}
                  onChange={(e) =>
                    setIncidenceRate(
                      Math.max(
                        0,
                        Math.min(100, parseInt(e.target.value) || 80),
                      ),
                    )
                  }
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Length of Survey (read-only) */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Length of Survey
                </label>
                <input
                  type="number"
                  value={lengthOfSurvey}
                  className="w-full p-3 border rounded-lg bg-gray-100 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto: {questionCount} questions
                </p>
              </div>

              {/* Live Days */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Live Days *
                </label>
                <input
                  type="number"
                  min="1"
                  value={numberOfDays}
                  onChange={(e) =>
                    setNumberOfDays(parseInt(e.target.value) || 7)
                  }
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/*  Check Estimate - DISABLED until 7 fields filled */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleCheckEstimate}
                disabled={
                  !isAllFieldsFilled ||
                  isEstimating ||
                  !!validationError ||
                  !hasEstimateInputsChanged
                }
                className="px-12 py-4 text-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEstimating ? "Estimating..." : "Check Estimate"}
              </Button>
            </div>

            {/* Estimate Display + Add Questions btn */}
            {flowStep === "estimate" && estimateCost !== null && (
              <div className="text-center p-12 bg-gradient-to-r from-green-50 to-emerald-50 border-4 border-emerald-200 rounded-2xl">
                <div className="text-4xl font-black text-emerald-800 mb-4">
                  $${estimateCost.toLocaleString()}
                </div>
                <p className="text-xl text-gray-700 mb-8">Estimated Cost</p>
                <Button
                  size="lg"
                  onClick={handleAddQuotaQuestions}
                  disabled={!!validationError}
                  className="px-12 py-4 text-lg"
                >
                  Add Quota Questions →
                </Button>
              </div>
            )}

            {/* Questions EXACTLY after Add btn, BEFORE Save btn */}
            {flowStep === "questions" && (
              <div className="border-2 border-gray-200 rounded-2xl p-8 bg-white shadow-xl">
                {/* Loading/Questions UI - ONLY shows in this step */}

                {/* Loading during fetch */}
                {questionsQuery.isFetching && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-lg">
                      Loading screening questions for {vendorId || "selected"}
                      ...
                    </div>
                  </div>
                )}

                {/* Questions grid - CORRECT position, full height */}
                {!questionsQuery.isFetching && questionsQuery.data && (
                  <div className="mt-4 grid grid-cols-12 gap-4">
                    {/* Left */}
                    <div className="col-span-4 rounded border">
                      <div className="border-b px-3 py-2 text-sm font-medium">
                        {isVendorFlow ? "Vendor categories" : "Questions"}
                      </div>
                      {grouped.length === 0 ? (
                        <div className="px-3 py-3 text-sm">
                          No questions found.
                        </div>
                      ) : (
                        <ul className="max-h-[600px] overflow-auto">
                          {grouped.map((g) => (
                            <li key={g.categoryId}>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveCategoryId(g.categoryId)
                                }
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                  g.categoryId === activeCategoryId
                                    ? "bg-gray-100"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <span className="truncate">
                                  {g.categoryName}
                                </span>
                                <span className="ml-2 rounded bg-gray-200 px-2 py-[2px] text-xs">
                                  {g.questions.length}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Right */}
                    <div className="col-span-8 rounded border">
                      <div className="border-b px-3 py-2 text-sm font-medium">
                        {activeGroup ? activeGroup.categoryName : "Questions"}
                      </div>
                      {!activeGroup ? (
                        <div className="px-3 py-3 text-sm text-gray-600">
                          Select a group.
                        </div>
                      ) : (
                        <div className="max-h-[600px] overflow-auto p-3">
                          <div className="space-y-3">
                            {activeGroup.questions.map((q) => {
                              const selected = Boolean(
                                getScreeningEntry(quotaAudience, q.id),
                              );
                              const screeningEntry = getScreeningEntry(
                                quotaAudience,
                                q.id,
                              );

                              return (
                                <div
                                  key={q.id}
                                  // Add visual indicator for selected questions
                                  className={`rounded border p-3 transition-all ${
                                    selected
                                      ? "border-violet-500 bg-violet-50 shadow-sm"
                                      : "border-gray-200 bg-white hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-sm font-medium">
                                        {q.question_text}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {q.question_key} • {q.question_type}
                                        {q.options?.length
                                          ? ` • ${q.options.length} options`
                                          : ""}
                                      </div>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={(e) =>
                                          toggleScreeningQuestion(
                                            q,
                                            e.target.checked,
                                          )
                                        }
                                        // Style checkbox for selected state
                                        className="cursor-pointer"
                                      />
                                      <span
                                        className={
                                          selected
                                            ? "text-violet-700 font-medium"
                                            : ""
                                        }
                                      >
                                        Use in screening
                                      </span>
                                    </label>
                                  </div>

                                  {selected && q.options?.length ? (
                                    <div className="mt-3 space-y-2">
                                      <div className="text-xs text-gray-600">
                                        Per-option targets must sum to total
                                        target ({quotaAudience.totalTarget ?? 0}
                                        ).
                                      </div>
                                      {q.options.map((opt) => {
                                        const t =
                                          screeningEntry?.optionTargets?.find(
                                            (x) => x.optionId === opt.id,
                                          )?.target ?? 0;
                                        return (
                                          <div
                                            key={opt.id}
                                            className="flex items-center justify-between gap-3"
                                          >
                                            <div className="text-sm">
                                              {normalizeOptionLabel(opt)}
                                            </div>
                                            <input
                                              type="number"
                                              min={0}
                                              value={t}
                                              onChange={(e) =>
                                                setOptionTarget(
                                                  q.id,
                                                  opt.id,
                                                  parseFloat(e.target.value) ||
                                                    0,
                                                )
                                              }
                                              className="w-28 rounded border px-2 py-1"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : null}

                                  {/* NEW: Open-ended bucket UI */}
                                  {selected && !q.options?.length ? (
                                    <div className="mt-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-600">
                                          Bucket targets must sum to total
                                          target{" "}
                                          {quotaAudience.totalTarget ?? 0}.
                                        </div>
                                        <button
                                          type="button"
                                          className="rounded border px-2 py-1 text-xs"
                                          onClick={() => addBucket(q.id)}
                                        >
                                          + Add bucket
                                        </button>
                                      </div>

                                      {(screeningEntry?.buckets ?? []).map(
                                        (b, idx) => (
                                          <div
                                            key={idx}
                                            className="rounded border p-2 space-y-2"
                                          >
                                            <div className="grid grid-cols-12 gap-2 items-center">
                                              <input
                                                className="col-span-4 rounded border px-2 py-1 text-sm"
                                                placeholder="Label (e.g. 18-24)"
                                                value={b.label ?? ""}
                                                onChange={(e) =>
                                                  updateBucket(q.id, idx, {
                                                    label: e.target.value,
                                                  })
                                                }
                                              />

                                              <select
                                                className="col-span-3 rounded border px-2 py-1 text-sm"
                                                value={b.operator}
                                                onChange={(e) => {
                                                  const op = e.target
                                                    .value as any;
                                                  // reset value shape when operator changes
                                                  const nextValue =
                                                    op === "BETWEEN"
                                                      ? { min: 18, max: 24 }
                                                      : op === "IN" ||
                                                          op === "INTERSECTS"
                                                        ? []
                                                        : "";
                                                  updateBucket(q.id, idx, {
                                                    operator: op,
                                                    value: nextValue,
                                                  });
                                                }}
                                              >
                                                {/* simple defaults; you can restrict based on q.data_type */}
                                                <option value="BETWEEN">
                                                  BETWEEN
                                                </option>
                                                <option value="IN">IN</option>
                                                <option value="EQ">EQ</option>
                                                <option value="GTE">GTE</option>
                                                <option value="LTE">LTE</option>
                                                <option value="INTERSECTS">
                                                  INTERSECTS
                                                </option>
                                              </select>

                                              <input
                                                type="number"
                                                className="col-span-3 rounded border px-2 py-1 text-sm"
                                                value={b.target ?? 0}
                                                onChange={(e) =>
                                                  updateBucket(q.id, idx, {
                                                    target: Math.max(
                                                      0,
                                                      Math.trunc(
                                                        Number(
                                                          e.target.value || 0,
                                                        ),
                                                      ),
                                                    ),
                                                  })
                                                }
                                              />

                                              <button
                                                type="button"
                                                className="col-span-2 rounded border px-2 py-1 text-xs"
                                                onClick={() =>
                                                  removeBucket(q.id, idx)
                                                }
                                              >
                                                Remove
                                              </button>
                                            </div>

                                            {b.operator === "BETWEEN" ? (
                                              <div className="grid grid-cols-12 gap-2">
                                                <input
                                                  type="number"
                                                  className="col-span-6 rounded border px-2 py-1 text-sm"
                                                  placeholder="Min"
                                                  value={b.value?.min ?? ""}
                                                  onChange={(e) =>
                                                    updateBucket(q.id, idx, {
                                                      value: {
                                                        ...b.value,
                                                        min: Number(
                                                          e.target.value,
                                                        ),
                                                      },
                                                    })
                                                  }
                                                />
                                                <input
                                                  type="number"
                                                  className="col-span-6 rounded border px-2 py-1 text-sm"
                                                  placeholder="Max"
                                                  value={b.value?.max ?? ""}
                                                  onChange={(e) =>
                                                    updateBucket(q.id, idx, {
                                                      value: {
                                                        ...b.value,
                                                        max: Number(
                                                          e.target.value,
                                                        ),
                                                      },
                                                    })
                                                  }
                                                />
                                              </div>
                                            ) : null}

                                            {b.operator === "IN" ||
                                            b.operator === "INTERSECTS" ? (
                                              <div className="space-y-2">
                                                <div className="text-xs text-gray-600">
                                                  Zipcodes (add multiple):
                                                </div>
                                                <div className="space-y-1">
                                                  {Array.isArray(b.value) ? (
                                                    b.value.map(
                                                      (zip, zipIdx) => (
                                                        <div
                                                          key={zipIdx}
                                                          className="flex items-center gap-2"
                                                        >
                                                          <input
                                                            type="number"
                                                            className="flex-1 rounded border px-2 py-1 text-sm"
                                                            placeholder={`Zipcode ${
                                                              zipIdx + 1
                                                            }`}
                                                            value={zip}
                                                            onChange={(e) => {
                                                              const newZips = [
                                                                ...(b.value ||
                                                                  []),
                                                              ];
                                                              newZips[zipIdx] =
                                                                e.target.value;
                                                              updateBucket(
                                                                q.id,
                                                                idx,
                                                                {
                                                                  value:
                                                                    newZips,
                                                                },
                                                              );
                                                            }}
                                                          />
                                                          {b.value.length >
                                                            1 && (
                                                            <button
                                                              type="button"
                                                              className="h-8 w-8 rounded border text-xs text-red-600 hover:bg-red-50"
                                                              onClick={() => {
                                                                const newZips =
                                                                  (
                                                                    b.value ||
                                                                    []
                                                                  ).filter(
                                                                    (
                                                                      _: any,
                                                                      i: number,
                                                                    ) =>
                                                                      i !==
                                                                      zipIdx,
                                                                  );
                                                                updateBucket(
                                                                  q.id,
                                                                  idx,
                                                                  {
                                                                    value:
                                                                      newZips,
                                                                  },
                                                                );
                                                              }}
                                                            >
                                                              ×
                                                            </button>
                                                          )}
                                                        </div>
                                                      ),
                                                    )
                                                  ) : (
                                                    <input
                                                      type="number"
                                                      className="w-full rounded border px-2 py-1 text-sm"
                                                      placeholder="Enter first zipcode"
                                                      defaultValue={String(
                                                        b.value || "",
                                                      )}
                                                      onChange={(e) =>
                                                        updateBucket(
                                                          q.id,
                                                          idx,
                                                          {
                                                            value: [
                                                              e.target.value,
                                                            ],
                                                          },
                                                        )
                                                      }
                                                    />
                                                  )}
                                                  <button
                                                    type="button"
                                                    className="w-full rounded border border-dashed px-2 py-1 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-800"
                                                    onClick={() => {
                                                      const newZips = [
                                                        ...(b.value || []),
                                                        "",
                                                      ];
                                                      updateBucket(q.id, idx, {
                                                        value: newZips,
                                                      });
                                                    }}
                                                  >
                                                    + Add another zipcode
                                                  </button>
                                                </div>
                                              </div>
                                            ) : null}

                                            {b.operator === "EQ" ||
                                            b.operator === "GTE" ||
                                            b.operator === "LTE" ? (
                                              <input
                                                className="w-full rounded border px-2 py-1 text-sm"
                                                placeholder="Value"
                                                value={
                                                  typeof b.value === "string" ||
                                                  typeof b.value === "number"
                                                    ? String(b.value)
                                                    : ""
                                                }
                                                onChange={(e) =>
                                                  updateBucket(q.id, idx, {
                                                    value: e.target.value,
                                                  })
                                                }
                                              />
                                            ) : null}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {questionsQuery.isError && (
                  <div className="text-center py-12 text-red-600">
                    Failed to load questions.{" "}
                    <button onClick={() => questionsQuery.refetch()}>
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Save btn ALWAYS at bottom of questions section */}
            {flowStep === "questions" && (
              <div className="flex justify-center pt-8 pb-12 border-t">
                <Button
                  size="lg"
                  onClick={handleSaveQuota}
                  disabled={
                    isAddingQuota ||
                    !quotaAudience.screening?.length ||
                    questionsQuery.isFetching ||
                    !!validationError
                  }
                  className="px-20 py-6 text-xl font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-2xl min-w-[200px]"
                >
                  {isAddingQuota ? "Saving Quota..." : "Save Quota"}
                </Button>
              </div>
            )}

            {/* Final Exact Price display */}
            {flowStep === "priced" && exactPrice !== null && (
              <div className="text-center p-12 bg-gradient-to-r from-purple-50 to-violet-50 border-4 border-violet-200 rounded-2xl">
                <div className="text-4xl font-black text-violet-800 mb-4">
                  $${exactPrice.toLocaleString()}
                </div>
                <p className="text-xl text-gray-700 mb-8">
                  Exact Price - Quota Saved!
                </p>
                <p className="text-sm text-violet-600">
                  Preview & Publish button now enabled ✓
                </p>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        {!quotaAudience.enabled ? (
          <div className="mt-3 text-sm text-gray-600">
            Turn on quota to configure screening.
          </div>
        ) : (
          questionsQuery.isError && (
            <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Failed to load screening questions.
            </div>
          )
        )}
      </div>
    </div>
  );
}
