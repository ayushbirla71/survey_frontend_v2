"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Star,
  Shield,
  Lock,
  FileText,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  surveyApi,
  questionApi,
  categoriesApi,
  responseApi,
  shareApi,
  quotaApi,
  QuotaConfig,
  ScreeningQuestion,
  QuotaCheckRequest,
} from "@/lib/api";

// Animated Start Button Component
interface AnimatedStartButtonProps {
  onComplete: () => void;
  isReady: boolean;
  fillDuration?: number; // in milliseconds
}

function AnimatedStartButton({
  onComplete,
  isReady,
  fillDuration = 1300,
}: AnimatedStartButtonProps) {
  const [fillProgress, setFillProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min((elapsed / fillDuration) * 100, 100);

      setFillProgress(progress);

      if (progress < 100) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fillDuration]);

  const isEnabled = !isAnimating && isReady;

  return (
    <button
      onClick={() => isEnabled && onComplete()}
      disabled={!isEnabled}
      className={`
        relative overflow-hidden px-12 py-4 rounded-full text-lg font-semibold
        transition-all duration-300 min-w-[200px]
        ${
          isEnabled
            ? "bg-violet-600 text-white cursor-pointer hover:bg-violet-700 shadow-lg hover:shadow-xl transform hover:scale-105"
            : "bg-slate-200 text-slate-500 cursor-not-allowed"
        }
      `}
    >
      {/* Fill animation background */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-violet-500 to-violet-600 transition-transform duration-100 ease-linear"
        style={{
          transform: `translateX(${fillProgress - 100}%)`,
          opacity: isAnimating ? 1 : 0,
        }}
      />

      {/* Button text */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isAnimating ? (
          <>
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading...
          </>
        ) : isReady ? (
          <>
            Start Survey
            <ArrowRight className="h-5 w-5" />
          </>
        ) : (
          <>
            <RefreshCw className="h-5 w-5 animate-spin" />
            Please wait...
          </>
        )}
      </span>
    </button>
  );
}

// Terms and Conditions Component
function TermsAndConditions() {
  return (
    <div className="space-y-6 text-slate-600 text-sm max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-violet-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">
            Privacy & Confidentiality
          </h3>
          <p>
            Your responses will be kept strictly confidential. Personal
            information will not be shared with third parties without your
            consent.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Lock className="h-5 w-5 text-violet-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Data Security</h3>
          <p>
            All data collected is encrypted and stored securely. We implement
            industry-standard security measures to protect your information.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 text-violet-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">
            Voluntary Participation
          </h3>
          <p>
            Your participation in this survey is completely voluntary. You may
            skip any questions you prefer not to answer or exit the survey at
            any time.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-violet-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Data Usage</h3>
          <p>
            Your responses will be used solely for research and improvement
            purposes. Aggregated, anonymized data may be used in reports.
          </p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500">
          By clicking "Start Survey", you acknowledge that you have read and
          understood these terms and consent to participate in this survey under
          the conditions described above.
        </p>
      </div>
    </div>
  );
}
import {
  DEFAULT_AGE_GROUPS,
  DEFAULT_GENDERS,
  GENDER_LABELS,
} from "@/components/quota-audience-selector";

// Helper function to regenerate screening questions with ALL options
// ALWAYS shows all available options regardless of which ones have quotas set
// Backend will check if selected option qualifies
const regenerateScreeningQuestionsWithAllOptions = (
  quotaConfig: QuotaConfig
): ScreeningQuestion[] => {
  const questions: ScreeningQuestion[] = [];
  const savedQuestions = quotaConfig.screening_questions || [];

  // Check if there are any active age quotas
  const hasActiveAgeQuotas = (quotaConfig.age_quotas || []).some(
    (q) =>
      (q.target_count && q.target_count > 0) ||
      (q.target_percentage && q.target_percentage > 0)
  );

  if (hasActiveAgeQuotas) {
    // Get custom question text if saved, otherwise use default
    const savedAgeQuestion = savedQuestions.find((sq) => sq.type === "age");
    // ALWAYS use DEFAULT_AGE_GROUPS to show ALL age options
    // This ensures proper screening - user can select any age group
    // Backend will check if their selection qualifies
    questions.push({
      id: "screening_age",
      type: "age",
      question_text:
        savedAgeQuestion?.question_text || "What is your age group?",
      options: DEFAULT_AGE_GROUPS.map((q, idx) => ({
        id: `age_option_${idx}`,
        label: q.max_age >= 100 ? `${q.min_age}+` : `${q.min_age}-${q.max_age}`,
        value: `${q.min_age}-${q.max_age}`,
      })),
      required: true,
    });
  }

  // Check if there are any active gender quotas
  const hasActiveGenderQuotas = (quotaConfig.gender_quotas || []).some(
    (q) =>
      (q.target_count && q.target_count > 0) ||
      (q.target_percentage && q.target_percentage > 0)
  );

  if (hasActiveGenderQuotas) {
    const savedGenderQuestion = savedQuestions.find(
      (sq) => sq.type === "gender"
    );
    // ALWAYS use DEFAULT_GENDERS to show ALL gender options
    // This ensures proper screening - user can select any gender
    // Backend will check if their selection qualifies
    questions.push({
      id: "screening_gender",
      type: "gender",
      question_text:
        savedGenderQuestion?.question_text || "What is your gender?",
      options: DEFAULT_GENDERS.map((q, idx) => ({
        id: `gender_option_${idx}`,
        label: GENDER_LABELS[q.gender] || q.gender,
        value: q.gender,
      })),
      required: true,
    });
  }

  // Check if there are any active location quotas
  const hasActiveLocationQuotas = (quotaConfig.location_quotas || []).some(
    (q) =>
      (q.target_count && q.target_count > 0) ||
      (q.target_percentage && q.target_percentage > 0)
  );

  if (hasActiveLocationQuotas && quotaConfig.location_quotas) {
    const savedLocationQuestion = savedQuestions.find(
      (sq) => sq.type === "location"
    );
    questions.push({
      id: "screening_location",
      type: "location",
      question_text:
        savedLocationQuestion?.question_text || "Where are you located?",
      options: quotaConfig.location_quotas.map((q, idx) => ({
        id: `location_option_${idx}`,
        label:
          [q.city, q.state, q.country].filter(Boolean).join(", ") || "Unknown",
        value: JSON.stringify({
          country: q.country,
          state: q.state,
          city: q.city,
        }),
      })),
      required: true,
    });
  }

  // Check if there are any category quotas
  const activeCategoryQuotas = (quotaConfig.category_quotas || []).filter(
    (q) => q.surveyCategoryId
  );

  if (activeCategoryQuotas.length > 0) {
    const savedCategoryQuestion = savedQuestions.find(
      (sq) => sq.type === "category"
    );
    questions.push({
      id: "screening_category",
      type: "category",
      question_text:
        savedCategoryQuestion?.question_text ||
        "Which industry do you work in?",
      options: activeCategoryQuotas.map((q, idx) => ({
        id: `category_option_${idx}`,
        label: q.categoryName || q.surveyCategoryId,
        value: q.surveyCategoryId,
      })),
      required: true,
    });
  }

  return questions;
};

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any[];
  required: boolean;
  order_index: number;
  categoryId?: string;
  rows?: any[];
  columns?: any[];
  rowOptions?: any[];
  columnOptions?: any[];
  allowMultipleInGrid?: boolean;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  settings?: {
    showProgressBar?: boolean;
    shuffleQuestions?: boolean;
    isAnonymous?: boolean;
  };
}

