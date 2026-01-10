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
  ScreeningQuestion,
  QuotaCheckRequest,
  vendorsApi,
  SavedScreeningQuestionInterface,
  QuotaCheckRequest_v2,
} from "@/lib/api";
import RankingQuestion from "@/components/ranking-question";
import { cn } from "@/lib/utils";

import {
  DEFAULT_AGE_GROUPS,
  DEFAULT_GENDERS,
  GENDER_LABELS,
} from "@/components/quota-audience-selector";

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

interface QuestionMedia {
  id?: string;
  url: string;
  type: string;
  thumbnail_url?: string;
  meta?: {
    originalname?: string;
    size?: number;
    mimetype?: string;
  };
}

interface OptionMedia {
  type: "IMAGE" | "VIDEO" | "AUDIO";
  url: string;
  meta?: {
    originalname?: string;
    size?: number;
    mimetype?: string;
  };
}

interface QuestionOption {
  id?: string;
  text?: string;
  mediaId?: string | null;
  mediaAsset?: OptionMedia | null;
  // Scale properties
  rangeFrom?: number | null;
  rangeTo?: number | null;
  fromLabel?: string | null;
  toLabel?: string | null;
  icon?: string | null;
  // Grid properties
  rowOptions?: { text?: string | null; id?: string }[];
  columnOptions?: { text?: string | null; id?: string }[];
  rowQuestionOptionId?: string | null;
  columnQuestionOptionId?: string | null;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: QuestionOption[];
  required: boolean;
  order_index: number;
  categoryId?: string;
  category?: any;
  rows?: any[];
  columns?: any[];
  rowOptions?: any[];
  columnOptions?: any[];
  allowMultipleInGrid?: boolean;
  mediaAsset?: QuestionMedia[] | QuestionMedia | null;
  allow_partial_rank?: boolean;
  min_rank_required?: number;
  max_rank_allowed?: number;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  settings: {
    showProgressBar?: boolean;
    shuffleQuestions?: boolean;
    isAnonymous?: boolean;
    isResultPublic: boolean;
    autoReloadOnSubmit: boolean;
    requireTermsAndConditions: boolean;
  };
  survey_send_by?: string;
}

// Helper to extract media from question (handles array or single object)
function getQuestionMedia(question: Question): QuestionMedia | null {
  if (!question.mediaAsset) return null;
  if (Array.isArray(question.mediaAsset)) {
    return question.mediaAsset[0] || null;
  }
  return question.mediaAsset;
}

