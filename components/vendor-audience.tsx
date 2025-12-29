"use client";

import { vendorsApi } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // [web:48]
import { Checkbox } from "@/components/ui/checkbox"; // [web:43]
import { Badge } from "@/components/ui/badge"; // [web:63]
import { Button } from "@/components/ui/button"; // [web:96]

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Loader2, X } from "lucide-react";
import { groupQuestionsByPrimaryCategory } from "@/lib/vendorsCommon";

interface VendorOption {
  label: string;
  value: string;
}

interface VendorQuestionOption {
  id: string;
  questionId: string;
  option_text: string;
  vendor_option_id: string;
  order_index: number;
  created_at?: string;
}

interface VendorQuestion {
  id: string;
  questionKey: string;
  questionText: string;
  questionType: string;
  optionsCount: number;
  options: VendorQuestionOption[];
}

interface GroupedQuestionBucket {
  groupName: string;
  questionCount: number;
  questions: VendorQuestion[];
}

type OpenEndedTextValue = { value: string; quota?: number };
type OpenEndedRange = {
  id: string;
  min?: number;
  max?: number;
  quota?: number;
};

type ScreeningCriteriaByQuestion = Record<
  string,
  {
    desiredCompletes?: number;

    // option-based
    selectedOptionIds?: string[];
    optionQuotas?: Record<string, number | undefined>;

    // open-ended
    openEnded?: {
      mode: "TEXT" | "RANGE";
      textValues?: OpenEndedTextValue[];
      ranges?: OpenEndedRange[];
    };
  }
>;

export interface VendorAudienceData {
  vendorId: string;
  screeningCriteria?: ScreeningCriteriaByQuestion;
  hasScreeningSelection?: boolean;
  isScreeningValid?: boolean;
}

interface VendorAudienceProps {
  createdSurvey: any;
  surveySettings: any;
  vendorsAudience: VendorAudienceData;
  onVendorsAudienceUpdate: (audience: VendorAudienceData) => void;
  categories?: Array<{ id: string; name: string }>;
  onValidationError?: (error: string | null) => void;
  isEditMode?: boolean;
}

// ---- helpers you can customize
const isOpenEndedQuestion = (q: VendorQuestion) =>
  /open|text|verbatim/i.test(q.questionType);
const isRangeQuestion = (q: VendorQuestion) =>
  /age/i.test(q.questionText) || /AGE/i.test(q.questionKey);

const toNumOrUndef = (v: string) => (v.trim() === "" ? undefined : Number(v));
const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

