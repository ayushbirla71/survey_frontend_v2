"use client";

import { vendorsApi } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

type OpenEndedValue = {
  value: string;
  quota?: number; // per typed value quota
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
      textValues?: OpenEndedValue[]; // NEW: multiple typed values (chips)
      min?: number;
      max?: number;
    };
  }
>;

export interface VendorAudienceData {
  vendorId: string;
  screeningCriteria?: ScreeningCriteriaByQuestion;
}

interface VendorAudienceProps {
  createdSurvey: any;
  surveySettings: any;
  vendorsAudience: VendorAudienceData;
  onVendorsAudienceUpdate: (audience: VendorAudienceData) => void;
  categories?: Array<{ id: string; name: string }>;
  isEditMode?: boolean;
}

const isOpenEndedQuestion = (q: VendorQuestion) =>
  /open|text|verbatim/i.test(q.questionType);

const isRangeQuestion = (q: VendorQuestion) =>
  /age/i.test(q.questionText) || /AGE/i.test(q.questionKey);

const toNumOrUndef = (v: string) => (v.trim() === "" ? undefined : Number(v));

export default function VendorAudience({
  surveySettings,
  vendorsAudience,
  onVendorsAudienceUpdate,
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

  // NEW: draft text input per open-ended question (for adding chips)
  const [openEndedDraft, setOpenEndedDraft] = useState<Record<string, string>>(
    {}
  );

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
    onVendorsAudienceUpdate({
      ...vendorsAudience,
      screeningCriteria: next,
    });
  };

  const updateCriteria = (
    questionId: string,
    patch: Partial<ScreeningCriteriaByQuestion[string]>
  ) => {
    setCriteriaByQuestion((prev) => {
      const next: ScreeningCriteriaByQuestion = {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          ...patch,
        },
      };
      pushCriteriaToParent(next);
      return next;
    });
  };

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

  // NEW: add/remove/update open-ended typed values (chips)
  const addOpenEndedValue = (questionId: string) => {
    const raw = (openEndedDraft[questionId] ?? "").trim();
    if (!raw) return;

    const current = criteriaByQuestion[questionId] ?? {};
    const existing = current.openEnded?.textValues ?? [];

    const alreadyExists = existing.some(
      (x) => x.value.toLowerCase() === raw.toLowerCase()
    );
    if (alreadyExists) {
      setOpenEndedDraft((p) => ({ ...p, [questionId]: "" }));
      return;
    }

    const nextValues: OpenEndedValue[] = [...existing, { value: raw }];

    updateCriteria(questionId, {
      openEnded: {
        ...(current.openEnded ?? { mode: "TEXT" as const }),
        mode: "TEXT",
        textValues: nextValues,
      },
    });

    setOpenEndedDraft((p) => ({ ...p, [questionId]: "" }));
  };

  const removeOpenEndedValue = (questionId: string, valueToRemove: string) => {
    const current = criteriaByQuestion[questionId] ?? {};
    const existing = current.openEnded?.textValues ?? [];
    const nextValues = existing.filter((x) => x.value !== valueToRemove);

    updateCriteria(questionId, {
      openEnded: {
        ...(current.openEnded ?? { mode: "TEXT" as const }),
        mode: "TEXT",
        textValues: nextValues,
      },
    });
  };

  const setOpenEndedValueQuota = (
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
        ...(current.openEnded ?? { mode: "TEXT" as const }),
        mode: "TEXT",
        textValues: nextValues,
      },
    });
  };

  // NEW: validation helpers
  const getAllocatedCount = (
    q: VendorQuestion,
    qCriteria: ScreeningCriteriaByQuestion[string]
  ) => {
    const target = qCriteria.desiredCompletes;

    // open-ended text values => sum of their quotas
    if (isOpenEndedQuestion(q) && !isRangeQuestion(q)) {
      const values = qCriteria.openEnded?.textValues ?? [];
      const sum = values.reduce((acc, v) => acc + (Number(v.quota) || 0), 0);
      return { target, allocated: sum };
    }

    // option-based => sum of optionQuotas for selected options
    const selected = qCriteria.selectedOptionIds ?? [];
    const quotas = qCriteria.optionQuotas ?? {};
    const sum = selected.reduce(
      (acc, optId) => acc + (Number(quotas[optId]) || 0),
      0
    );

    return { target, allocated: sum };
  };

  const hasMissingQuotas = (
    q: VendorQuestion,
    qCriteria: ScreeningCriteriaByQuestion[string]
  ) => {
    if (qCriteria.desiredCompletes === undefined) return false;

    if (isOpenEndedQuestion(q) && !isRangeQuestion(q)) {
      const values = qCriteria.openEnded?.textValues ?? [];
      if (!values.length) return true;
      return values.some((v) => v.quota === undefined);
    }

    const selected = qCriteria.selectedOptionIds ?? [];
    if (!selected.length) return true;
    const quotas = qCriteria.optionQuotas ?? {};
    return selected.some((optId) => quotas[optId] === undefined);
  };

  const handleSelectedVendor = async (value: string) => {
    setIsFetchingQuestions(true);
    setLoadingDialogOpen(true);

    setGroupedQuestions([]);
    setActiveGroupName(null);
    setCriteriaByQuestion({});
    setOpenEndedDraft({});

    onVendorsAudienceUpdate({
      ...vendorsAudience,
      vendorId: value,
      screeningCriteria: {},
    });

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
                  const isOpen = isOpenEndedQuestion(q);
                  const selectedIds = new Set(
                    qCriteria.selectedOptionIds ?? []
                  );
                  const optionQuotas = qCriteria.optionQuotas ?? {};

                  const { target, allocated } = getAllocatedCount(q, qCriteria);
                  const mismatch =
                    target !== undefined &&
                    Number.isFinite(target) &&
                    allocated !== target;

                  const missing = hasMissingQuotas(q, qCriteria);

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

                      {/* Target quota */}
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
                          {target !== undefined ? (
                            <div
                              className={[
                                "rounded-md border px-3 py-2",
                                mismatch
                                  ? "border-red-500 text-red-600"
                                  : "text-muted-foreground",
                              ].join(" ")}
                            >
                              Allocated:{" "}
                              <span className="font-medium">{allocated}</span> /
                              Target:{" "}
                              <span className="font-medium">{target}</span>
                              {missing ? (
                                <div className="mt-1 text-red-600">
                                  Add quotas for all selected items to match the
                                  target.
                                </div>
                              ) : null}
                              {mismatch && !missing ? (
                                <div className="mt-1">
                                  Difference:{" "}
                                  <span className="font-medium">
                                    {target - allocated}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="text-muted-foreground rounded-md border px-3 py-2">
                              Tip: set a target to enforce quota validation.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Open-ended */}
                      {isOpen ? (
                        <div className="space-y-3">
                          {isRangeQuestion(q) ? (
                            <>
                              <div className="text-xs text-muted-foreground">
                                Range qualifier (min/max).
                              </div>

                              <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-6">
                                  <Label className="text-xs">Min</Label>
                                  <Input
                                    type="number"
                                    value={qCriteria.openEnded?.min ?? ""}
                                    onChange={(e) =>
                                      updateCriteria(q.id, {
                                        openEnded: {
                                          mode: "RANGE",
                                          min: toNumOrUndef(e.target.value),
                                          max: qCriteria.openEnded?.max,
                                        },
                                      })
                                    }
                                    placeholder="e.g. 18"
                                  />
                                </div>

                                <div className="col-span-6">
                                  <Label className="text-xs">Max</Label>
                                  <Input
                                    type="number"
                                    value={qCriteria.openEnded?.max ?? ""}
                                    onChange={(e) =>
                                      updateCriteria(q.id, {
                                        openEnded: {
                                          mode: "RANGE",
                                          min: qCriteria.openEnded?.min,
                                          max: toNumOrUndef(e.target.value),
                                        },
                                      })
                                    }
                                    placeholder="e.g. 35"
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-xs text-muted-foreground">
                                Add multiple qualifying values and optionally
                                set a quota for each value.
                              </div>

                              {/* Add value input */}
                              <div className="flex gap-2">
                                <Input
                                  value={openEndedDraft[q.id] ?? ""}
                                  onChange={(e) =>
                                    setOpenEndedDraft((p) => ({
                                      ...p,
                                      [q.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      addOpenEndedValue(q.id);
                                    }
                                  }}
                                  placeholder="Type a value and press Enter (e.g. Haryana)"
                                />
                                <Button
                                  type="button"
                                  onClick={() => addOpenEndedValue(q.id)}
                                >
                                  Add
                                </Button>
                              </div>

                              {/* Values list */}
                              <div className="space-y-2">
                                {(qCriteria.openEnded?.textValues ?? []).map(
                                  (v) => (
                                    <div
                                      key={v.value}
                                      className="grid grid-cols-12 gap-3 items-center rounded-md border px-3 py-2"
                                    >
                                      <div className="col-span-12 md:col-span-7 flex items-center gap-2">
                                        <Badge variant="secondary">
                                          {v.value}
                                        </Badge>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            removeOpenEndedValue(q.id, v.value)
                                          }
                                          className="h-8 w-8"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>

                                      <div className="col-span-12 md:col-span-5">
                                        <Label className="text-xs">
                                          Users for this value
                                        </Label>
                                        <Input
                                          type="number"
                                          min={0}
                                          value={v.quota ?? ""}
                                          onChange={(e) =>
                                            setOpenEndedValueQuota(
                                              q.id,
                                              v.value,
                                              toNumOrUndef(e.target.value)
                                            )
                                          }
                                          placeholder="e.g. 10"
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
                        /* Option-based */
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">
                            Select qualifying options and optionally set
                            per-option user counts.
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
                                        Users for this option (optional)
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

// "use client";

// import { vendorsApi } from "@/lib/api";
// import { useEffect, useMemo, useState } from "react";

// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input"; // shadcn input [web:48]
// import { Checkbox } from "@/components/ui/checkbox"; // shadcn checkbox [web:43]

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from "@/components/ui/dialog";

// import { Loader2 } from "lucide-react";
// import { groupQuestionsByPrimaryCategory } from "@/lib/vendorsCommon";

// interface VendorOption {
//   label: string;
//   value: string;
// }

// interface VendorQuestionOption {
//   id: string;
//   questionId: string;
//   option_text: string;
//   vendor_option_id: string;
//   order_index: number;
//   created_at?: string;
// }

// interface VendorQuestion {
//   id: string;
//   questionKey: string;
//   questionText: string;
//   questionType: string;
//   optionsCount: number;
//   options: VendorQuestionOption[];
// }

// interface GroupedQuestionBucket {
//   groupName: string;
//   questionCount: number;
//   questions: VendorQuestion[];
// }

// /** NEW: what the user configures as screening for each question */
// type ScreeningCriteriaByQuestion = Record<
//   string,
//   {
//     // common
//     desiredCompletes?: number; // quota at question level

//     // for option-based questions
//     selectedOptionIds?: string[];
//     optionQuotas?: Record<string, number>; // optionId -> quota

//     // for open-ended questions
//     openEnded?: {
//       mode: "TEXT" | "RANGE";
//       text?: string; // e.g. required text / pattern / exact match (your choice)
//       min?: number;
//       max?: number;
//     };
//   }
// >;

// export interface VendorAudienceData {
//   vendorId: string;

//   // NEW: save screening config so parent can submit it later
//   screeningCriteria?: ScreeningCriteriaByQuestion;
// }

// interface VendorAudienceProps {
//   createdSurvey: any;
//   surveySettings: any;
//   vendorsAudience: VendorAudienceData;
//   onVendorsAudienceUpdate: (audience: VendorAudienceData) => void;
//   categories?: Array<{ id: string; name: string }>;
//   isEditMode?: boolean;
// }

// const isOpenEndedQuestion = (q: VendorQuestion) => {
//   // Customize this based on your backend values
//   return /open|text|verbatim/i.test(q.questionType);
// };

// const isRangeQuestion = (q: VendorQuestion) => {
//   // Customize this: here we treat age-like questions as range qualifiers
//   return /age/i.test(q.questionText) || /AGE/i.test(q.questionKey);
// };

// export default function VendorAudience({
//   surveySettings,
//   vendorsAudience,
//   onVendorsAudienceUpdate,
// }: VendorAudienceProps) {
//   const [vendorsList, setVendorsList] = useState<VendorOption[]>([]);
//   const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);
//   const [loadingDialogOpen, setLoadingDialogOpen] = useState(false);

//   const [groupedQuestions, setGroupedQuestions] = useState<GroupedQuestionBucket[]>(
//     []
//   );
//   const [activeGroupName, setActiveGroupName] = useState<string | null>(null);

//   // local state, but also pushed to parent via onVendorsAudienceUpdate
//   const [criteriaByQuestion, setCriteriaByQuestion] =
//     useState<ScreeningCriteriaByQuestion>({});

//   useEffect(() => {
//     const fetchVendors = async () => {
//       try {
//         const res = await vendorsApi.getVendors();
//         const data = res.data?.data || [];
//         const activeVendors = data.filter((v: any) => v.is_active);

//         setVendorsList(
//           activeVendors.map((v: any) => ({
//             label: v.name,
//             value: v.id,
//           }))
//         );
//       } catch (error) {
//         console.error("Error fetching vendors:", error);
//       }
//     };

//     fetchVendors();
//   }, []);

//   const activeGroup = useMemo(() => {
//     if (!groupedQuestions.length) return null;
//     return (
//       groupedQuestions.find((g) => g.groupName === activeGroupName) ??
//       groupedQuestions[0]
//     );
//   }, [groupedQuestions, activeGroupName]);

//   const pushCriteriaToParent = (next: ScreeningCriteriaByQuestion) => {
//     onVendorsAudienceUpdate({
//       ...vendorsAudience,
//       screeningCriteria: next,
//     });
//   };

//   const updateCriteria = (
//     questionId: string,
//     patch: Partial<ScreeningCriteriaByQuestion[string]>
//   ) => {
//     setCriteriaByQuestion((prev) => {
//       const next: ScreeningCriteriaByQuestion = {
//         ...prev,
//         [questionId]: {
//           ...prev[questionId],
//           ...patch,
//         },
//       };
//       pushCriteriaToParent(next);
//       return next;
//     });
//   };

//   const toggleOption = (questionId: string, optionId: string, checked: boolean) => {
//     const current = criteriaByQuestion[questionId] ?? {};
//     const selected = new Set(current.selectedOptionIds ?? []);

//     if (checked) selected.add(optionId);
//     else selected.delete(optionId);

//     // if unchecked, also remove quota for that option (optional)
//     const nextOptionQuotas = { ...(current.optionQuotas ?? {}) };
//     if (!checked) delete nextOptionQuotas[optionId];

//     updateCriteria(questionId, {
//       selectedOptionIds: Array.from(selected),
//       optionQuotas: nextOptionQuotas,
//     });
//   };

//   const setOptionQuota = (questionId: string, optionId: string, quota: number) => {
//     const current = criteriaByQuestion[questionId] ?? {};
//     const nextOptionQuotas = { ...(current.optionQuotas ?? {}) };

//     nextOptionQuotas[optionId] = Number.isFinite(quota) ? quota : 0;

//     updateCriteria(questionId, { optionQuotas: nextOptionQuotas });
//   };

//   const handleSelectedVendor = async (value: string) => {
//     setIsFetchingQuestions(true);
//     setLoadingDialogOpen(true);

//     setGroupedQuestions([]);
//     setActiveGroupName(null);
//     setCriteriaByQuestion({});

//     onVendorsAudienceUpdate({
//       ...vendorsAudience,
//       vendorId: value,
//       screeningCriteria: {},
//     });

//     try {
//       const res = await vendorsApi.getVendorQuestions(value, {
//         countryCode: "IN",
//         language: "ENGLISH",
//       });

//       const questions = res.data?.data || [];
//       const grouped = (await groupQuestionsByPrimaryCategory(
//         questions
//       )) as GroupedQuestionBucket[];

//       setGroupedQuestions(grouped);
//       if (grouped?.length) setActiveGroupName(grouped[0].groupName);
//     } catch (error) {
//       console.error("Error fetching vendor questions:", error);
//     } finally {
//       setIsFetchingQuestions(false);
//       setLoadingDialogOpen(false);
//     }
//   };

//   if (surveySettings.survey_send_by !== "VENDOR") return null;

//   return (
//     <>
//       <div className="space-y-4">
//         {/* Vendor select */}
//         <div className="space-y-2">
//           <Label htmlFor="vendor_id">Select Vendor</Label>

//           <Select
//             value={vendorsAudience.vendorId || ""}
//             onValueChange={isFetchingQuestions ? undefined : handleSelectedVendor}
//           >
//             <SelectTrigger disabled={isFetchingQuestions}>
//               <SelectValue placeholder="Select a vendor" />
//             </SelectTrigger>

//             <SelectContent>
//               {vendorsList.length === 0 && (
//                 <SelectItem value="__none" disabled>
//                   No active vendors
//                 </SelectItem>
//               )}

//               {vendorsList.map((vendor) => (
//                 <SelectItem
//                   key={vendor.value}
//                   value={vendor.value}
//                   disabled={isFetchingQuestions}
//                 >
//                   {vendor.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Categories + Questions */}
//         {groupedQuestions.length > 0 ? (
//           <div className="grid grid-cols-12 gap-4">
//             {/* Left: category list */}
//             <div className="col-span-12 md:col-span-4 lg:col-span-3 rounded-md border">
//               <div className="border-b px-3 py-2 text-sm font-medium">
//                 Categories
//               </div>

//               <div className="max-h-[520px] overflow-y-auto p-2">
//                 {groupedQuestions.map((g) => {
//                   const isActive = g.groupName === activeGroupName;
//                   return (
//                     <button
//                       key={g.groupName}
//                       type="button"
//                       onClick={() => setActiveGroupName(g.groupName)}
//                       className={[
//                         "w-full rounded-md px-3 py-2 text-left text-sm",
//                         "flex items-center justify-between gap-3",
//                         isActive ? "bg-muted font-medium" : "hover:bg-muted/60",
//                       ].join(" ")}
//                     >
//                       <span className="truncate">{g.groupName}</span>
//                       <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
//                         {g.questionCount}
//                       </span>
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>

//             {/* Right: questions */}
//             <div className="col-span-12 md:col-span-8 lg:col-span-9 rounded-md border">
//               <div className="border-b px-3 py-2">
//                 <div className="text-sm font-medium">
//                   {activeGroup?.groupName ?? "Questions"}
//                 </div>
//                 <div className="text-xs text-muted-foreground">
//                   {activeGroup?.questionCount ?? 0} question(s)
//                 </div>
//               </div>

//               <div className="max-h-[520px] overflow-y-auto p-3 space-y-3">
//                 {activeGroup?.questions?.map((q) => {
//                   const isOpen = isOpenEndedQuestion(q);
//                   const qCriteria = criteriaByQuestion[q.id] ?? {};
//                   const selectedIds = new Set(qCriteria.selectedOptionIds ?? []);
//                   const optionQuotas = qCriteria.optionQuotas ?? {};

//                   return (
//                     <div key={q.id} className="rounded-md border p-3 space-y-3">
//                       <div className="flex items-start justify-between gap-3">
//                         <div className="space-y-1">
//                           <div className="text-sm font-medium">{q.questionText}</div>
//                           <div className="text-xs text-muted-foreground">
//                             {q.questionType} • {q.optionsCount} option(s)
//                           </div>
//                         </div>

//                         <div className="text-xs text-muted-foreground">
//                           {q.questionKey}
//                         </div>
//                       </div>

//                       {/* Question-level quota */}
//                       <div className="grid grid-cols-12 gap-3 items-end">
//                         <div className="col-span-12 md:col-span-6">
//                           <Label className="text-xs">Desired users for this question</Label>
//                           <Input
//                             type="number"
//                             min={0}
//                             value={qCriteria.desiredCompletes ?? ""}
//                             onChange={(e) =>
//                               updateCriteria(q.id, {
//                                 desiredCompletes:
//                                   e.target.value === ""
//                                     ? undefined
//                                     : Number(e.target.value),
//                               })
//                             }
//                             placeholder="e.g. 50"
//                           />
//                         </div>
//                       </div>

//                       {/* Open-ended */}
//                       {isOpen ? (
//                         <div className="space-y-2">
//                           {isRangeQuestion(q) ? (
//                             <>
//                               <div className="text-xs text-muted-foreground">
//                                 Range qualifier (min/max)
//                               </div>

//                               <div className="grid grid-cols-12 gap-3">
//                                 <div className="col-span-6">
//                                   <Label className="text-xs">Min</Label>
//                                   <Input
//                                     type="number"
//                                     value={qCriteria.openEnded?.min ?? ""}
//                                     onChange={(e) =>
//                                       updateCriteria(q.id, {
//                                         openEnded: {
//                                           mode: "RANGE",
//                                           min:
//                                             e.target.value === ""
//                                               ? undefined
//                                               : Number(e.target.value),
//                                           max: qCriteria.openEnded?.max,
//                                         },
//                                       })
//                                     }
//                                     placeholder="e.g. 18"
//                                   />
//                                 </div>

//                                 <div className="col-span-6">
//                                   <Label className="text-xs">Max</Label>
//                                   <Input
//                                     type="number"
//                                     value={qCriteria.openEnded?.max ?? ""}
//                                     onChange={(e) =>
//                                       updateCriteria(q.id, {
//                                         openEnded: {
//                                           mode: "RANGE",
//                                           min: qCriteria.openEnded?.min,
//                                           max:
//                                             e.target.value === ""
//                                               ? undefined
//                                               : Number(e.target.value),
//                                         },
//                                       })
//                                     }
//                                     placeholder="e.g. 35"
//                                   />
//                                 </div>
//                               </div>
//                             </>
//                           ) : (
//                             <>
//                               <div className="text-xs text-muted-foreground">
//                                 Text qualifier
//                               </div>

//                               <div className="grid grid-cols-12 gap-3">
//                                 <div className="col-span-12">
//                                   <Label className="text-xs">Allowed text / pattern</Label>
//                                   <Input
//                                     value={qCriteria.openEnded?.text ?? ""}
//                                     onChange={(e) =>
//                                       updateCriteria(q.id, {
//                                         openEnded: {
//                                           mode: "TEXT",
//                                           text: e.target.value,
//                                         },
//                                       })
//                                     }
//                                     placeholder="e.g. contains 'developer' / exact value / regex..."
//                                   />
//                                 </div>
//                               </div>
//                             </>
//                           )}
//                         </div>
//                       ) : (
//                         /* Option-based */
//                         <div className="space-y-2">
//                           <div className="text-xs text-muted-foreground">
//                             Select qualifying options and optionally set per-option user counts.
//                           </div>

//                           <div className="space-y-2">
//                             {q.options
//                               ?.slice()
//                               ?.sort((a, b) => a.order_index - b.order_index)
//                               .map((opt) => {
//                                 const checked = selectedIds.has(opt.id);

//                                 return (
//                                   <div
//                                     key={opt.id}
//                                     className="grid grid-cols-12 gap-3 items-center rounded-md border px-3 py-2"
//                                   >
//                                     <div className="col-span-12 md:col-span-7 flex items-center gap-2">
//                                       <Checkbox
//                                         checked={checked}
//                                         onCheckedChange={(v) =>
//                                           toggleOption(q.id, opt.id, v === true)
//                                         }
//                                       />
//                                       <div className="text-sm">{opt.option_text}</div>
//                                     </div>

//                                     <div className="col-span-12 md:col-span-5">
//                                       <Label className="text-xs">
//                                         Users for this option (optional)
//                                       </Label>
//                                       <Input
//                                         type="number"
//                                         min={0}
//                                         disabled={!checked}
//                                         value={
//                                           optionQuotas[opt.id] === undefined
//                                             ? ""
//                                             : optionQuotas[opt.id]
//                                         }
//                                         onChange={(e) =>
//                                           setOptionQuota(
//                                             q.id,
//                                             opt.id,
//                                             e.target.value === ""
//                                               ? 0
//                                               : Number(e.target.value)
//                                           )
//                                         }
//                                         placeholder="e.g. 10"
//                                       />
//                                     </div>
//                                   </div>
//                                 );
//                               })}
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>
//         ) : (
//           <div className="rounded-md border p-3 text-sm text-muted-foreground">
//             Select a vendor to load screening questions.
//           </div>
//         )}
//       </div>

//       {/* Loading dialog */}
//       <Dialog open={loadingDialogOpen} onOpenChange={setLoadingDialogOpen}>
//         <DialogContent className="flex flex-col items-center justify-center gap-4">
//           <DialogHeader className="items-center">
//             <DialogTitle>Fetching screening questions</DialogTitle>
//             <DialogDescription className="text-center">
//               Please wait while the vendor screening questions are being loaded.
//             </DialogDescription>
//           </DialogHeader>

//           <Loader2 className="h-8 w-8 animate-spin text-primary" />
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }

// // "use client";

// // import { vendorsApi } from "@/lib/api";
// // import { useEffect, useMemo, useState } from "react";
// // import { Label } from "@/components/ui/label";
// // import {
// //   Select,
// //   SelectContent,
// //   SelectItem,
// //   SelectTrigger,
// //   SelectValue,
// // } from "@/components/ui/select";
// // import {
// //   Dialog,
// //   DialogContent,
// //   DialogHeader,
// //   DialogTitle,
// //   DialogDescription,
// // } from "@/components/ui/dialog";
// // import { Loader2 } from "lucide-react";
// // import { groupQuestionsByPrimaryCategory } from "@/lib/vendorsCommon";

// // interface VendorOption {
// //   label: string;
// //   value: string;
// // }

// // interface VendorQuestionOption {
// //   id: string;
// //   questionId: string;
// //   option_text: string;
// //   vendor_option_id: string;
// //   order_index: number;
// //   created_at?: string;
// // }

// // interface VendorQuestion {
// //   id: string;
// //   questionKey: string;
// //   questionText: string;
// //   questionType: string;
// //   optionsCount: number;
// //   options: VendorQuestionOption[];
// // }

// // interface GroupedQuestionBucket {
// //   groupName: string;
// //   questionCount: number;
// //   questions: VendorQuestion[];
// // }

// // export interface VendorAudienceData {
// //   vendorId: string;
// // }

// // interface VendorAudienceProps {
// //   createdSurvey: any;
// //   surveySettings: any;
// //   vendorsAudience: VendorAudienceData;
// //   onVendorsAudienceUpdate: (audience: VendorAudienceData) => void;
// //   categories?: Array<{ id: string; name: string }>;
// //   isEditMode?: boolean;
// // }

// // export default function VendorAudience({
// //   surveySettings,
// //   vendorsAudience,
// //   onVendorsAudienceUpdate,
// //   isEditMode,
// // }: VendorAudienceProps) {
// //   const [vendorsList, setVendorsList] = useState<VendorOption[]>([]);
// //   const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);
// //   const [loadingDialogOpen, setLoadingDialogOpen] = useState(false);
// //   const [groupedQuestions, setGroupedQuestions] = useState<
// //     GroupedQuestionBucket[]
// //   >([]);
// //   const [activeGroupName, setActiveGroupName] = useState<string | null>(null);

// //   useEffect(() => {
// //     const fetchVendors = async () => {
// //       try {
// //         const res = await vendorsApi.getVendors();
// //         const data = res.data?.data || [];

// //         const activeVendors = data.filter((v: any) => v.is_active);

// //         setVendorsList(
// //           activeVendors.map((v: any) => ({
// //             label: v.name,
// //             value: v.id,
// //           }))
// //         );
// //       } catch (error) {
// //         console.error("Error fetching vendors:", error);
// //       }
// //     };

// //     fetchVendors();
// //   }, []);

// //   const activeGroup = useMemo(() => {
// //     if (!groupedQuestions.length) return null;
// //     return (
// //       groupedQuestions.find((g) => g.groupName === activeGroupName) ??
// //       groupedQuestions[0]
// //     );
// //   }, [groupedQuestions, activeGroupName]);

// //   const handleSelectedVendor = async (value: string) => {
// //     setIsFetchingQuestions(true);
// //     setLoadingDialogOpen(true);

// //     setGroupedQuestions([]);
// //     setActiveGroupName(null);

// //     onVendorsAudienceUpdate({
// //       ...vendorsAudience,
// //       vendorId: value,
// //     });

// //     try {
// //       const res = await vendorsApi.getVendorQuestions(value, {
// //         countryCode: "IN",
// //         language: "ENGLISH",
// //       });

// //       const questions = res.data?.data || [];
// //       console.log(">>>>> the value of the VENDOR QUESTIONS is : ", questions);

// //       const grouped = (await groupQuestionsByPrimaryCategory(
// //         questions
// //       )) as GroupedQuestionBucket[];
// //       console.log(">>>>> the value of the GROUPED QUESTIONS is : ", grouped);

// //       setGroupedQuestions(grouped);

// //       // auto-select first group
// //       if (grouped?.length) setActiveGroupName(grouped[0].groupName);
// //     } catch (error) {
// //       console.error("Error fetching vendor questions:", error);
// //     } finally {
// //       setIsFetchingQuestions(false);
// //       setLoadingDialogOpen(false);
// //     }
// //   };

// //   // Don’t even render if not vendor distribution
// //   if (surveySettings.survey_send_by !== "VENDOR") {
// //     return null;
// //   }

// //   return (
// //     <>
// //       <div className="space-y-4">
// //         {/* Vendor select */}
// //         <div className="space-y-2">
// //           <Label htmlFor="vendor_id">Select Vendor</Label>

// //           <Select
// //             value={vendorsAudience.vendorId || ""}
// //             onValueChange={
// //               isFetchingQuestions
// //                 ? undefined
// //                 : (value) => handleSelectedVendor(value)
// //             }
// //           >
// //             <SelectTrigger disabled={isFetchingQuestions}>
// //               <SelectValue placeholder="Select a vendor" />
// //             </SelectTrigger>

// //             <SelectContent>
// //               {vendorsList.length === 0 && (
// //                 <SelectItem value="__none" disabled>
// //                   No active vendors
// //                 </SelectItem>
// //               )}

// //               {vendorsList.map((vendor) => (
// //                 <SelectItem
// //                   key={vendor.value}
// //                   value={vendor.value}
// //                   disabled={isFetchingQuestions}
// //                 >
// //                   {vendor.label}
// //                 </SelectItem>
// //               ))}
// //             </SelectContent>
// //           </Select>
// //         </div>

// //         {/* NEW: Categories (left) + Questions (right) */}
// //         {groupedQuestions.length > 0 ? (
// //           <div className="grid grid-cols-12 gap-4">
// //             {/* Left: category list */}
// //             <div className="col-span-12 md:col-span-4 lg:col-span-3 rounded-md border">
// //               <div className="border-b px-3 py-2 text-sm font-medium">
// //                 Categories
// //               </div>

// //               <div className="max-h-[520px] overflow-y-auto p-2">
// //                 {groupedQuestions.map((g) => {
// //                   const isActive = g.groupName === activeGroupName;
// //                   return (
// //                     <button
// //                       key={g.groupName}
// //                       type="button"
// //                       onClick={() => setActiveGroupName(g.groupName)}
// //                       className={[
// //                         "w-full rounded-md px-3 py-2 text-left text-sm",
// //                         "flex items-center justify-between gap-3",
// //                         isActive ? "bg-muted font-medium" : "hover:bg-muted/60",
// //                       ].join(" ")}
// //                     >
// //                       <span className="truncate">{g.groupName}</span>
// //                       <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
// //                         {g.questionCount}
// //                       </span>
// //                     </button>
// //                   );
// //                 })}
// //               </div>
// //             </div>

// //             {/* Right: questions for selected category */}
// //             <div className="col-span-12 md:col-span-8 lg:col-span-9 rounded-md border">
// //               <div className="border-b px-3 py-2">
// //                 <div className="text-sm font-medium">
// //                   {activeGroup?.groupName ?? "Questions"}
// //                 </div>
// //                 <div className="text-xs text-muted-foreground">
// //                   {activeGroup?.questionCount ?? 0} question(s)
// //                 </div>
// //               </div>

// //               <div className="max-h-[520px] overflow-y-auto p-3 space-y-3">
// //                 {activeGroup?.questions?.map((q) => (
// //                   <div key={q.id} className="rounded-md border p-3">
// //                     <div className="flex items-start justify-between gap-3">
// //                       <div className="space-y-1">
// //                         <div className="text-sm font-medium">
// //                           {q.questionText}
// //                         </div>
// //                         <div className="text-xs text-muted-foreground">
// //                           {q.questionType} • {q.optionsCount} option(s)
// //                         </div>
// //                       </div>

// //                       <div className="text-xs text-muted-foreground">
// //                         {q.questionKey}
// //                       </div>
// //                     </div>

// //                     {/* Optional: show options */}
// //                     {Array.isArray(q.options) && q.options.length > 0 && (
// //                       <div className="mt-3 space-y-1">
// //                         {q.options
// //                           .slice()
// //                           .sort((a, b) => a.order_index - b.order_index)
// //                           .map((opt) => (
// //                             <div
// //                               key={opt.id}
// //                               className="text-sm text-muted-foreground"
// //                             >
// //                               • {opt.option_text}
// //                             </div>
// //                           ))}
// //                       </div>
// //                     )}
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>
// //           </div>
// //         ) : (
// //           <div className="rounded-md border p-3 text-sm text-muted-foreground">
// //             Select a vendor to load screening questions.
// //           </div>
// //         )}
// //       </div>

// //       {/* Loading dialog */}
// //       <Dialog open={loadingDialogOpen} onOpenChange={setLoadingDialogOpen}>
// //         <DialogContent className="flex flex-col items-center justify-center gap-4">
// //           <DialogHeader className="items-center">
// //             <DialogTitle>Fetching screening questions</DialogTitle>
// //             <DialogDescription className="text-center">
// //               Please wait while the vendor screening questions are being loaded.
// //             </DialogDescription>
// //           </DialogHeader>

// //           <Loader2 className="h-8 w-8 animate-spin text-primary" />
// //         </DialogContent>
// //       </Dialog>
// //     </>
// //   );
// // }
