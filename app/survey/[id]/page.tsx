"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { toast } from "react-toastify";
import {
  surveyApi,
  questionApi,
  categoriesApi,
  responseApi,
  shareApi,
} from "@/lib/api";

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
  | "time";

type KindsMap = Record<string, GKind>;

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
  // const surveyId = params.id as string;

  const [notFoundHeader, setNotFoundHeader] = useState("Survey Not Found");
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [kindsMap, setKindsMap] = useState<KindsMap>({});

  // Extract category IDs from questions
  const categoryIds = useMemo(() => {
    if (!survey) return [];
    const set = new Set<string>();
    survey.questions.forEach((q) => {
      if (q.categoryId) set.add(q.categoryId);
    });
    return Array.from(set);
  }, [survey]);

  // Fetch category kinds
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

  // useEffect(() => {
  //   loadSurvey();
  // }, [surveyId]);
  useEffect(() => {
    validateSurvey();
  }, [token]);

  const validateSurvey = async () => {
    try {
      const result = await shareApi.validateShareToken(token);
      console.log("Validation result is", result);
      if (result.data) {
        loadSurvey(result.data.surveyId);
      } else {
        throw new Error(result.error || "Failed to validate token");
      }
    } catch (e: any) {
      console.error("Failed to validate token:", e);
      setNotFoundHeader("Invalid survey link");
      setError(e.message || "Failed to validate token");
      setLoading(false);
    }
  };

  const loadSurvey = async (surveyId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Use surveyApi.getSurvey() - it's now public (no auth required)
      const surveyData = await surveyApi.getSurvey(surveyId);

      // Fetch questions for the survey (no auth required)
      const questionsResponse = await questionApi.getQuestions(surveyId);
      console.log("Questions response:", questionsResponse);

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
      } else {
        throw new Error("No questions found for this survey");
      }
    } catch (err: any) {
      console.error("Error loading survey:", err);
      setError(err.message || "Failed to load survey");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
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
      console.log("submitResponse is", submitResponse);

      const result = submitResponse;

      if (result.data || result.id) {
        setSubmitted(true);
        toast.success("Survey submitted successfully!");
      } else {
        throw new Error("Failed to submit survey");
      }
    } catch (err: any) {
      console.error("Error submitting survey:", err);
      toast.error(err.message || "Failed to submit survey");
    } finally {
      setSubmitting(false);
    }
  };

  // Normalize question kind based on category or infer from options
  const normalizeKind = (q: Question): GKind => {
    const byCat = q.categoryId ? kindsMap[q.categoryId] : undefined;
    if (byCat) return byCat;

    const inferred = inferFromOptions(q);
    if (inferred) return inferred;

    return "short answer";
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

      const gridAnswer = (answer as Record<string, string>) || {};

      return (
        <div className="overflow-x-auto">
          <table className="min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-slate-500 font-medium"></th>
                {cols.map((c: { id: string; text: string }) => (
                  <th
                    key={c.id}
                    className="px-3 py-2 text-slate-700 font-medium text-center"
                  >
                    {c.text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: { id: string; text: string }) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-slate-700">{r.text}</td>

                  {cols.map((c: { id: string; text: string }) => {
                    const cellId = `${question.id}-grid-mc-${r.id}-${c.id}`;
                    return (
                      <td key={c.id} className="px-3 py-2 text-center">
                        {/* RadioGroup INSIDE the cell, not wrapping the row */}
                        <RadioGroup
                          value={gridAnswer[r.id] ?? ""}
                          onValueChange={(selectedValue) => {
                            const newGridAnswer = {
                              ...gridAnswer,
                              [r.id]: selectedValue,
                            };
                            handleAnswerChange(question.id, newGridAnswer);
                          }}
                        >
                          <div key={c.id} className="px-3 py-2 text-center">
                            <RadioGroupItem id={cellId} value={c.id} />
                          </div>
                        </RadioGroup>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      const gridAnswer = (answer as Record<string, string[]>) || {};

      return (
        <div className="overflow-x-auto">
          <table className="min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-slate-500 font-medium">
                  {" "}
                </th>
                {cols.map((c: { id: string; text: string }) => (
                  <th
                    key={c.id}
                    className="px-3 py-2 text-slate-700 font-medium text-center"
                  >
                    {c.text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: { id: string; text: string }) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-slate-700">{r.text}</td>
                  {cols.map((c: { id: string; text: string }) => {
                    const cellId = `${question.id}-grid-cb-${r.id}-${c.id}`;
                    const rowAnswers = gridAnswer[r.id] || [];
                    const isChecked = rowAnswers.includes(c.id);

                    return (
                      <td key={c.id} className="px-3 py-2 text-center">
                        <Checkbox
                          id={cellId}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const newRowAnswers = checked
                              ? [...rowAnswers, c.id]
                              : rowAnswers.filter((id: string) => id !== c.id);
                            const newGridAnswer = {
                              ...gridAnswer,
                              [r.id]: newRowAnswers,
                            };
                            handleAnswerChange(question.id, newGridAnswer);
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

  if (error || !survey) {
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
                  "The survey you're looking for doesn't exist or has been removed."}
              </p>
              <Button onClick={() => router.push("/")}>Go to Home</Button>
            </div>
          </CardContent>
        </Card>
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
        <Card className="mb-6">
          <CardHeader className="border-b border-slate-200 bg-violet-50">
            <CardTitle className="text-2xl text-violet-900">
              {survey.title}
            </CardTitle>
            {survey.description && (
              <p className="text-slate-600 mt-2">{survey.description}</p>
            )}
          </CardHeader>
        </Card>

        {/* Progress Bar */}
        {survey.settings?.showProgressBar !== false && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>
                Question {currentQuestionIndex + 1} of {survey.questions.length}
              </span>
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