type GKind =
  | "short answer"
  | "paragraph"
  | "multiple choice"
  | "checkboxes"
  | "dropdown"
  | "linear scale"
  | "rating"
  | "multi-choice grid"
  | "checkbox grid"
  | "date"
  | "time"
  | "number"
  | "nps";

type KindsMap = Record<string, GKind>;

// Grid Question Components
interface GridQuestionProps {
  question: any;
  rows: { id: string; text: string }[];
  cols: { id: string; text: string }[];
  answer: any;
  handleAnswerChange: (questionId: string, value: any) => void;
}

function MultiChoiceGridQuestion({
  question,
  rows,
  cols,
  answer,
  handleAnswerChange,
}: GridQuestionProps) {
  const gridAnswer = (answer as Record<string, string>) || {};
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const totalRows = rows.length;

  // Safety check: ensure rows exist and currentRowIndex is valid
  if (!rows || rows.length === 0) {
    return (
      <div className="w-full p-4 text-slate-600">
        No rows available for this grid question.
      </div>
    );
  }

  // Ensure currentRowIndex is within bounds
  const safeRowIndex = Math.min(currentRowIndex, totalRows - 1);
  const currentRow = rows[safeRowIndex];

  const handleNext = () => {
    // Check if current row is answered (required validation)
    if (question.required && !gridAnswer[currentRow.id]) {
      toast.error("Please select an option for this row before proceeding");
      return;
    }

    if (safeRowIndex < totalRows - 1) {
      setCurrentRowIndex(safeRowIndex + 1);
    }
  };

  const handlePrev = () => {
    if (safeRowIndex > 0) {
      setCurrentRowIndex(safeRowIndex - 1);
    }
  };

  return (
    <div className="w-full">
      {/* Row counter */}
      <div className="text-sm text-slate-600 mb-4">
        {safeRowIndex + 1}/{totalRows}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={safeRowIndex === 0}
          className="flex items-center gap-2"
        >
          <span>← Prev</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleNext}
          disabled={safeRowIndex === totalRows - 1}
          className="flex items-center gap-2"
        >
          <span>Next →</span>
        </Button>
      </div>

      {/* Current row question */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-slate-800 mb-4">
          {currentRow.text}
        </h3>

        {/* Column options as buttons */}
        <RadioGroup
          value={gridAnswer[currentRow.id] ?? ""}
          onValueChange={(selectedValue) => {
            const newGridAnswer = {
              ...gridAnswer,
              [currentRow.id]: selectedValue,
            };
            handleAnswerChange(question.id, newGridAnswer);

            // Automatically move to next row after selection
            setTimeout(() => {
              if (safeRowIndex < totalRows - 1) {
                setCurrentRowIndex(safeRowIndex + 1);
              }
            }, 300); // Small delay for better UX (user sees selection highlight)
          }}
          className="flex flex-col gap-3"
        >
          {cols.map((c: { id: string; text: string }) => {
            const cellId = `${question.id}-grid-mc-${currentRow.id}-${c.id}`;
            const isSelected = gridAnswer[currentRow.id] === c.id;

            return (
              <label
                key={c.id}
                htmlFor={cellId}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-yellow-400 bg-yellow-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <RadioGroupItem id={cellId} value={c.id} />
                <span className="text-sm font-medium text-slate-700">
                  {c.text}
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </div>
    </div>
  );
}

function CheckboxGridQuestion({
  question,
  rows,
  cols,
  answer,
  handleAnswerChange,
}: GridQuestionProps) {
  const gridAnswer = (answer as Record<string, string[]>) || {};
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const totalRows = rows.length;

  // Safety check: ensure rows exist and currentRowIndex is valid
  if (!rows || rows.length === 0) {
    return (
      <div className="w-full p-4 text-slate-600">
        No rows available for this grid question.
      </div>
    );
  }

  // Ensure currentRowIndex is within bounds
  const safeRowIndex = Math.min(currentRowIndex, totalRows - 1);
  const currentRow = rows[safeRowIndex];

  const handleNext = () => {
    // Check if current row is answered (required validation)
    if (question.required) {
      const rowAnswers = gridAnswer[currentRow.id] || [];
      if (rowAnswers.length === 0) {
        toast.error(
          "Please select at least one option for this row before proceeding"
        );
        return;
      }
    }

    if (safeRowIndex < totalRows - 1) {
      setCurrentRowIndex(safeRowIndex + 1);
    }
  };

  const handlePrev = () => {
    if (safeRowIndex > 0) {
      setCurrentRowIndex(safeRowIndex - 1);
    }
  };

  return (
    <div className="w-full">
      {/* Row counter */}
      <div className="text-sm text-slate-600 mb-4">
        {safeRowIndex + 1}/{totalRows}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={safeRowIndex === 0}
          className="flex items-center gap-2"
        >
          <span>← Prev</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleNext}
          disabled={safeRowIndex === totalRows - 1}
          className="flex items-center gap-2"
        >
          <span>Next →</span>
        </Button>
      </div>

      {/* Current row question */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-slate-800 mb-4">
          {currentRow.text}
        </h3>

        {/* Column options as checkboxes */}
        <div className="flex flex-col gap-3">
          {cols.map((c: { id: string; text: string }) => {
            const cellId = `${question.id}-grid-cb-${currentRow.id}-${c.id}`;
            const rowAnswers = gridAnswer[currentRow.id] || [];
            const isChecked = rowAnswers.includes(c.id);

            return (
              <label
                key={c.id}
                htmlFor={cellId}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isChecked
                    ? "border-yellow-400 bg-yellow-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <Checkbox
                  id={cellId}
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    const newRowAnswers = checked
                      ? [...rowAnswers, c.id]
                      : rowAnswers.filter((id: string) => id !== c.id);
                    const newGridAnswer = {
                      ...gridAnswer,
                      [currentRow.id]: newRowAnswers,
                    };
                    handleAnswerChange(question.id, newGridAnswer);
                  }}
                />
                <span className="text-sm font-medium text-slate-700">
                  {c.text}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper functions for question type normalization (from survey-preview.tsx)
function normKindStr(s?: string): GKind | null {
  if (!s) return null;
  const k = s.toLowerCase().replace(/[\s_-]+/g, "");
  if (k === "shortanswer") return "short answer";
  if (k === "paragraph") return "paragraph";
  if (k === "multiplechoice" || k === "mcq") return "multiple choice";
  if (k === "checkboxes" || k === "checkbox") return "checkboxes";
  if (k === "dropdown" || k === "select") return "dropdown";
  if (k === "linearscale" || k === "scale" || k === "likert")
    return "linear scale";
  if (k === "rating" || k === "stars") return "rating";
  if (k === "multichoicegrid" || k === "mcqgrid" || k === "gridradio")
    return "multi-choice grid";
  if (k === "checkboxgrid" || k === "gridcheckbox") return "checkbox grid";
  if (k === "date") return "date";
  if (k === "time") return "time";
  if (k === "number") return "number";
  if (k === "nps" || k === "netpromoterscore") return "nps";
  return null;
}

function inferFromOptions(q: Question): GKind | null {
  const opts = q.options ?? [];

  // NEW: Grid defined via question-level rowOptions/columnOptions (preferred)
  if (
    Array.isArray(q.rowOptions) &&
    Array.isArray(q.columnOptions) &&
    q.rowOptions.length > 0 &&
    q.columnOptions.length > 0
  ) {
    return q.allowMultipleInGrid ? "checkbox grid" : "multi-choice grid";
  }

  // LEGACY: Grid defined via options[0].rowOptions/columnOptions
  const first = opts[0];
  if (
    first &&
    Array.isArray(first.rowOptions) &&
    Array.isArray(first.columnOptions)
  ) {
    return q.allowMultipleInGrid ? "checkbox grid" : "multi-choice grid";
  }

  // Grid if options carry row/column pair references
  const hasGridPairs = opts.some(
    (o) => o.rowQuestionOptionId || o.columnQuestionOptionId
  );
  if (hasGridPairs) {
    return q.allowMultipleInGrid ? "checkbox grid" : "multi-choice grid";
  }

  // Linear scale via a single option range
  if (opts.length === 1 && first?.rangeFrom != null && first?.rangeTo != null) {
    return first?.icon?.toLowerCase() === "star" ? "rating" : "linear scale";
  }

  // Textual options => multiple choice by default
  if (opts.some((o) => (o.text ?? "").trim().length > 0)) {
    return "multiple choice";
  }

  // Map some legacy question_type values if present
  const t = (q.question_type ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (t === "text") return "short answer";
  if (t === "longtext") return "paragraph";
  if (t === "dropdown") return "dropdown";

  return null;
}

export default function PublicSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.id as string;

  // Start page state - show terms and conditions first
  const [showStartPage, setShowStartPage] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  const [notFoundHeader, setNotFoundHeader] = useState("Survey Not Found");
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(false); // Changed to false - loading happens during button animation
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [kindsMap, setKindsMap] = useState<KindsMap>({});

  // Ref to track if data loading has started
  const dataLoadingStartedRef = useRef(false);

  // Screening questions state
  const [quotaConfig, setQuotaConfig] = useState<QuotaConfig | null>(null);
  const [screeningQuestions, setScreeningQuestions] = useState<
    ScreeningQuestion[]
  >([]);
  const [screeningAnswers, setScreeningAnswers] = useState<
    Record<string, string>
  >({});
  const [currentScreeningIndex, setCurrentScreeningIndex] = useState(0);
  const [screeningPhase, setScreeningPhase] = useState(true); // Start with screening
  const [isQualified, setIsQualified] = useState<boolean | null>(null);
  const [checkingQualification, setCheckingQualification] = useState(false);
  const [surveyIdForQuota, setSurveyIdForQuota] = useState<string | null>(null);
  const [respondentId, setRespondentId] = useState<string | null>(null);

  // Extract category IDs from questions
  const categoryIds = useMemo(() => {
    if (!survey) return [];
    const set = new Set<string>();
    survey.questions.forEach((q) => {
      if (q.categoryId) set.add(q.categoryId);
    });
    return Array.from(set);
  }, [survey]);

  // Fetch category kinds when survey is loaded
  useEffect(() => {
    if (categoryIds.length === 0) return;

    const fetchKinds = async () => {
      try {
        const json = await categoriesApi.getQuestionCategories();
        console.log("JSON is", json);

        const arr = Array.isArray(json?.data) ? json.data : [];
        const result = arr.reduce((acc: KindsMap, item: any) => {
          const nk = normKindStr(item?.type_name ?? "") ?? "short answer";
          acc[item.id] = nk;
          return acc;
        }, {});
        console.log("Result is", result);
        setKindsMap(result);
      } catch (e) {
        console.warn("Failed to load category kinds:", e);
      }
    };

    fetchKinds();
  }, [categoryIds.join(",")]);

  // Load all data when start page mounts (during button animation)
  useEffect(() => {
    if (dataLoadingStartedRef.current) return;
    dataLoadingStartedRef.current = true;

    const loadAllData = async () => {
      try {
        // Step 1: Validate token
        const result = await shareApi.validateShareToken(token);
        console.log("Validation result is", result);

        if (!result.data) {
          throw new Error(result.error || "Failed to validate token");
        }

        const surveyId = result.data.surveyId;
        setSurveyIdForQuota(surveyId);

        // Step 2: Load survey and questions in parallel
        const [surveyData, questionsResponse] = await Promise.all([
          surveyApi.getSurvey(surveyId),
          questionApi.getQuestions(surveyId),
        ]);

        console.log("Questions response:", questionsResponse);

        // Fetch quota config for screening questions
        try {
          const quotaResponse = await quotaApi.getQuota(surveyId);
          if (quotaResponse.data) {
            setQuotaConfig(quotaResponse.data);
            // Regenerate screening questions with ALL options (not just qualifying ones)
            // This ensures proper screening - users who select non-qualifying options will be filtered out
            const regeneratedQuestions =
              regenerateScreeningQuestionsWithAllOptions(quotaResponse.data);
            if (regeneratedQuestions.length > 0) {
              setScreeningQuestions(regeneratedQuestions);
              setScreeningPhase(true);
            } else {
              // No screening questions needed, skip to main survey
              setScreeningPhase(false);
              setIsQualified(true);
            }
          } else {
            // No quota config, skip screening
            setScreeningPhase(false);
            setIsQualified(true);
          }
        } catch (quotaErr) {
          console.log("No quota config found, skipping screening:", quotaErr);
          setScreeningPhase(false);
          setIsQualified(true);
        }

        if (
          questionsResponse.data &&
          typeof questionsResponse.data === "object"
        ) {
          // Convert the keyed object into an array
          const questionsArray = Object.values(questionsResponse.data);
          console.log("Converted Questions Array:", questionsArray);

          // Sort the questions
          const sortedQuestions = questionsArray.sort(
            (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
          );
          console.log("Sorted questions:", sortedQuestions);

          setSurvey({
            id: surveyData.survey.id,
            title: surveyData.survey.title,
            description: surveyData.survey.description,
            questions: sortedQuestions,
            settings: surveyData.survey.settings || {},
          });

          // Mark data as ready
          setDataReady(true);
        } else {
          throw new Error("No questions found for this survey");
        }
      } catch (e: any) {
        console.error("Failed to load survey data:", e);
        if (e.message?.includes("Token already used.")) {
          setAlreadySubmitted(true);
        } else {
          setNotFoundHeader("Invalid survey link");
          setDataLoadError(e.message || "Failed to load survey");
          setError(e.message || "Failed to load survey");
        }
      }
    };

    loadAllData();
  }, [token]);

  // Handle start button click
  const handleStartSurvey = useCallback(() => {
    if (dataReady && survey) {
      setShowStartPage(false);
    }
  }, [dataReady, survey]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Handle screening question answer change
  const handleScreeningAnswerChange = (questionId: string, value: string) => {
    setScreeningAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Check if user qualifies based on screening answers
  const checkQualification = async () => {
    if (!surveyIdForQuota) return;

    setCheckingQualification(true);
    try {
      // Build the quota check request from screening answers
      const checkRequest: QuotaCheckRequest = {};

      // Map screening answers to quota check fields
      screeningQuestions.forEach((sq) => {
        const answer = screeningAnswers[sq.id];
        if (!answer) return;

        if (sq.type === "age") {
          // Parse age range from answer (e.g., "18-24")
          const [min, max] = answer.split("-").map(Number);
          checkRequest.age = Math.floor((min + max) / 2); // Use midpoint
        } else if (sq.type === "gender") {
          // Map gender string to enum value
          const genderMap: Record<
            string,
            "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY"
          > = {
            male: "MALE",
            female: "FEMALE",
            other: "OTHER",
            prefer_not_to_say: "PREFER_NOT_TO_SAY",
          };
          checkRequest.gender = genderMap[answer.toLowerCase()] || "OTHER";
        } else if (sq.type === "location") {
          // Parse location - could be country, state, or city
          checkRequest.location = { country: answer };
        } else if (sq.type === "category") {
          checkRequest.surveyCategoryId = answer;
        }
      });

      checkRequest.vendor_respondent_id = token;

      const result = await quotaApi.checkQuota(surveyIdForQuota, checkRequest);
      console.log(">>>>> the value of the CHECK QUOTA RESULT is : ", result);
      if (result.data?.qualified) {
        setRespondentId(result.data?.respondent_id ?? null);
        setIsQualified(true);
        setScreeningPhase(false);
        toast.success("You qualify for this survey!");
      } else {
        // Redirect to terminated URL if available, otherwise use internal terminated page
        if (result.data?.status == "QUOTA_FULL") {
          router.push("/survey/terminated?reason=quota_full");
          return;
        }
        if (quotaConfig?.terminated_url) {
          window.location.href = quotaConfig.terminated_url;
        } else {
          router.push("/survey/terminated?reason=not_qualified");
        }
        setIsQualified(false);
      }
    } catch (err: any) {
      console.error("Error checking qualification:", err);
      // On error, allow user to proceed (fail open)
      setIsQualified(true);
      setScreeningPhase(false);
    } finally {
      setCheckingQualification(false);
    }
  };

  // Navigate screening questions
  const nextScreeningQuestion = () => {
    if (currentScreeningIndex < screeningQuestions.length - 1) {
      setCurrentScreeningIndex((prev) => prev + 1);
    } else {
      // All screening questions answered, check qualification
      checkQualification();
    }
  };

  const prevScreeningQuestion = () => {
    if (currentScreeningIndex > 0) {
      setCurrentScreeningIndex((prev) => prev - 1);
    }
  };

  // Check if current screening question is answered
  const isCurrentScreeningAnswered = () => {
    if (screeningQuestions.length === 0) return false;
    const currentQuestion = screeningQuestions[currentScreeningIndex];
    return !!screeningAnswers[currentQuestion?.id];
  };

  // Normalize question kind based on category or infer from options
  const normalizeKind = (q: Question): GKind => {
    const byCat = q.categoryId ? kindsMap[q.categoryId] : undefined;
    if (byCat) return byCat;

    const inferred = inferFromOptions(q);
    if (inferred) return inferred;

    return "short answer";
  };

  // ✅ NEW: central helper to decide if a question is answered
  const isQuestionAnswered = (question: Question): boolean => {
    const value = answers[question.id];

    if (value === null || value === undefined) return false;

    // String answers (short, paragraph, date, time, dropdown, scale, rating)
    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    // Arrays (checkboxes, some multi-selects)
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    // Objects (grids: row -> selected cols OR row -> single col)
    if (typeof value === "object") {
      const kind = normalizeKind(question);

      // For grid questions, check if ALL rows are answered (if required)
      if (kind === "multi-choice grid" || kind === "checkbox grid") {
        // Get the rows for this grid question
        let rows: { id: string; text: string }[] = [];

        // NEW: Check question-level rowOptions first
        if (
          Array.isArray(question.rowOptions) &&
          question.rowOptions.length > 0
        ) {
          rows = question.rowOptions.map((r: any, i: number) => ({
            id: r.id ?? `r-${i}`,
            text: r.text ?? `Row ${i + 1}`,
          }));
        }
        // LEGACY: Check options[0].rowOptions
        else if (
          question.options &&
          question.options[0] &&
          Array.isArray(question.options[0].rowOptions)
        ) {
          rows = question.options[0].rowOptions.map((r: any, i: number) => ({
            id: r.id ?? `r-${i}`,
            text: r.text ?? `Row ${i + 1}`,
          }));
        }

        // If required, ALL rows must be answered
        if (question.required && rows.length > 0) {
          const gridAnswer = value as Record<string, string | string[]>;

          // Check if every row has an answer
          return rows.every((row) => {
            const rowAnswer = gridAnswer[row.id];
            if (!rowAnswer) return false;

            // For checkbox grid, check if array has at least one item
            if (Array.isArray(rowAnswer)) {
              return rowAnswer.length > 0;
            }

            // For multi-choice grid, check if string is not empty
            if (typeof rowAnswer === "string") {
              return rowAnswer.trim().length > 0;
            }

            return false;
          });
        }

        // If not required, just check if at least one row is answered
        const entries = Object.values(value);
        if (entries.length === 0) return false;
        return entries.some((v) => {
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === "string") return v.trim().length > 0;
          return v !== null && v !== undefined;
        });
      }

      // For other object-type answers
      const entries = Object.values(value);
      if (entries.length === 0) return false;
      return entries.some((v) => {
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === "string") return v.trim().length > 0;
        return v !== null && v !== undefined;
      });
    }

    // Fallback: treat as answered
    return true;
  };

  // ✅ NEW: derived count of answered questions
  const answeredCount = useMemo(() => {
    if (!survey) return 0;
    return survey.questions.filter((q) => isQuestionAnswered(q)).length;
  }, [survey, answers]);

  const handleNext = () => {
    const currentQuestion = survey?.questions[currentQuestionIndex];
    if (currentQuestion?.required && !isQuestionAnswered(currentQuestion)) {
      toast.error("This question is required");
      return;
    }

    if (survey && currentQuestionIndex < survey.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Validate all required questions are answered
    const unansweredRequired = survey.questions.filter(
      (q) => q.required && !isQuestionAnswered(q)
    );

    if (unansweredRequired.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }

    try {
      setSubmitting(true);

      // Format answers for API
      const formattedAnswers = Object.entries(answers).map(
        ([questionId, answer]) => {
          console.log("questionId is", questionId);
          console.log("answer is", answer);
          const question = survey.questions.find((q) => q.id === questionId);
          const kind = normalizeKind(question!);
          let answerValue: any = answer;

          // Handle grid questions - convert object to array format
          if (kind === "multi-choice grid" || kind === "checkbox grid") {
            // Convert Record<string, string | string[]> to array format
            const gridObject = answer as Record<string, string | string[]>;
            answerValue = Object.entries(gridObject).map(([rowId, cols]) => ({
              rowOptionId: rowId,
              selectedColumns: Array.isArray(cols) ? cols : [cols],
            }));
          }
          // Handle regular checkboxes (not grid)
          else if (Array.isArray(answer) && kind === "checkboxes") {
            answerValue = answer; // Keep as array of option IDs
          }
          // Handle other array answers
          else if (Array.isArray(answer)) {
            answerValue = answer;
          }

          return {
            questionId,
            answer_value: answerValue,
          };
        }
      );

      const responseData = {
        // surveyId: survey.id,
        token,
        user_metadata: {},
        answers: formattedAnswers,
      };
      console.log("Formatted answers for API:", formattedAnswers);

      // Submit response without authentication (public survey)
      // const submitResponse = await responseApi.submitResponse(responseData);
      const submitResponse = await responseApi.submitResponseWithToken(
        responseData
      );
      console.log("submitResponse is", submitResponse.data);

      const result: any = submitResponse;

      const response_id = result.data?.response?.id;

      if (result.data || response_id) {
        // If respondent went through quota checking, mark them as completed
        if (respondentId && surveyIdForQuota && response_id) {
          try {
            const markRespondentCompletedResult =
              await quotaApi.markRespondentCompleted(
                surveyIdForQuota,
                respondentId,
                response_id
              );
            console.log(
              "markRespondentCompleted is",
              markRespondentCompletedResult
            );
          } catch (markError) {
            // Log error but don't fail the submission
            console.error("Error marking respondent completed:", markError);
          }
        }

        setSubmitted(true);
        toast.success("Survey submitted successfully!");
      } else {
        throw new Error("Failed to submit survey");
      }
      // if (result.data || result?.data?.id) {
      //   setSubmitted(true);
      //   toast.success("Survey submitted successfully!");
      // } else {
      //   throw new Error("Failed to submit survey");
      // }
    } catch (err: any) {
      console.error("Error submitting survey:", err);
      toast.error(err.message || "Failed to submit survey");
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question: Question) => {
    const answer = answers[question.id];
    const kind = normalizeKind(question);

    // Parse options if they're stored as JSON string
    let options = question.options;
    if (typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch (e) {
        options = [];
      }
    }

    const opts = Array.isArray(options) ? options : [];

    // Short answer
    if (kind === "short answer") {
      return (
        <Input
          value={answer || ""}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          placeholder="Your answer"
          className="max-w-md"
        />
      );
    }

    // Paragraph
    if (kind === "paragraph") {
      return (
        <Textarea
          value={answer || ""}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          placeholder="Your answer"
          className="max-w-md resize-none"
          rows={4}
        />
      );
    }

    // Multiple choice (radio buttons)
    if (kind === "multiple choice") {
      const textOptions = opts.filter((o) => (o.text ?? "").trim().length > 0);
      return (
        <RadioGroup
          value={answer || ""}
          onValueChange={(value) => handleAnswerChange(question.id, value)}
        >
          {textOptions.map((option: any, idx: number) => (
            <div key={idx} className="flex items-center space-x-2">
              <RadioGroupItem value={option.id} id={`${question.id}-${idx}`} />
              <Label htmlFor={`${question.id}-${idx}`}>{option.text}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    // Checkboxes (multiple selection)
    if (kind === "checkboxes") {
      const textOptions = opts.filter((o) => (o.text ?? "").trim().length > 0);
      const currentAnswers = Array.isArray(answer) ? answer : [];

      return (
        <div className="space-y-3">
          {textOptions.map((option: any, idx: number) => (
            <div key={idx} className="flex items-center space-x-2">
              <Checkbox
                id={`${question.id}-${idx}`}
                checked={currentAnswers.includes(option.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleAnswerChange(question.id, [
                      ...currentAnswers,
                      option.id,
                    ]);
                  } else {
                    handleAnswerChange(
                      question.id,
                      currentAnswers.filter((a: string) => a !== option.id)
                    );
                  }
                }}
              />
              <Label htmlFor={`${question.id}-${idx}`}>{option.text}</Label>
            </div>
          ))}
        </div>
      );
    }

    // Dropdown
    if (kind === "dropdown") {
      const textOptions = opts.filter((o) => (o.id ?? "").trim().length > 0);
      return (
        <Select
          value={answer || ""}
          onValueChange={(value) => handleAnswerChange(question.id, value)}
        >
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Choose an option" />
          </SelectTrigger>
          <SelectContent>
            {textOptions.map((option: any, idx: number) => (
              <SelectItem key={idx} value={option.id}>
                {option.text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Linear scale
    if (kind === "linear scale") {
      const opt = opts[0];
      const min = opt?.rangeFrom ?? 1;
      const max = opt?.rangeTo ?? 5;
      const fromLabel = opt?.fromLabel ?? "";
      const toLabel = opt?.toLabel ?? "";

      const scaleValues = [];
      for (let i = min; i <= max; i++) {
        scaleValues.push(i);
      }

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            {fromLabel && (
              <span className="text-sm text-slate-600">{fromLabel}</span>
            )}
            <div className="flex gap-2">
              {scaleValues.map((val) => (
                <Button
                  key={val}
                  type="button"
                  variant={answer === val ? "default" : "outline"}
                  className={
                    answer === val
                      ? "bg-violet-600 hover:bg-violet-700"
                      : "hover:bg-slate-100"
                  }
                  onClick={() => handleAnswerChange(question.id, val)}
                >
                  {val}
                </Button>
              ))}
            </div>
            {toLabel && (
              <span className="text-sm text-slate-600">{toLabel}</span>
            )}
          </div>
        </div>
      );
    }

    // Rating (stars)
    if (kind === "rating") {
      const opt = opts[0];
      const max = opt?.rangeTo ?? 5;

      return (
        <div className="flex gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleAnswerChange(question.id, val)}
              className="focus:outline-none"
            >
              <Star
                className={`h-8 w-8 ${
                  answer >= val
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-slate-300"
                }`}
              />
            </button>
          ))}
        </div>
      );
    }

    // Multi-choice grid (radio buttons per row)
    if (kind === "multi-choice grid") {
      // NEW: Check question-level rowOptions/columnOptions first
      let rows: { id: string; text: string }[] = [];
      let cols: { id: string; text: string }[] = [];

      if (
        Array.isArray(question.rowOptions) &&
        question.rowOptions.length > 0
      ) {
        rows = question.rowOptions.map((r: any, i: number) => ({
          id: r.id ?? `r-${i}`,
          text: r.text ?? `Row ${i + 1}`,
        }));
      }

      if (
        Array.isArray(question.columnOptions) &&
        question.columnOptions.length > 0
      ) {
        cols = question.columnOptions.map((c: any, j: number) => ({
          id: c.id ?? `c-${j}`,
          text: c.text ?? `Column ${j + 1}`,
        }));
      }

      // LEGACY: Fallback to options[0] if question-level not found
      if (rows.length === 0 || cols.length === 0) {
        const first = opts[0];
        if (rows.length === 0 && first?.rowOptions) {
          rows = first.rowOptions.map((r: any, i: number) => ({
            id: r.id ?? `r-${i}`,
            text: r.text ?? `Row ${i + 1}`,
          }));
        }
        if (cols.length === 0 && first?.columnOptions) {
          cols = first.columnOptions.map((c: any, j: number) => ({
            id: c.id ?? `c-${j}`,
            text: c.text ?? `Column ${j + 1}`,
          }));
        }
      }

      return (
        <MultiChoiceGridQuestion
          question={question}
          rows={rows}
          cols={cols}
          answer={answer}
          handleAnswerChange={handleAnswerChange}
        />
      );
      // return (
      //   <div className="overflow-x-auto">
      //     <table className="min-w-[480px] border-collapse text-sm">
      //       <thead>
      //         <tr>
      //           <th className="px-3 py-2 text-left text-slate-500 font-medium">
      //             {" "}
      //           </th>
      //           {cols.map((c: { id: string; text: string }) => (
      //             <th
      //               key={c.id}
      //               className="px-3 py-2 text-slate-700 font-medium text-center"
      //             >
      //               {c.text}
      //             </th>
      //           ))}
      //         </tr>
      //       </thead>
      //       <tbody>
      //         {rows.map((r: { id: string; text: string }) => (
      //           <tr key={r.id} className="border-t">
      //             <td className="px-3 py-2 text-slate-700">{r.text}</td>

      //             {/* Each row is its own RadioGroup */}
      //             <RadioGroup
      //               key={r.id}
      //               value={gridAnswer[r.id] ?? ""}
      //               onValueChange={(selectedValue) => {
      //                 const newGridAnswer = {
      //                   ...gridAnswer,
      //                   [r.id]: selectedValue,
      //                 };
      //                 handleAnswerChange(question.id, newGridAnswer);
      //               }}
      //               className="contents" // keeps table layout intact
      //             >
      //               {cols.map((c: { id: string; text: string }) => {
      //                 const cellId = `${question.id}-grid-mc-${r.id}-${c.id}`;
      //                 return (
      //                   <td key={c.id} className="px-3 py-2 text-center">
      //                     <RadioGroupItem id={cellId} value={c.id} />
      //                   </td>
      //                 );
      //               })}
      //             </RadioGroup>
      //           </tr>
      //         ))}
      //       </tbody>
      //     </table>
      //   </div>
      // );
    }

    // Checkbox grid (checkboxes per row)
    if (kind === "checkbox grid") {
      // NEW: Check question-level rowOptions/columnOptions first
      let rows: { id: string; text: string }[] = [];
      let cols: { id: string; text: string }[] = [];

      if (
        Array.isArray(question.rowOptions) &&
        question.rowOptions.length > 0
      ) {
        rows = question.rowOptions.map((r: any, i: number) => ({
          id: r.id ?? `r-${i}`,
          text: r.text ?? `Row ${i + 1}`,
        }));
      }

      if (
        Array.isArray(question.columnOptions) &&
        question.columnOptions.length > 0
      ) {
        cols = question.columnOptions.map((c: any, j: number) => ({
          id: c.id ?? `c-${j}`,
          text: c.text ?? `Column ${j + 1}`,
        }));
      }

      // LEGACY: Fallback to options[0] if question-level not found
      if (rows.length === 0 || cols.length === 0) {
        const first = opts[0];
        if (rows.length === 0 && first?.rowOptions) {
          rows = first.rowOptions.map((r: any, i: number) => ({
            id: r.id ?? `r-${i}`,
            text: r.text ?? `Row ${i + 1}`,
          }));
        }
        if (cols.length === 0 && first?.columnOptions) {
          cols = first.columnOptions.map((c: any, j: number) => ({
            id: c.id ?? `c-${j}`,
            text: c.text ?? `Column ${j + 1}`,
          }));
        }
      }

      return (
        <CheckboxGridQuestion
          question={question}
          rows={rows}
          cols={cols}
          answer={answer}
          handleAnswerChange={handleAnswerChange}
        />
      );
    }

    // Date
    if (kind === "date") {
      return (
        <Input
          type="date"
          value={answer || ""}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          className="max-w-md"
        />
      );
    }

    // Time
    if (kind === "time") {
      return (
        <Input
          type="time"
          value={answer || ""}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          className="max-w-md"
        />
      );
    }

    // Number
    if (kind === "number") {
      return (
        <Input
          type="number"
          value={answer || ""}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          placeholder="Enter a number"
          className="max-w-md"
        />
      );
    }

    // NPS (Net Promoter Score)
    if (kind === "nps") {
      return (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 11 }, (_, i) => i).map((val) => (
              <Button
                key={val}
                type="button"
                variant={answer === val ? "default" : "outline"}
                className={
                  answer === val
                    ? "bg-violet-600 hover:bg-violet-700 min-w-[48px]"
                    : "hover:bg-slate-100 min-w-[48px]"
                }
                onClick={() => handleAnswerChange(question.id, val)}
              >
                {val}
              </Button>
            ))}
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Not at all likely</span>
            <span>Extremely likely</span>
          </div>
        </div>
      );
    }

    // Default fallback
    return (
      <Input
        value={answer || ""}
        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
        placeholder="Your answer"
        className="max-w-md"
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                You've Already Responded
              </h2>
              <p className="text-slate-600 mb-6">
                Your can fill out this survey only once.
              </p>
              <Button onClick={() => router.push("/")}>Close</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state (only show if we have an error AND not showing start page)
  if ((error || dataLoadError) && !showStartPage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                {notFoundHeader}
              </h2>
              <p className="text-slate-600 mb-4">
                {error ||
                  dataLoadError ||
                  "The survey you're looking for doesn't exist or has been removed."}
              </p>
              <Button onClick={() => router.push("/")}>Go to Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Start Page with Terms & Conditions
  if (showStartPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-xl border-0">
          <CardHeader className="text-center border-b border-slate-100 bg-gradient-to-r from-violet-600 to-violet-700 rounded-t-lg">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-full">
                <FileText className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-white font-bold">
              {"Survey"}
            </CardTitle>
            {/* {survey?.description && (
              <p className="text-violet-100 mt-2 text-sm">
                {survey.description}
              </p>
            )} */}
          </CardHeader>

          <CardContent className="pt-6 pb-8">
            {/* Terms and Conditions Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-violet-600" />
                Terms & Conditions
              </h3>
              <TermsAndConditions />
            </div>

            {/* Error message if data loading failed */}
            {dataLoadError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Unable to load survey</span>
                </div>
                <p className="text-red-600 text-sm mt-1">{dataLoadError}</p>
              </div>
            )}

            {/* Animated Start Button */}
            <div className="flex justify-center">
              <AnimatedStartButton
                onComplete={handleStartSurvey}
                isReady={dataReady && !dataLoadError}
                fillDuration={1700}
              />
            </div>

            {/* Estimated time */}
            {survey && (
              <p className="text-center text-slate-500 text-sm mt-4">
                Estimated time:{" "}
                {Math.max(1, Math.ceil(survey.questions.length * 0.5))} minutes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading fallback (should rarely be shown now)
  if (loading || !survey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                Thank You!
              </h2>
              <p className="text-slate-600 mb-6">
                Your response has been submitted successfully. We appreciate you
                taking the time to complete this survey.
              </p>
              <Button onClick={() => router.push("/")}>Close</Button>
              {/* <Button onClick={() => window.close()}>Close</Button> */}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show not qualified message if user doesn't qualify
  if (isQualified === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                Thank You for Your Interest
              </h2>
              <p className="text-slate-600 mb-6">
                Unfortunately, you don't qualify for this survey based on the
                screening criteria. We appreciate your time and interest.
              </p>
              <Button onClick={() => router.push("/")}>Close</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show screening questions phase
  if (screeningPhase && screeningQuestions.length > 0) {
    const currentScreeningQuestion = screeningQuestions[currentScreeningIndex];
    const screeningProgress =
      ((currentScreeningIndex + 1) / screeningQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Screening Header */}
          <Card className="mb-6">
            <CardHeader className="border-b border-slate-200 bg-amber-50">
              <CardTitle className="text-xl text-amber-900">
                Screening Questions
              </CardTitle>
              <p className="text-slate-600 mt-1 text-sm">
                Please answer these questions to see if you qualify for this
                survey.
              </p>
            </CardHeader>
          </Card>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>
                Question {currentScreeningIndex + 1} of{" "}
                {screeningQuestions.length}
              </span>
              <span>{Math.round(screeningProgress)}% complete</span>
            </div>
            <Progress value={screeningProgress} className="h-2" />
          </div>

          {/* Screening Question Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label className="text-lg font-medium text-slate-800">
                  {currentScreeningQuestion.question_text}
                </Label>

                <RadioGroup
                  value={screeningAnswers[currentScreeningQuestion.id] || ""}
                  onValueChange={(value) =>
                    handleScreeningAnswerChange(
                      currentScreeningQuestion.id,
                      value
                    )
                  }
                  className="space-y-3"
                >
                  {currentScreeningQuestion.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center space-x-3"
                    >
                      <RadioGroupItem value={option.value} id={option.id} />
                      <Label htmlFor={option.id} className="cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevScreeningQuestion}
              disabled={currentScreeningIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <Button
              onClick={nextScreeningQuestion}
              disabled={!isCurrentScreeningAnswered() || checkingQualification}
            >
              {checkingQualification ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : currentScreeningIndex === screeningQuestions.length - 1 ? (
                "Submit & Check Qualification"
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = survey.questions[currentQuestionIndex];
  // Progress based on completed questions (starts at 0%)
  // const progress = (currentQuestionIndex / survey.questions.length) * 100;
  const progress =
    survey.questions.length > 0
      ? (answeredCount / survey.questions.length) * 100
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Survey Header */}
        {/* <Card className="mb-6">
          <CardHeader className="border-b border-slate-200 bg-violet-50">
            <CardTitle className="text-2xl text-violet-900">
              {survey.title}
            </CardTitle>
            {survey.description && (
              <p className="text-slate-600 mt-2">{survey.description}</p>
            )}
          </CardHeader>
        </Card> */}

        {/* Progress Bar */}
        {survey.settings?.showProgressBar !== false && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              {/* <span>
                Question {currentQuestionIndex + 1} of {survey.questions.length}
              </span> */}
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {currentQuestion.question_text}
              {currentQuestion.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderQuestionInput(currentQuestion)}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0 || submitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={submitting}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : currentQuestionIndex === survey.questions.length - 1 ? (
                  <>
                    Submit
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