export default function VendorAudience({
  createdSurvey,
  surveySettings,
  vendorsAudience,
  onVendorsAudienceUpdate,
  categories,
  onValidationError,
  isEditMode,
}: VendorAudienceProps) {
  const [vendorsList, setVendorsList] = useState<VendorOption[]>([]);
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);
  const [loadingDialogOpen, setLoadingDialogOpen] = useState(false);

  const [groupedQuestions, setGroupedQuestions] = useState<
    GroupedQuestionBucket[]
  >([]);
  const [activeGroupName, setActiveGroupName] = useState<string | null>(null);

  const [criteriaByQuestion, setCriteriaByQuestion] =
    useState<ScreeningCriteriaByQuestion>({});

  // NEW: drafts for open-ended adds
  const [textDraft, setTextDraft] = useState<
    Record<string, { value: string; quota: string }>
  >({});
  const [rangeDraft, setRangeDraft] = useState<
    Record<string, { min: string; max: string; quota: string }>
  >({});

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await vendorsApi.getVendors();
        const data = res.data?.data || [];
        const activeVendors = data.filter((v: any) => v.is_active);

        setVendorsList(
          activeVendors.map((v: any) => ({
            label: v.name,
            value: v.id,
          }))
        );
      } catch (error) {
        console.error("Error fetching vendors:", error);
      }
    };

    fetchVendors();
  }, []);

  const activeGroup = useMemo(() => {
    if (!groupedQuestions.length) return null;
    return (
      groupedQuestions.find((g) => g.groupName === activeGroupName) ??
      groupedQuestions[0]
    );
  }, [groupedQuestions, activeGroupName]);

  const pushCriteriaToParent = (next: ScreeningCriteriaByQuestion) => {
    const hasSelection = computeHasScreeningSelection(next);
    const error = computeBlockingError(next);
    const isValid = !error;

    onVendorsAudienceUpdate({
      ...vendorsAudience,
      screeningCriteria: next,
      hasScreeningSelection: hasSelection,
      isScreeningValid: isValid,
    });

    // ✅ NEW: parent gets an error string (or null)
    onValidationError?.(error);
  };

  const updateCriteria = (
    questionId: string,
    patch: Partial<ScreeningCriteriaByQuestion[string]>
  ) => {
    setCriteriaByQuestion((prev) => {
      const next: ScreeningCriteriaByQuestion = {
        ...prev,
        [questionId]: { ...prev[questionId], ...patch },
      };
      pushCriteriaToParent(next);
      return next;
    });
  };

  // -------- option-based logic
  const toggleOption = (
    questionId: string,
    optionId: string,
    checked: boolean
  ) => {
    const current = criteriaByQuestion[questionId] ?? {};
    const selected = new Set(current.selectedOptionIds ?? []);

    if (checked) selected.add(optionId);
    else selected.delete(optionId);

    const nextOptionQuotas = { ...(current.optionQuotas ?? {}) };
    if (!checked) delete nextOptionQuotas[optionId];

    updateCriteria(questionId, {
      selectedOptionIds: Array.from(selected),
      optionQuotas: nextOptionQuotas,
    });
  };

  const setOptionQuota = (
    questionId: string,
    optionId: string,
    quota?: number
  ) => {
    const current = criteriaByQuestion[questionId] ?? {};
    const nextOptionQuotas = { ...(current.optionQuotas ?? {}) };
    nextOptionQuotas[optionId] = quota;
    updateCriteria(questionId, { optionQuotas: nextOptionQuotas });
  };

  // -------- open-ended TEXT (multiple values + quota per value)
  const addTextValue = (questionId: string) => {
    const draft = textDraft[questionId] ?? { value: "", quota: "" };
    const value = draft.value.trim();
    if (!value) return;

    const quota = toNumOrUndef(draft.quota);
    const current = criteriaByQuestion[questionId] ?? {};
    const existing = current.openEnded?.textValues ?? [];

    if (existing.some((x) => x.value.toLowerCase() === value.toLowerCase())) {
      setTextDraft((p) => ({ ...p, [questionId]: { value: "", quota: "" } }));
      return;
    }

    const nextValues: OpenEndedTextValue[] = [...existing, { value, quota }];

    updateCriteria(questionId, {
      openEnded: {
        mode: "TEXT",
        textValues: nextValues,
        ranges: current.openEnded?.ranges,
      },
    });

    setTextDraft((p) => ({ ...p, [questionId]: { value: "", quota: "" } }));
  };

  const removeTextValue = (questionId: string, value: string) => {
    const current = criteriaByQuestion[questionId] ?? {};
    const existing = current.openEnded?.textValues ?? [];
    const nextValues = existing.filter((x) => x.value !== value);

    updateCriteria(questionId, {
      openEnded: {
        mode: "TEXT",
        textValues: nextValues,
        ranges: current.openEnded?.ranges,
      },
    });
  };

  const setTextValueQuota = (
    questionId: string,
    value: string,
    quota?: number
  ) => {
    const current = criteriaByQuestion[questionId] ?? {};
    const existing = current.openEnded?.textValues ?? [];
    const nextValues = existing.map((x) =>
      x.value === value ? { ...x, quota } : x
    );

    updateCriteria(questionId, {
      openEnded: {
        mode: "TEXT",
        textValues: nextValues,
        ranges: current.openEnded?.ranges,
      },
    });
  };

  // -------- open-ended RANGE (multiple ranges + quota per range)
  const addRange = (questionId: string) => {
    const draft = rangeDraft[questionId] ?? { min: "", max: "", quota: "" };
    const min = toNumOrUndef(draft.min);
    const max = toNumOrUndef(draft.max);
    const quota = toNumOrUndef(draft.quota);

    // allow adding only if min/max are present
    if (min === undefined || max === undefined) return;

    const current = criteriaByQuestion[questionId] ?? {};
    const existing = current.openEnded?.ranges ?? [];

    const nextRanges: OpenEndedRange[] = [
      ...existing,
      { id: uid(), min, max, quota },
    ];

    updateCriteria(questionId, {
      openEnded: {
        mode: "RANGE",
        ranges: nextRanges,
        textValues: current.openEnded?.textValues,
      },
    });

    setRangeDraft((p) => ({
      ...p,
      [questionId]: { min: "", max: "", quota: "" },
    }));
  };

  const removeRange = (questionId: string, rangeId: string) => {
    const current = criteriaByQuestion[questionId] ?? {};
    const existing = current.openEnded?.ranges ?? [];
    const nextRanges = existing.filter((r) => r.id !== rangeId);

    updateCriteria(questionId, {
      openEnded: {
        mode: "RANGE",
        ranges: nextRanges,
        textValues: current.openEnded?.textValues,
      },
    });
  };

  const updateRangeField = (
    questionId: string,
    rangeId: string,
    patch: Partial<Pick<OpenEndedRange, "min" | "max" | "quota">>
  ) => {
    const current = criteriaByQuestion[questionId] ?? {};
    const existing = current.openEnded?.ranges ?? [];
    const nextRanges = existing.map((r) =>
      r.id === rangeId ? { ...r, ...patch } : r
    );

    updateCriteria(questionId, {
      openEnded: {
        mode: "RANGE",
        ranges: nextRanges,
        textValues: current.openEnded?.textValues,
      },
    });
  };

  // -------- validation / allocation
  const getAllocation = (
    q: VendorQuestion,
    qCriteria: ScreeningCriteriaByQuestion[string]
  ) => {
    const target = qCriteria.desiredCompletes;

    // open-ended TEXT => sum of value quotas
    if (isOpenEndedQuestion(q) && !isRangeQuestion(q)) {
      const values = qCriteria.openEnded?.textValues ?? [];
      const hasItems = values.length > 0;
      const missingQuota = values.some((v) => v.quota === undefined);
      const allocated = hasItems
        ? values.reduce((a, v) => a + (Number(v.quota) || 0), 0)
        : null;
      return { target, allocated, hasItems, missingQuota };
    }

    // open-ended RANGE => sum of range quotas
    if (isOpenEndedQuestion(q) && isRangeQuestion(q)) {
      const ranges = qCriteria.openEnded?.ranges ?? [];
      const hasItems = ranges.length > 0;
      const missingQuota = ranges.some((r) => r.quota === undefined);
      const allocated = hasItems
        ? ranges.reduce((a, r) => a + (Number(r.quota) || 0), 0)
        : null;
      return { target, allocated, hasItems, missingQuota };
    }

    // option-based => sum of selected option quotas
    const selected = qCriteria.selectedOptionIds ?? [];
    const quotas = qCriteria.optionQuotas ?? {};
    const hasItems = selected.length > 0;
    const missingQuota = selected.some((optId) => quotas[optId] === undefined);
    const allocated = hasItems
      ? selected.reduce((a, id) => a + (Number(quotas[id]) || 0), 0)
      : null;

    return { target, allocated, hasItems, missingQuota };
  };

  const handleSelectedVendor = async (value: string) => {
    setIsFetchingQuestions(true);
    setLoadingDialogOpen(true);

    setGroupedQuestions([]);
    setActiveGroupName(null);
    setCriteriaByQuestion({});
    setTextDraft({});
    setRangeDraft({});

    onVendorsAudienceUpdate({
      ...vendorsAudience,
      vendorId: value,
      screeningCriteria: {},
      hasScreeningSelection: false,
      isScreeningValid: false,
    });

    // immediately block Continue until user selects questions
    onValidationError?.("Please select at least one screening question.");

    try {
      const res = await vendorsApi.getVendorQuestions(value, {
        countryCode: "IN",
        language: "ENGLISH",
      });

      const questions = res.data?.data || [];
      const grouped = (await groupQuestionsByPrimaryCategory(
        questions
      )) as GroupedQuestionBucket[];

      setGroupedQuestions(grouped);
      if (grouped?.length) setActiveGroupName(grouped[0].groupName);
    } catch (error) {
      console.error("Error fetching vendor questions:", error);
    } finally {
      setIsFetchingQuestions(false);
      setLoadingDialogOpen(false);
    }
  };

  // ✅ NEW: tells if user selected at least one screening question
  const computeHasScreeningSelection = (
    criteria: ScreeningCriteriaByQuestion
  ) => {
    return Object.values(criteria ?? {}).some((c: any) => {
      const hasOptions =
        Array.isArray(c?.selectedOptionIds) && c.selectedOptionIds.length > 0;
      const hasTextValues =
        Array.isArray(c?.openEnded?.textValues) &&
        c.openEnded.textValues.length > 0;
      const hasRanges =
        Array.isArray(c?.openEnded?.ranges) && c.openEnded.ranges.length > 0;
      return hasOptions || hasTextValues || hasRanges;
    });
  };

  // ✅ NEW: flatten question map for validation messages (needs groupedQuestions)
  const questionById = useMemo(() => {
    const map = new Map<string, VendorQuestion>();
    groupedQuestions.forEach((g) =>
      g.questions.forEach((q) => map.set(q.id, q))
    );
    return map;
  }, [groupedQuestions]);

  useEffect(() => {
    // ✅ NEW: keeps parent error in sync (e.g. vendor cleared, questions loaded, etc.)
    const error = computeBlockingError(criteriaByQuestion);
    onValidationError?.(error);
  }, [vendorsAudience.vendorId, criteriaByQuestion, questionById]);

  // ✅ NEW: returns a single blocking error message (or null)
  const computeBlockingError = (criteria: ScreeningCriteriaByQuestion) => {
    // 1) vendor required
    if (!vendorsAudience.vendorId) return "Please select a vendor.";

    // 2) at least one screening question required
    const hasSelection = computeHasScreeningSelection(criteria);
    if (!hasSelection) return "Please select at least one screening question.";

    // 3) validate only questions that have desiredCompletes set
    for (const [questionId, c] of Object.entries(criteria ?? {})) {
      const q = questionById.get(questionId);
      if (!q) continue;

      const target = (c as any)?.desiredCompletes;
      if (
        target === undefined ||
        target === null ||
        Number.isNaN(Number(target))
      )
        continue;

      const { hasItems, missingQuota, allocated } = getAllocation(q, c as any);

      if (!hasItems)
        return `Please configure values/options for: "${q.questionText}".`;
      if (missingQuota)
        return `Please fill user counts for: "${q.questionText}".`;
      if (allocated === null)
        return `Please allocate user counts for: "${q.questionText}".`;
      if (Number(allocated) !== Number(target))
        return `Allocated users must equal Desired users for: "${q.questionText}".`;
    }

    return null;
  };

  if (surveySettings.survey_send_by !== "VENDOR") return null;

  return (
    <>
      <div className="space-y-4">
        {/* Vendor select */}
        <div className="space-y-2">
          <Label htmlFor="vendor_id">Select Vendor</Label>

          <Select
            value={vendorsAudience.vendorId || ""}
            onValueChange={
              isFetchingQuestions ? undefined : handleSelectedVendor
            }
          >
            <SelectTrigger disabled={isFetchingQuestions}>
              <SelectValue placeholder="Select a vendor" />
            </SelectTrigger>

            <SelectContent>
              {vendorsList.length === 0 && (
                <SelectItem value="__none" disabled>
                  No active vendors
                </SelectItem>
              )}

              {vendorsList.map((vendor) => (
                <SelectItem
                  key={vendor.value}
                  value={vendor.value}
                  disabled={isFetchingQuestions}
                >
                  {vendor.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categories + Questions */}
        {groupedQuestions.length > 0 ? (
          <div className="grid grid-cols-12 gap-4">
            {/* Left */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3 rounded-md border">
              <div className="border-b px-3 py-2 text-sm font-medium">
                Categories
              </div>
              <div className="max-h-[520px] overflow-y-auto p-2">
                {groupedQuestions.map((g) => {
                  const isActive = g.groupName === activeGroupName;
                  return (
                    <button
                      key={g.groupName}
                      type="button"
                      onClick={() => setActiveGroupName(g.groupName)}
                      className={[
                        "w-full rounded-md px-3 py-2 text-left text-sm",
                        "flex items-center justify-between gap-3",
                        isActive ? "bg-muted font-medium" : "hover:bg-muted/60",
                      ].join(" ")}
                    >
                      <span className="truncate">{g.groupName}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                        {g.questionCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right */}
            <div className="col-span-12 md:col-span-8 lg:col-span-9 rounded-md border">
              <div className="border-b px-3 py-2">
                <div className="text-sm font-medium">
                  {activeGroup?.groupName ?? "Questions"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {activeGroup?.questionCount ?? 0} question(s)
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto p-3 space-y-3">
                {activeGroup?.questions?.map((q) => {
                  const qCriteria = criteriaByQuestion[q.id] ?? {};
                  const selectedIds = new Set(
                    qCriteria.selectedOptionIds ?? []
                  );
                  const optionQuotas = qCriteria.optionQuotas ?? {};

                  const { target, allocated, hasItems, missingQuota } =
                    getAllocation(q, qCriteria);
                  const mismatch =
                    target !== undefined &&
                    allocated !== null &&
                    allocated !== target;

                  return (
                    <div key={q.id} className="rounded-md border p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {q.questionText}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {q.questionType} • {q.optionsCount} option(s)
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {q.questionKey}
                        </div>
                      </div>

                      {/* Target quota + status */}
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 md:col-span-6">
                          <Label className="text-xs">
                            Desired users for this question
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={qCriteria.desiredCompletes ?? ""}
                            onChange={(e) =>
                              updateCriteria(q.id, {
                                desiredCompletes: toNumOrUndef(e.target.value),
                              })
                            }
                            placeholder="e.g. 50"
                          />
                        </div>

                        <div className="col-span-12 md:col-span-6 text-xs">
                          {target === undefined ? (
                            <div className="text-muted-foreground rounded-md border px-3 py-2">
                              Tip: Set a target to enforce quota validation.
                            </div>
                          ) : !hasItems ? (
                            <div className="rounded-md border px-3 py-2 text-muted-foreground">
                              Allocated: — / Target:{" "}
                              <span className="font-medium">{target}</span>
                              <div className="mt-1">
                                Add values/options and their user counts.
                              </div>
                            </div>
                          ) : (
                            <div
                              className={[
                                "rounded-md border px-3 py-2",
                                mismatch || missingQuota
                                  ? "border-red-500 text-red-600"
                                  : "text-muted-foreground",
                              ].join(" ")}
                            >
                              Allocated:{" "}
                              <span className="font-medium">{allocated}</span> /
                              Target:{" "}
                              <span className="font-medium">{target}</span>
                              {missingQuota ? (
                                <div className="mt-1">
                                  Fill user counts for all selected items.
                                </div>
                              ) : mismatch ? (
                                <div className="mt-1">
                                  Difference:{" "}
                                  <span className="font-medium">
                                    {target - allocated!}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* OPEN ENDED */}
                      {isOpenEndedQuestion(q) ? (
                        <div className="space-y-3">
                          {/* AGE / RANGE: multiple ranges */}
                          {isRangeQuestion(q) ? (
                            <>
                              <div className="text-xs text-muted-foreground">
                                Add multiple ranges (e.g. 18–24, 25–34) with
                                user counts.
                              </div>

                              {/* Add range row */}
                              <div className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-4">
                                  <Label className="text-xs">Min</Label>
                                  <Input
                                    type="number"
                                    value={rangeDraft[q.id]?.min ?? ""}
                                    onChange={(e) =>
                                      setRangeDraft((p) => ({
                                        ...p,
                                        [q.id]: {
                                          ...(p[q.id] ?? {
                                            min: "",
                                            max: "",
                                            quota: "",
                                          }),
                                          min: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="18"
                                  />
                                </div>
                                <div className="col-span-4">
                                  <Label className="text-xs">Max</Label>
                                  <Input
                                    type="number"
                                    value={rangeDraft[q.id]?.max ?? ""}
                                    onChange={(e) =>
                                      setRangeDraft((p) => ({
                                        ...p,
                                        [q.id]: {
                                          ...(p[q.id] ?? {
                                            min: "",
                                            max: "",
                                            quota: "",
                                          }),
                                          max: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="24"
                                  />
                                </div>
                                <div className="col-span-4">
                                  <Label className="text-xs">Users</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={rangeDraft[q.id]?.quota ?? ""}
                                    onChange={(e) =>
                                      setRangeDraft((p) => ({
                                        ...p,
                                        [q.id]: {
                                          ...(p[q.id] ?? {
                                            min: "",
                                            max: "",
                                            quota: "",
                                          }),
                                          quota: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="10"
                                  />
                                </div>
                                <div className="col-span-12">
                                  <Button
                                    type="button"
                                    onClick={() => addRange(q.id)}
                                    className="w-full"
                                  >
                                    Add range
                                  </Button>
                                </div>
                              </div>

                              {/* Ranges list */}
                              <div className="space-y-2">
                                {(qCriteria.openEnded?.ranges ?? []).map(
                                  (r) => (
                                    <div
                                      key={r.id}
                                      className="grid grid-cols-12 gap-2 items-end rounded-md border p-2"
                                    >
                                      <div className="col-span-4">
                                        <Label className="text-xs">Min</Label>
                                        <Input
                                          type="number"
                                          value={r.min ?? ""}
                                          onChange={(e) =>
                                            updateRangeField(q.id, r.id, {
                                              min: toNumOrUndef(e.target.value),
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="col-span-4">
                                        <Label className="text-xs">Max</Label>
                                        <Input
                                          type="number"
                                          value={r.max ?? ""}
                                          onChange={(e) =>
                                            updateRangeField(q.id, r.id, {
                                              max: toNumOrUndef(e.target.value),
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="col-span-3">
                                        <Label className="text-xs">Users</Label>
                                        <Input
                                          type="number"
                                          min={0}
                                          value={r.quota ?? ""}
                                          onChange={(e) =>
                                            updateRangeField(q.id, r.id, {
                                              quota: toNumOrUndef(
                                                e.target.value
                                              ),
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="col-span-1 flex justify-end">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            removeRange(q.id, r.id)
                                          }
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                )}

                                {(qCriteria.openEnded?.ranges ?? []).length ===
                                0 ? (
                                  <div className="text-xs text-muted-foreground">
                                    No ranges added yet.
                                  </div>
                                ) : null}
                              </div>
                            </>
                          ) : (
                            <>
                              {/* TEXT: multiple values + quota at add-time */}
                              <div className="text-xs text-muted-foreground">
                                Add multiple qualifying values (e.g. Haryana,
                                MP) with user counts.
                              </div>

                              <div className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-8">
                                  <Label className="text-xs">Value</Label>
                                  <Input
                                    value={textDraft[q.id]?.value ?? ""}
                                    onChange={(e) =>
                                      setTextDraft((p) => ({
                                        ...p,
                                        [q.id]: {
                                          ...(p[q.id] ?? {
                                            value: "",
                                            quota: "",
                                          }),
                                          value: e.target.value,
                                        },
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        addTextValue(q.id);
                                      }
                                    }}
                                    placeholder="e.g. Haryana"
                                  />
                                </div>

                                <div className="col-span-4">
                                  <Label className="text-xs">Users</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={textDraft[q.id]?.quota ?? ""}
                                    onChange={(e) =>
                                      setTextDraft((p) => ({
                                        ...p,
                                        [q.id]: {
                                          ...(p[q.id] ?? {
                                            value: "",
                                            quota: "",
                                          }),
                                          quota: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="10"
                                  />
                                </div>

                                <div className="col-span-12">
                                  <Button
                                    type="button"
                                    onClick={() => addTextValue(q.id)}
                                    className="w-full"
                                  >
                                    Add value
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {(qCriteria.openEnded?.textValues ?? []).map(
                                  (v) => (
                                    <div
                                      key={v.value}
                                      className="grid grid-cols-12 gap-2 items-center rounded-md border p-2"
                                    >
                                      <div className="col-span-7 flex items-center gap-2">
                                        <Badge variant="secondary">
                                          {v.value}
                                        </Badge>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            removeTextValue(q.id, v.value)
                                          }
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>

                                      <div className="col-span-5">
                                        <Label className="text-xs">Users</Label>
                                        <Input
                                          type="number"
                                          min={0}
                                          value={v.quota ?? ""}
                                          onChange={(e) =>
                                            setTextValueQuota(
                                              q.id,
                                              v.value,
                                              toNumOrUndef(e.target.value)
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  )
                                )}

                                {(qCriteria.openEnded?.textValues ?? [])
                                  .length === 0 ? (
                                  <div className="text-xs text-muted-foreground">
                                    No values added yet.
                                  </div>
                                ) : null}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        /* OPTION BASED */
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">
                            Select qualifying options and set per-option user
                            counts.
                          </div>

                          <div className="space-y-2">
                            {q.options
                              ?.slice()
                              ?.sort((a, b) => a.order_index - b.order_index)
                              .map((opt) => {
                                const checked = selectedIds.has(opt.id);

                                return (
                                  <div
                                    key={opt.id}
                                    className="grid grid-cols-12 gap-3 items-center rounded-md border px-3 py-2"
                                  >
                                    <div className="col-span-12 md:col-span-7 flex items-center gap-2">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(v) =>
                                          toggleOption(q.id, opt.id, v === true)
                                        }
                                      />
                                      <div className="text-sm">
                                        {opt.option_text}
                                      </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-5">
                                      <Label className="text-xs">
                                        Users for this option
                                      </Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        disabled={!checked}
                                        value={optionQuotas[opt.id] ?? ""}
                                        onChange={(e) =>
                                          setOptionQuota(
                                            q.id,
                                            opt.id,
                                            toNumOrUndef(e.target.value)
                                          )
                                        }
                                        placeholder="e.g. 10"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            Select a vendor to load screening questions.
          </div>
        )}
      </div>

      {/* Loading dialog */}
      <Dialog open={loadingDialogOpen} onOpenChange={setLoadingDialogOpen}>
        <DialogContent className="flex flex-col items-center justify-center gap-4">
          <DialogHeader className="items-center">
            <DialogTitle>Fetching screening questions</DialogTitle>
            <DialogDescription className="text-center">
              Please wait while the vendor screening questions are being loaded.
            </DialogDescription>
          </DialogHeader>

          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    </>
  );
}