// Component to render media preview
function QuestionMediaDisplay({ media }: { media: QuestionMedia | null }) {
  if (!media || !media.url) return null;

  const mediaType = (media.type || "").toUpperCase();

  return (
    <div className="mb-4 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
      {mediaType === "IMAGE" && (
        <img
          src={media.url}
          alt={media.meta?.originalname || "Question image"}
          className="max-w-full max-h-[400px] object-contain mx-auto"
        />
      )}
      {mediaType === "VIDEO" && (
        <video
          src={media.url}
          controls
          className="max-w-full max-h-[400px] mx-auto"
        >
          Your browser does not support the video tag.
        </video>
      )}
      {mediaType === "AUDIO" && (
        <div className="p-4">
          <audio src={media.url} controls className="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}

// Component to render option media preview (smaller version)
export function OptionMediaDisplay({
  media,
  fullWidth = false,
}: {
  media: OptionMedia | null | undefined;
  fullWidth?: boolean;
}) {
  console.log(">>>>> the value of the FULL WIDTH is : ", fullWidth);
  if (!media || !media.url) return null;

  const mediaType = (media.type || "").toUpperCase();

  return (
    <div
      className={cn(
        "mt-1 rounded-md overflow-hidden border border-slate-200 bg-slate-50",
        fullWidth ? "w-full" : "max-w-[200px]"
      )}
    >
      {mediaType === "IMAGE" && (
        <img
          src={media.url}
          alt={media.meta?.originalname || "Option image"}
          className={cn(
            "object-contain mx-auto",
            fullWidth ? "w-full max-h-[300px]" : "max-h-[100px]"
          )}
        />
      )}
      {mediaType === "VIDEO" && (
        <video
          src={media.url}
          controls
          className={cn(
            "mx-auto",
            fullWidth ? "w-full max-h-[300px]" : "max-h-[100px]"
          )}
        />
      )}
      {mediaType === "AUDIO" && (
        <div className="p-2">
          <audio
            src={media.url}
            controls
            className="w-full h-8 min-w-[200px]"
          />
        </div>
      )}
    </div>
  );
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
  | "nps"
  | "ranking";

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
  if (k === "ranking") return "ranking";
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

function redirectVendor(shareTokenId: string, isCompleted: boolean) {
  return `${process.env.NEXT_PUBLIC_API_URL}/api/vendors/redirect?shareTokenId=${shareTokenId}&isCompleted=${isCompleted}`;
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
  const [screeningQuestions, setScreeningQuestions] = useState<
    SavedScreeningQuestionInterface[]
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
  const [shouldAutoRestart, setShouldAutoRestart] = useState(false);
  const [isSurveyInProgress, setIsSurveyInProgress] = useState(false);

  const hasScreeningQuestions = screeningQuestions.length > 0;

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
        const surveyData = result.data;
        console.log(">>>> the value of the SURVEY DATA is : ", surveyData);
        if (surveyData.survey.settings?.autoReloadOnSubmit) {
          setShouldAutoRestart(true);
        }

        setSurveyIdForQuota(surveyId);

        // Fetch quota config for screening questions
        try {
          const quotaScreeningQuestionsResponse =
            await quotaApi.getQuotaScreeningQuestions(surveyId);
          if (quotaScreeningQuestionsResponse.data) {
            console.log(
              "Quota screening questions response data is",
              quotaScreeningQuestionsResponse.data
            );
            setScreeningQuestions(
              quotaScreeningQuestionsResponse?.data?.data ?? []
            );
            setScreeningPhase(true);
            setIsQualified(null);
          } else {
            setScreeningQuestions([]);
            setScreeningPhase(false);
            setIsQualified(true);
          }
        } catch (quotaErr) {
          console.log("No quota config found, skipping screening:", quotaErr);
          setScreeningQuestions([]);
          setScreeningPhase(false);
          setIsQualified(true);
        }

        const questionsArray = surveyData.survey.questions;
        if (questionsArray.length > 0) {
          console.log("Questions Array:", questionsArray);

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
            survey_send_by: surveyData.survey.survey_send_by,
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

  // PREVENT CLOSING of Tab without CONSENT
  useEffect(() => {
    if (!isSurveyInProgress) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleUnload = () => {
      // user abandoned mid-survey
      navigator.sendBeacon(redirectVendor(token, false));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleUnload);
    };
  }, [isSurveyInProgress, token]);

  const handleStartSurvey = useCallback(async () => {
    if (!dataReady || !survey) return;

    // call checkQualification once before letting the user into the survey
    if (!hasScreeningQuestions && isQualified !== false) {
      console.log("No screening questions, checking qualification");
      const isQualify = await checkQualification();
      // If quota-full or not qualified, checkQualification will redirect or set isQualified=false
      if (isQualify == false) {
        return;
      }
    }

    setIsSurveyInProgress(true);
    setShowStartPage(false);
  }, [dataReady, survey, hasScreeningQuestions, isQualified]);

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
      const checkRequest: QuotaCheckRequest_v2 = { screeningAnswers: [] };

      // support both with and without screening questions
      if (hasScreeningQuestions) {
        screeningQuestions.forEach((sq) => {
          const answer = screeningAnswers[sq.id];
          console.log(">>>>> the value of the SCREENING ANSWERS is : ", answer);
          if (!answer) return;
          checkRequest.screeningAnswers.push({
            screeningQuestionId: sq.id,
            screeningOptionId: answer,
            answerValue: answer,
          });
        });
      } else {
        // No screening questions: still call quota API using just vendor_respondent_id
        // so backend can respond with QUOTA_FULL/qualified based on overall quotas
      }

      checkRequest.vendor_respondent_id = token;

      const result = await quotaApi.checkQuota_v2(
        surveyIdForQuota,
        checkRequest
      );
      console.log(">>>> CHECK QUOTA RESULT:", result);

      if (result.data?.qualified) {
        setRespondentId(result.data?.respondent_id ?? null);
        setIsQualified(true);
        setScreeningPhase(false);
        toast.success("You qualify for this survey!");

        return true;
      } else {
        setIsSurveyInProgress(false);
        if (result.data?.status == "QUOTA_FULL") {
          router.push("/survey/terminated?reason=quota_full");
          return false;
        }
        router.push("/survey/terminated?reason=not_qualified");
        setIsQualified(false);
        return false;
      }
    } catch (err: any) {
      console.error("Error checking qualification:", err);
      router.push("/survey/terminated?reason=not_qualified");
      setIsQualified(false);
      setScreeningPhase(false);
      return false;
    } finally {
      setCheckingQualification(false);
    }
  };

  // Navigate screening questions
  const nextScreeningQuestion = async () => {
    if (currentScreeningIndex < screeningQuestions.length - 1) {
      setCurrentScreeningIndex((prev) => prev + 1);
    } else {
      // All screening questions answered, check qualification
      await checkQualification();
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
      if (question.category?.type_name.toLowerCase() === "ranking") {
        if (value.length < question?.min_rank_required) {
          toast.error(
            `Please rank at least ${question.min_rank_required} options`
          );
          return false;
        }
        return value.length > 0;
      }
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

  const resetSurveyState = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSubmitted(false);
    setSubmitting(false);

    // Only reset screening if you want the user to repeat it
    setScreeningAnswers({});
    setCurrentScreeningIndex(0);

    setIsSurveyInProgress(false);
    // DO NOT TOUCH: surveySettings, survey, etc.
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

      console.log(">>>>> the value of the SURVEY is : ", survey);
      if (survey?.survey_send_by === "VENDOR") {
        const redirectUrl = redirectVendor(token, true);
        console.log(">>>>> the value of the REDIRECT URL is : ", redirectUrl);
        navigator.sendBeacon(redirectUrl);
      }

      const response_id = result.data?.response?.id;

      if (result.data || response_id) {
        console.log(">>>>>>> the value of the RESPONSE ID is : ", response_id);
        // If respondent went through quota checking, mark them as completed
        if (respondentId && surveyIdForQuota && response_id) {
          try {
            const markRespondentCompletedResult =
              await quotaApi.markRespondentCompleted_v2(
                surveyIdForQuota,
                respondentId,
                response_id
              );
            console.log(
              "markRespondentCompleted_v2 is",
              markRespondentCompletedResult
            );
          } catch (markError) {
            // Log error but don't fail the submission
            console.error("Error marking respondent completed:", markError);
          }
        }

        setIsSurveyInProgress(false);
        setSubmitted(true);
        toast.success("Survey submitted successfully!");

        if (shouldAutoRestart) {
          setTimeout(() => {
            resetSurveyState(); // <-- NEW helper function (next step)
          }, 2000);
        }
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
          className="space-y-3"
        >
          {textOptions.map((option: QuestionOption, idx: number) => (
            <div key={idx}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option.id || String(idx)}
                  id={`${question.id}-${idx}`}
                />
                <Label htmlFor={`${question.id}-${idx}`}>{option.text}</Label>
              </div>
              <OptionMediaDisplay media={option.mediaAsset} />
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
          {textOptions.map((option: QuestionOption, idx: number) => (
            <div key={idx}>
              <div className="flex items-center space-x-2">
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
              <OptionMediaDisplay media={option.mediaAsset} />
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

    // Ranking
    if (kind === "ranking") {
      return (
        <RankingQuestion
          question={question}
          answer={answer}
          onChange={(rankedIds) => {
            answers[question.id] = rankedIds;
          }}
        />
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
    console.log("screeningQuestions **** : ", screeningQuestions);
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
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="cursor-pointer">
                        {option.option_text} ({option.id})
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
            {/* Display attached media */}
            <QuestionMediaDisplay media={getQuestionMedia(currentQuestion)} />

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
