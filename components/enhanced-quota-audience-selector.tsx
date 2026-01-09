import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { screeningQuestionsApi, vendorsApi } from "@/lib/api";

/** =========================
 * API types (your format)
 * ========================= */
export type ApiScreeningOption = {
  id: string;
  option_text: string;
  vendor_option_id?: string | null;
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
};

type SurveySettings = {
  survey_send_by?: "VENDOR" | string;
};

export type QuotaAudienceSelectorProps = {
  createdSurvey: { id: string };
  surveySettings: SurveySettings;
  quotaAudience: QuotaAudience;
  onQuotaAudienceUpdate: (next: QuotaAudience) => void;
  onUserUniqueIdsUpdate?: (ids: string[]) => void;
  onValidationError?: (message: string | null) => void;
  categories?: { id: string; name: string }[];
  isEditMode?: boolean;
};

/** =========================
 * UI: blocking loading modal
 * ========================= */
function LoadingModal({
  open,
  title = "Loading",
  message = "Please wait…",
}: {
  open: boolean;
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
          <div className="text-sm text-gray-700">Fetching questions…</div>
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
  return data;
}

/** =========================
 * Helpers
 * ========================= */
function normalizeOptionLabel(opt: ApiScreeningOption) {
  return opt.option_text ?? String(opt.id);
}

function getScreeningEntry(quotaAudience: QuotaAudience, questionId: string) {
  return quotaAudience.screening.find((s) => s.questionId === questionId);
}

function rebalanceToTotal(
  optionTargets: QuotaOptionTarget[],
  totalTarget: number,
  changedOptionId?: string
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

function validateQuota(
  quotaAudience: QuotaAudience,
  questions: ApiScreeningQuestion[]
): string | null {
  if (!quotaAudience.enabled) return null;
  if (!quotaAudience.totalTarget || quotaAudience.totalTarget <= 0) {
    return "Total target must be > 0.";
  }
  if (!quotaAudience.screening || quotaAudience.screening.length === 0) {
    return "Please select at least 1 screening question.";
  }
  for (const s of quotaAudience.screening) {
    const q = questions.find((qq) => qq.id === s.questionId);
    if (!q) continue;
    if (q.options?.length) {
      const targets = s.optionTargets ?? [];
      const sum = targets.reduce(
        (acc, t) => acc + (Number.isFinite(t.target) ? t.target : 0),
        0
      );
      if (sum !== quotaAudience.totalTarget) {
        return `Targets for "${q.question_text}" must sum to total target (${quotaAudience.totalTarget}). Current sum: ${sum}.`;
      }
    }
  }
  return null;
}

function groupQuestionsByVendorCategory(
  questions: ApiScreeningQuestion[],
  enabledGrouping: boolean
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
    a.categoryName.localeCompare(b.categoryName)
  );
}

/** =========================
 * Component
 * ========================= */
export default function EnhancedQuotaAudienceSelector({
  createdSurvey,
  surveySettings,
  quotaAudience,
  onQuotaAudienceUpdate,
  onUserUniqueIdsUpdate,
  onValidationError,
  categories = [],
  isEditMode = false,
}: QuotaAudienceSelectorProps) {
  const isVendorFlow = surveySettings?.survey_send_by === "VENDOR";

  // Initialize filters from quotaAudience prop (from DB)
  const [countryCode, setCountryCode] = React.useState<string>(
    quotaAudience.countryCode || "IN"
  );
  const [language, setLanguage] = React.useState<string>(
    quotaAudience.language || "ENGLISH"
  );
  const [vendorId, setVendorId] = React.useState<string>(
    quotaAudience.vendorId || ""
  );

  const withFilters = React.useCallback(
    (next: QuotaAudience): QuotaAudience => ({
      ...next,
      vendorId: isVendorFlow ? vendorId || null : null,
      countryCode: countryCode || null,
      language: language || null,
    }),
    [isVendorFlow, vendorId, countryCode, language]
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
        })
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
      if (!quotaAudience.enabled) return null;
      if (isVendorFlow) {
        if (!vendorId) return null;
        return { source: "VENDOR", vendorId, countryCode, language };
      }
      return { source: "SYSTEM", countryCode, language };
    }, [quotaAudience.enabled, isVendorFlow, vendorId, countryCode, language]);

  // Fetch questions only when payload is ready
  const questionsQuery = useQuery({
    queryKey: ["screeningQuestions", questionsPayload],
    queryFn: async () => {
      if (!questionsPayload) throw new Error("Missing payload");
      const screeningQuestionsApiResponse =
        await screeningQuestionsApi.getScreeningQuestions(questionsPayload);
      console.log(
        "screeningQuestionsApiResponse is",
        screeningQuestionsApiResponse
      );
      return (screeningQuestionsApiResponse.data?.data ??
        []) as ApiScreeningQuestion[];
    },
    enabled: Boolean(questionsPayload),
    staleTime: 30000,
  });

  const questions = (questionsQuery.data ?? []).filter(
    (q) => q.is_active !== false
  );

  // Grouping (only vendor flow groups by primary_vendor_category_id)
  const grouped = React.useMemo(
    () => groupQuestionsByVendorCategory(questions, isVendorFlow),
    [questions, isVendorFlow]
  );

  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(
    null
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
    const msg = validateQuota(quotaAudience, questions);
    onValidationError?.(msg);
  }, [quotaAudience, questions, onValidationError]);

  const activeGroup = grouped.find((g) => g.categoryId === activeCategoryId);

  // ====================================
  // HANDLERS
  // ====================================
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
      Math.trunc(Number.isFinite(value) ? value : 0)
    );

    const nextScreening = quotaAudience.screening.map((s) => {
      const q = questions.find((qq) => qq.id === s.questionId);
      if (!q?.options?.length) return s;

      const optionIds = q.options.map((o) => o.id);
      const existing = new Map(
        (s.optionTargets ?? []).map((t) => [t.optionId, t.target])
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
      withFilters({ ...quotaAudience, totalTarget, screening: nextScreening })
    );
  };

  const toggleScreeningQuestion = (
    q: ApiScreeningQuestion,
    checked: boolean
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
              total
            ),
          }
        : {
            questionId: q.id,
            vendorQuestionId: q.vendor_question_id ?? undefined,
          };

      onQuotaAudienceUpdate(
        withFilters({
          ...quotaAudience,
          screening: [...quotaAudience.screening, newEntry],
        })
      );
    } else {
      onQuotaAudienceUpdate(
        withFilters({
          ...quotaAudience,
          screening: quotaAudience.screening.filter(
            (s) => s.questionId !== q.id
          ),
        })
      );
    }
  };

  const setOptionTarget = (
    questionId: string,
    optionId: string,
    target: number
  ) => {
    const totalTarget = quotaAudience.totalTarget ?? 0;
    const q = questions.find((qq) => qq.id === questionId);
    if (!q?.options?.length) return;

    const optionIds = q.options.map((o) => o.id);
    const nextScreening = quotaAudience.screening.map((s) => {
      if (s.questionId !== questionId) return s;

      const existing = new Map(
        (s.optionTargets ?? []).map((t) => [t.optionId, t.target])
      );

      const nextTargets: QuotaOptionTarget[] = optionIds.map((id) => ({
        optionId: id,
        vendorOptionId:
          q.options.find((o) => o.id === id)?.vendor_option_id ?? null,
        target: Math.max(
          0,
          Math.trunc(id === optionId ? target : existing.get(id) ?? 0)
        ),
      }));

      return {
        ...s,
        optionTargets: rebalanceToTotal(nextTargets, totalTarget, optionId),
      };
    });

    onQuotaAudienceUpdate(
      withFilters({ ...quotaAudience, totalTarget, screening: nextScreening })
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

  const isBlockingLoading =
    quotaAudience.enabled &&
    (vendorsQuery.isFetching || questionsQuery.isFetching) &&
    (isVendorFlow ? true : Boolean(questionsPayload));

  return (
    <div className="w-full rounded border p-4">
      <LoadingModal
        open={isBlockingLoading}
        title="Fetching screening questions"
        message="Please wait until all questions are loaded."
      />

      {/* Enable quota */}
      <div className="flex items-center justify-between gap-3">
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

        {quotaAudience.enabled && (
          <div className="flex items-center gap-2">
            <label className="text-sm">Total target:</label>
            <input
              type="number"
              min={1}
              value={quotaAudience.totalTarget ?? ""}
              onChange={(e) => setTotalTarget(parseFloat(e.target.value) || 0)}
              className="w-28 rounded border px-2 py-1"
            />
          </div>
        )}
      </div>

      {/* Filters */}
      {quotaAudience.enabled && (
        <div className="mt-4 grid grid-cols-12 gap-3 rounded border p-3">
          {isVendorFlow && (
            <div className="col-span-12 md:col-span-4">
              <label className="mb-1 block text-xs text-gray-600">Vendor</label>
              <select
                className="w-full rounded border px-2 py-2 text-sm"
                value={vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
              >
                <option value="">Select vendor</option>
                {(vendorsQuery.data ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              {vendorsQuery.isError && (
                <div className="mt-1 text-xs text-red-600">
                  Failed to load vendors.
                </div>
              )}
            </div>
          )}

          <div
            className={`col-span-12 md:col-span-4 ${
              !isVendorFlow ? "md:col-span-6" : ""
            }`}
          >
            <label className="mb-1 block text-xs text-gray-600">Country</label>
            <select
              className="w-full rounded border px-2 py-2 text-sm"
              value={countryCode}
              onChange={(e) => handleCountryChange(e.target.value)}
            >
              <option value="IN">IN</option>
              <option value="US">US</option>
              <option value="GB">GB</option>
            </select>
          </div>

          <div
            className={`col-span-12 md:col-span-4 ${
              !isVendorFlow ? "md:col-span-6" : ""
            }`}
          >
            <label className="mb-1 block text-xs text-gray-600">Language</label>
            <select
              className="w-full rounded border px-2 py-2 text-sm"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="ENGLISH">ENGLISH</option>
              <option value="HINDI">HINDI</option>
            </select>
          </div>

          <div className="col-span-12 text-xs text-gray-600">
            Source:{" "}
            <span className="font-medium">
              {isVendorFlow ? "VENDOR" : "SYSTEM"}
            </span>
          </div>

          {isVendorFlow && !vendorId && (
            <div className="col-span-12 text-xs text-amber-700">
              Select a vendor to load screening questions.
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {!quotaAudience.enabled ? (
        <div className="mt-3 text-sm text-gray-600">
          Turn on quota to configure screening.
        </div>
      ) : questionsQuery.isError ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to load screening questions.
        </div>
      ) : !questionsPayload ? (
        <div className="mt-4 text-sm text-gray-600">
          {isVendorFlow
            ? "Choose vendor/country/language to load questions."
            : "Choose country/language to load questions."}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-12 gap-4">
          {/* Left */}
          <div className="col-span-4 rounded border">
            <div className="border-b px-3 py-2 text-sm font-medium">
              {isVendorFlow ? "Vendor categories" : "Questions"}
            </div>
            {grouped.length === 0 ? (
              <div className="px-3 py-3 text-sm">No questions found.</div>
            ) : (
              <ul className="max-h-[420px] overflow-auto">
                {grouped.map((g) => (
                  <li key={g.categoryId}>
                    <button
                      type="button"
                      onClick={() => setActiveCategoryId(g.categoryId)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                        g.categoryId === activeCategoryId
                          ? "bg-gray-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="truncate">{g.categoryName}</span>
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
              <div className="max-h-[420px] overflow-auto p-3">
                <div className="space-y-3">
                  {activeGroup.questions.map((q) => {
                    const selected = Boolean(
                      getScreeningEntry(quotaAudience, q.id)
                    );
                    const screeningEntry = getScreeningEntry(
                      quotaAudience,
                      q.id
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
                                toggleScreeningQuestion(q, e.target.checked)
                              }
                              // Style checkbox for selected state
                              className="cursor-pointer"
                            />
                            <span
                              className={
                                selected ? "text-violet-700 font-medium" : ""
                              }
                            >
                              Use in screening
                            </span>
                          </label>
                        </div>

                        {selected && q.options?.length ? (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-gray-600">
                              Per-option targets must sum to total target (
                              {quotaAudience.totalTarget ?? 0}).
                            </div>
                            {q.options.map((opt) => {
                              const t =
                                screeningEntry?.optionTargets?.find(
                                  (x) => x.optionId === opt.id
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
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-28 rounded border px-2 py-1"
                                  />
                                </div>
                              );
                            })}
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
    </div>
  );
}
