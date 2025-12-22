"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star } from "lucide-react";
import RankingQuestion from "./ranking-question";

type GridLabel = { id?: string; text: string };

type OptionMediaAsset = {
  type: "IMAGE" | "VIDEO" | "AUDIO";
  url: string;
  meta?: {
    originalname?: string;
    size?: number;
    mimetype?: string;
  };
};

type ApiOption = {
  id?: string;
  text?: string | null;
  mediaId?: string | null;
  mediaAsset?: OptionMediaAsset | null;
  questionId?: string;
  rowQuestionOptionId?: string | null;
  columnQuestionOptionId?: string | null;
  rangeFrom?: number | null;
  rangeTo?: number | null;
  fromLabel?: string | null;
  toLabel?: string | null;
  icon?: string | null;
  // NEW: grid shape coming from API
  rowOptions?: { text?: string | null; id?: string }[];
  columnOptions?: { text?: string | null; id?: string }[];
};

type MediaAsset = {
  type: string;
  url: string;
  thumbnail_url?: string;
  mediaId?: string | null;
  meta?: {
    originalname?: string;
    size?: number;
    mimetype?: string;
  };
};

type ApiQuestion = {
  id: string;
  question_text: string;
  question_type?: string;
  options: ApiOption[];
  required: boolean;
  categoryId?: string;
  order_index?: number;

  // Optional grid descriptors if present
  rows?: (GridLabel | string)[];
  columns?: (GridLabel | string)[];
  rowOptions?: { text?: string | null; id?: string }[];
  columnOptions?: { text?: string | null; id?: string }[];
  allowMultipleInGrid?: boolean;

  // Media attachment
  mediaAsset?: MediaAsset | null;
  media?: Array<{
    id?: string;
    type: string;
    url: string;
    thumbnail_url?: string;
    meta?: any;
  }> | null;
};

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

// Helper to get media from question (handles mediaAsset or media array)
function getQuestionMedia(q: ApiQuestion): MediaAsset | null {
  // First check mediaAsset (from frontend editor)
  if (q.mediaAsset?.url) return q.mediaAsset;

  // Then check media array (from backend)
  if (q.media && Array.isArray(q.media) && q.media[0]?.url) {
    const m = q.media[0];
    return {
      type: m.type,
      url: m.url,
      thumbnail_url: m.thumbnail_url,
      meta: m.meta,
    };
  }

  return null;
}

// Component to display media in preview
function QuestionMediaPreview({ media }: { media: MediaAsset | null }) {
  if (!media || !media.url) return null;

  const mediaType = (media.type || "").toUpperCase();

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 mb-2">
      {mediaType === "IMAGE" && (
        <img
          src={media.url}
          alt={media.meta?.originalname || "Question image"}
          className="max-w-full max-h-[300px] object-contain mx-auto"
        />
      )}
      {mediaType === "VIDEO" && (
        <video
          src={media.url}
          controls
          className="max-w-full max-h-[300px] mx-auto"
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

// Smaller component for option media preview
function OptionMediaPreview({
  media,
}: {
  media: OptionMediaAsset | null | undefined;
}) {
  if (!media || !media.url) return null;

  const mediaType = (media.type || "").toUpperCase();

  return (
    <div className="mt-1 rounded-md overflow-hidden border border-slate-200 bg-slate-50 max-w-[200px]">
      {mediaType === "IMAGE" && (
        <img
          src={media.url}
          alt={media.meta?.originalname || "Option image"}
          className="max-w-full max-h-[100px] object-contain mx-auto"
        />
      )}
      {mediaType === "VIDEO" && (
        <video
          src={media.url}
          controls
          className="max-w-full max-h-[100px] mx-auto"
        />
      )}
      {mediaType === "AUDIO" && (
        <div className="p-2">
          <audio src={media.url} controls className="w-full h-8" />
        </div>
      )}
    </div>
  );
}

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
  if (k === "multiplechoicegrid" || k === "mcqgrid" || k === "gridradio")
    return "multi-choice grid";
  if (k === "checkboxesgrid" || k === "gridcheckbox") return "checkbox grid";
  if (k === "date") return "date";
  if (k === "time") return "time";
  if (k === "number") return "number";
  if (k === "nps" || k === "netpromoterscore") return "nps";
  if (k === "ranking") return "ranking";
  return null;
}

function inferFromOptions(q: ApiQuestion): GKind | null {
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

function extractScaleSpec(q: ApiQuestion) {
  const opt = q.options?.[0];
  const min = opt?.rangeFrom ?? 1;
  const max = opt?.rangeTo ?? 5;
  const fromLabel = opt?.fromLabel ?? "";
  const toLabel = opt?.toLabel ?? "";
  return { min, max, fromLabel, toLabel };
}

function toText(
  x: string | GridLabel | { text?: string | null } | null | undefined,
  fallback: string
): string {
  if (!x) return fallback;
  if (typeof x === "string") return x || fallback;
  // handles GridLabel and {text}
  // @ts-ignore
  return (x.text ?? "") || fallback;
}

function extractGrid(q: ApiQuestion): {
  rows: { id: string; text: string }[];
  cols: { id: string; text: string }[];
} {
  // 1) NEW: Preferred - from question-level rowOptions/columnOptions
  if (
    Array.isArray(q.rowOptions) &&
    Array.isArray(q.columnOptions) &&
    q.rowOptions.length &&
    q.columnOptions.length
  ) {
    const rows = q.rowOptions.map((r, i) => ({
      id: r.id ?? `r-${i}`,
      text: toText(r, `Row ${i + 1}`),
    }));
    const cols = q.columnOptions.map((c, j) => ({
      id: c.id ?? `c-${j}`,
      text: toText(c, `Column ${j + 1}`),
    }));
    return { rows, cols };
  }

  // 2) LEGACY: from options[0].rowOptions/columnOptions (old API shape)
  const first = q.options?.[0];
  if (
    first &&
    Array.isArray(first.rowOptions) &&
    Array.isArray(first.columnOptions)
  ) {
    const rows = first.rowOptions.map((r, i) => ({
      id: r.id ?? `r-${i}`,
      text: toText(r, `Row ${i + 1}`),
    }));
    const cols = first.columnOptions.map((c, j) => ({
      id: c.id ?? `c-${j}`,
      text: toText(c, `Column ${j + 1}`),
    }));
    return { rows, cols };
  }

  // 3) Next: explicit rows/columns props
  if (
    Array.isArray(q.rows) &&
    Array.isArray(q.columns) &&
    q.rows.length &&
    q.columns.length
  ) {
    const rows = q.rows.map((r, i) => ({
      id: typeof r === "string" ? `r-${i}` : r.id ?? `r-${i}`,
      text: toText(r as any, `Row ${i + 1}`),
    }));
    const cols = q.columns.map((c, j) => ({
      id: typeof c === "string" ? `c-${j}` : c.id ?? `c-${j}`,
      text: toText(c as any, `Column ${j + 1}`),
    }));
    return { rows, cols };
  }

  // 4) Fallback: derive from pair IDs
  const rowMap = new Map<string, string>();
  const colMap = new Map<string, string>();
  (q.options ?? []).forEach((o, idx) => {
    const rId = o.rowQuestionOptionId ?? `r-${idx}`;
    const cId = o.columnQuestionOptionId ?? `c-${idx}`;
    if (!rowMap.has(rId)) rowMap.set(rId, `Row ${rowMap.size + 1}`);
    if (!colMap.has(cId)) colMap.set(cId, `Column ${colMap.size + 1}`);
  });

  const rows = Array.from(rowMap.entries()).map(([id, text]) => ({ id, text }));
  const cols = Array.from(colMap.entries()).map(([id, text]) => ({ id, text }));
  return { rows, cols };
}

function useKindsByCategory(
  categoryIds: string[],
  providedKinds?: KindsMap,
  fetchKinds?: (ids: string[]) => Promise<KindsMap>
) {
  const [map, setMap] = useState<KindsMap>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setErr(null);

      if (providedKinds && categoryIds.every((id) => !!providedKinds[id])) {
        setMap(providedKinds);
        return;
      }

      const need = categoryIds.filter((id) => !providedKinds?.[id]);
      if (need.length === 0) {
        setMap(providedKinds ?? {});
        return;
      }

      setLoading(true);
      try {
        let result: KindsMap = {};

        if (fetchKinds) {
          result = await fetchKinds(need);
        } else {
          const url = `/api/categories/kinds?ids=${encodeURIComponent(
            need.join(",")
          )}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to load kinds: ${res.status}`);
          const json = await res.json();
          const arr = Array.isArray(json?.data) ? json.data : [];
          result = arr.reduce((acc: KindsMap, item: any) => {
            const nk = normKindStr(item?.kind ?? "") ?? "short answer";
            acc[item.id] = nk;
            return acc;
          }, {});
        }

        const merged: KindsMap = { ...(providedKinds ?? {}), ...result };
        if (!cancelled) setMap(merged);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load kinds");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (categoryIds.length > 0) {
      run();
    } else {
      setMap(providedKinds ?? {});
      setErr(null);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [categoryIds.join(","), fetchKinds, providedKinds]);

  return { kindsMap: map, loading, error: err };
}

function normalizeKindFromMap(q: ApiQuestion, kindsMap: KindsMap): GKind {
  const byCat = q.categoryId ? kindsMap[q.categoryId] : undefined;
  if (byCat) return byCat;

  const inferred = inferFromOptions(q);
  if (inferred) return inferred;

  return "short answer";
}

export default function SurveyPreview({
  title,
  description,
  questions,
  kindsByCategoryId,
  fetchKinds,
}: {
  title: string;
  description?: string;
  questions: ApiQuestion[];
  kindsByCategoryId?: KindsMap;
  fetchKinds?: (ids: string[]) => Promise<KindsMap>;
}) {
  const list = Array.isArray(questions) ? questions : [];
  // console.log("questions is", questions);

  const categoryIds = useMemo(() => {
    const set = new Set<string>();
    list.forEach((q) => {
      if (q.categoryId) set.add(q.categoryId);
    });
    return Array.from(set);
  }, [list]);

  const { kindsMap, loading, error } = useKindsByCategory(
    categoryIds,
    kindsByCategoryId,
    fetchKinds
  );

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description ? (
          <p className="text-sm text-slate-500">{description}</p>
        ) : null}
        <p className="text-xs text-slate-400">
          This is a preview — inputs are disabled.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading && (
          <p className="text-sm text-slate-500">Loading question types…</p>
        )}
        {error && (
          <p className="text-sm text-rose-600">
            Failed to load question types. Showing inferred previews.
          </p>
        )}
        {!loading && list.length === 0 && (
          <p className="text-sm text-slate-500">No questions to preview yet.</p>
        )}

        {list.map((q, idx) => {
          const kind = normalizeKindFromMap(q, kindsMap);
          const label = q.question_text || "Untitled question";
          const opts = Array.isArray(q.options) ? q.options : [];

          return (
            <div key={q.id} className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-800">
                  {idx + 1}. {label}
                </span>
                {q.required ? (
                  <span className="mt-0.5 text-[10px] uppercase tracking-wide text-rose-600">
                    Required
                  </span>
                ) : null}
              </div>

              {/* Display attached media */}
              <QuestionMediaPreview media={getQuestionMedia(q)} />

              {/* short answer */}
              {kind === "short answer" && (
                <Input placeholder="Short answer text" disabled />
              )}

              {/* paragraph */}
              {kind === "paragraph" && (
                <Textarea
                  placeholder="Long answer text"
                  className="resize-none"
                  disabled
                />
              )}

              {/* multiple choice */}
              {kind === "multiple choice" && (
                <RadioGroup className="space-y-3">
                  {(opts.length
                    ? opts.filter((o) => (o.text ?? "").trim().length > 0)
                    : []
                  ).map((o, i) => {
                    const id = `${q.id}-mc-${o.id ?? i}`;
                    return (
                      <div key={id}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem id={id} value={String(i)} disabled />
                          <Label htmlFor={id} className="text-slate-700">
                            {o.text}
                          </Label>
                        </div>
                        <OptionMediaPreview media={o.mediaAsset} />
                      </div>
                    );
                  })}
                  {opts.length === 0 && (
                    <>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          id={`${q.id}-mc-ph-1`}
                          value="1"
                          disabled
                        />
                        <Label
                          htmlFor={`${q.id}-mc-ph-1`}
                          className="text-slate-700"
                        >
                          Option 1
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          id={`${q.id}-mc-ph-2`}
                          value="2"
                          disabled
                        />
                        <Label
                          htmlFor={`${q.id}-mc-ph-2`}
                          className="text-slate-700"
                        >
                          Option 2
                        </Label>
                      </div>
                    </>
                  )}
                </RadioGroup>
              )}

              {/* checkboxes */}
              {kind === "checkbox grid" && (
                <div className="overflow-x-auto">
                  {(() => {
                    const { rows, cols } = extractGrid(q);
                    return (
                      <table className="min-w-[480px] border-collapse text-sm">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-slate-500 font-medium">
                              {" "}
                            </th>
                            {cols.map((c) => (
                              <th
                                key={c.id}
                                className="px-3 py-2 text-slate-700 font-medium"
                              >
                                {c.text}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.id} className="border-t">
                              <td className="px-3 py-2 text-slate-700">
                                {r.text}
                              </td>
                              {cols.map((c) => {
                                const id = `${q.id}-grid-cb-${r.id}-${c.id}`;
                                return (
                                  <td key={id} className="px-3 py-2">
                                    <div className="flex items-center justify-center">
                                      <Checkbox id={id} disabled />
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {/* multi-choice grid */}
              {kind === "multi-choice grid" && (
                <div className="overflow-x-auto">
                  {(() => {
                    const { rows, cols } = extractGrid(q);
                    return (
                      <table className="min-w-[480px] border-collapse text-sm">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-slate-500 font-medium">
                              {" "}
                            </th>
                            {cols.map((c) => (
                              <th
                                key={c.id}
                                className="px-3 py-2 text-slate-700 font-medium"
                              >
                                {c.text}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.id} className="border-t">
                              <td className="px-3 py-2 text-slate-700">
                                {r.text}
                              </td>
                              {/* One RadioGroup per row, with items displayed in a CSS grid to align under headers */}
                              <td colSpan={cols.length} className="px-3 py-2">
                                <RadioGroup
                                  className="grid"
                                  style={{
                                    gridTemplateColumns: `repeat(${cols.length}, minmax(64px, 1fr))`,
                                    gap: "0.5rem",
                                  }}
                                >
                                  {cols.map((c) => {
                                    const id = `${q.id}-grid-mc-${r.id}-${c.id}`;
                                    return (
                                      <div
                                        key={id}
                                        className="flex items-center justify-center"
                                      >
                                        <RadioGroupItem
                                          id={id}
                                          value={c.id}
                                          disabled
                                        />
                                      </div>
                                    );
                                  })}
                                </RadioGroup>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {/* dropdown */}
              {kind === "dropdown" && (
                <div className="w-72">
                  <Select disabled defaultValue={undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {(opts.length
                        ? opts.filter((o) => (o.text ?? "").trim().length > 0)
                        : []
                      ).map((o, i) => (
                        <SelectItem
                          key={`${q.id}-dd-${o.id ?? i}`}
                          value={String(o.id ?? i)}
                        >
                          {o.text}
                        </SelectItem>
                      ))}
                      {opts.length === 0 && (
                        <>
                          <SelectItem value="1">Option 1</SelectItem>
                          <SelectItem value="2">Option 2</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* linear scale */}
              {kind === "linear scale" && (
                <div className="space-y-2">
                  {(() => {
                    const { min, max, fromLabel, toLabel } =
                      extractScaleSpec(q);
                    return (
                      <>
                        <RadioGroup className="flex items-center gap-3 flex-wrap">
                          {Array.from({
                            length: Math.max(1, max - min + 1),
                          }).map((_, i) => {
                            const value = min + i;
                            const id = `${q.id}-ls-${value}`;
                            return (
                              <div
                                className="flex items-center space-x-1"
                                key={id}
                              >
                                <RadioGroupItem
                                  value={String(value)}
                                  id={id}
                                  disabled
                                />
                                <Label htmlFor={id} className="text-slate-700">
                                  {value}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                        {(fromLabel || toLabel) && (
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>{fromLabel}</span>
                            <span>{toLabel}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* rating */}
              {kind === "rating" && (
                <div className="space-y-1">
                  {(() => {
                    const { min, max } = extractScaleSpec(q);
                    const count = Math.max(1, max - min + 1);
                    return (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: count }).map((_, i) => (
                          <Star
                            key={`${q.id}-star-${i}`}
                            className="h-5 w-5 text-amber-400 opacity-60"
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* basic checkboxes (non-grid) */}
              {kind === "checkboxes" && (
                <div className="space-y-3">
                  {(opts.length
                    ? opts.filter((o) => (o.text ?? "").trim().length > 0)
                    : []
                  ).map((o, i) => {
                    const id = `${q.id}-cb-${o.id ?? i}`;
                    return (
                      <div key={id}>
                        <div className="flex items-center space-x-2">
                          <Checkbox id={id} disabled />
                          <Label htmlFor={id} className="text-slate-700">
                            {o.text}
                          </Label>
                        </div>
                        <OptionMediaPreview media={o.mediaAsset} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* date/time */}
              {kind === "date" && <Input type="date" disabled />}
              {kind === "time" && <Input type="time" disabled />}

              {/* number */}
              {kind === "number" && (
                <Input type="number" placeholder="Enter a number" disabled />
              )}

              {/* nps */}
              {kind === "nps" && (
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 11 }, (_, i) => i).map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled
                        className="min-w-[48px] px-3 py-2 border rounded hover:bg-slate-100 disabled:opacity-50"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Not at all likely</span>
                    <span>Extremely likely</span>
                  </div>
                </div>
              )}

              {/* ranking (UPDATED – real interactive preview, disabled) */}
              {kind === "ranking" && (
                <div className="pointer-events-none opacity-90">
                  <RankingQuestion
                    question={{
                      ...q,
                      options: opts.map((o) => ({
                        id: o.id!,
                        text: o.text ?? "",
                        mediaAsset: o.mediaAsset ?? null,
                      })),
                    }}
                    answer={[]}
                    onChange={() => {}}
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Star } from "lucide-react";

// type ApiOption = {
//   id: string;
//   text: string | null;
//   mediaId: string | null;
//   questionId: string;
//   rowQuestionOptionId: string | null;
//   columnQuestionOptionId: string | null;
//   rangeFrom: number | null;
//   rangeTo: number | null;
//   fromLabel: string | null;
//   toLabel: string | null;
//   icon: string | null;
// };

// type GridLabel = { id?: string; text: string };

// type ApiQuestion = {
//   id: string;
//   question_text: string;
//   question_type?: string;
//   options: ApiOption[];
//   required: boolean;
//   categoryId?: string;
//   order_index?: number;

//   // Optional grid descriptors if present
//   rows?: (GridLabel | string)[];
//   columns?: (GridLabel | string)[];
//   allowMultipleInGrid?: boolean;
// };

// type GKind =
//   | "short answer"
//   | "paragraph"
//   | "multiple choice"
//   | "checkboxes"
//   | "dropdown"
//   | "linear scale"
//   | "rating"
//   | "multi-choice grid"
//   | "checkbox grid"
//   | "date"
//   | "time";

// type KindsMap = Record<string, GKind>;

// function normKindStr(s?: string): GKind | null {
//   if (!s) return null;
//   const k = s.toLowerCase().replace(/[\s_-]+/g, "");
//   if (k === "shortanswer") return "short answer";
//   if (k === "paragraph") return "paragraph";
//   if (k === "multiplechoice" || k === "mcq") return "multiple choice";
//   if (k === "checkboxes" || k === "checkbox") return "checkboxes";
//   if (k === "dropdown" || k === "select") return "dropdown";
//   if (k === "linearscale" || k === "scale" || k === "likert")
//     return "linear scale";
//   if (k === "rating" || k === "stars") return "rating";
//   if (k === "multiplechoicegrid" || k === "mcqgrid" || k === "gridradio")
//     return "multi-choice grid";
//   if (k === "checkboxesgrid" || k === "gridcheckbox") return "checkbox grid";
//   if (k === "date") return "date";
//   if (k === "time") return "time";
//   return null;
// }

// function inferFromOptions(q: ApiQuestion): GKind | null {
//   const opts = q.options ?? [];

//   // Grid if options carry row/column pair references
//   const hasGridPairs = opts.some(
//     (o) => o.rowQuestionOptionId || o.columnQuestionOptionId
//   );
//   if (hasGridPairs) {
//     return q.allowMultipleInGrid ? "checkbox grid" : "multi-choice grid";
//   }

//   // Linear scale via a single option range
//   if (
//     opts.length === 1 &&
//     opts[0]?.rangeFrom != null &&
//     opts[0]?.rangeTo != null
//   ) {
//     return opts[0]?.icon?.toLowerCase() === "star" ? "rating" : "linear scale";
//   }

//   // Textual options => multiple choice by default
//   if (opts.some((o) => (o.text ?? "").trim().length > 0)) {
//     return "multiple choice";
//   }

//   // Map some legacy question_type values if present
//   const t = (q.question_type ?? "").toLowerCase().replace(/[\s_-]+/g, "");
//   if (t === "text") return "short answer";
//   if (t === "longtext") return "paragraph";
//   if (t === "dropdown") return "dropdown";

//   return null;
// }

// function extractScaleSpec(q: ApiQuestion) {
//   const opt = q.options?.[0];
//   const min = opt?.rangeFrom ?? 1;
//   const max = opt?.rangeTo ?? 5;
//   const fromLabel = opt?.fromLabel ?? "";
//   const toLabel = opt?.toLabel ?? "";
//   return { min, max, fromLabel, toLabel };
// }

// function toText(
//   x: string | GridLabel | null | undefined,
//   fallback: string
// ): string {
//   if (!x) return fallback;
//   if (typeof x === "string") return x || fallback;
//   return x.text || fallback;
// }

// function extractGrid(q: ApiQuestion): {
//   rows: { id: string; text: string }[];
//   cols: { id: string; text: string }[];
// } {
//   // Prefer explicit rows/columns if supplied
//   if (
//     Array.isArray(q.rows) &&
//     Array.isArray(q.columns) &&
//     q.rows.length &&
//     q.columns.length
//   ) {
//     const rows = q.rows.map((r, i) => ({
//       id: typeof r === "string" ? `r-${i}` : r.id ?? `r-${i}`,
//       text: toText(r as any, `Row ${i + 1}`),
//     }));
//     const cols = q.columns.map((c, j) => ({
//       id: typeof c === "string" ? `c-${j}` : c.id ?? `c-${j}`,
//       text: toText(c as any, `Column ${j + 1}`),
//     }));
//     return { rows, cols };
//   }

//   // Derive rows/cols from option pairs
//   const rowMap = new Map<string, string>();
//   const colMap = new Map<string, string>();
//   (q.options ?? []).forEach((o, idx) => {
//     const rId = o.rowQuestionOptionId ?? `r-${idx}`;
//     const cId = o.columnQuestionOptionId ?? `c-${idx}`;
//     if (!rowMap.has(rId)) rowMap.set(rId, `Row ${rowMap.size + 1}`);
//     if (!colMap.has(cId)) colMap.set(cId, `Column ${colMap.size + 1}`);
//   });

//   const rows = Array.from(rowMap.entries()).map(([id, text]) => ({ id, text }));
//   const cols = Array.from(colMap.entries()).map(([id, text]) => ({ id, text }));
//   return { rows, cols };
// }

// /**
//  * Hook to resolve kinds map by category IDs.
//  * Priority:
//  * 1) providedKinds (prop)
//  * 2) fetchKinds resolver (prop)
//  * 3) default GET /api/categories/kinds?ids=...
//  */
// function useKindsByCategory(
//   categoryIds: string[],
//   providedKinds?: KindsMap,
//   fetchKinds?: (ids: string[]) => Promise<KindsMap>
// ) {
//   const [map, setMap] = useState<KindsMap>({});
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   useEffect(() => {
//     let cancelled = false;

//     async function run() {
//       setErr(null);

//       // If a full map is provided and covers all IDs, use it
//       if (providedKinds && categoryIds.every((id) => !!providedKinds[id])) {
//         setMap(providedKinds);
//         return;
//       }

//       const need = categoryIds.filter((id) => !providedKinds?.[id]);
//       if (need.length === 0) {
//         setMap(providedKinds ?? {});
//         return;
//       }

//       setLoading(true);
//       try {
//         let result: KindsMap = {};

//         if (fetchKinds) {
//           result = await fetchKinds(need);
//         } else {
//           // Default REST fallback: expects { data: { id: string; kind: string }[] }
//           const url = `/api/categories/kinds?ids=${encodeURIComponent(
//             need.join(",")
//           )}`;
//           const res = await fetch(url);
//           if (!res.ok) throw new Error(`Failed to load kinds: ${res.status}`);
//           const json = await res.json();
//           const arr = Array.isArray(json?.data) ? json.data : [];
//           result = arr.reduce((acc: KindsMap, item: any) => {
//             const nk = normKindStr(item?.kind ?? "") ?? "short answer";
//             acc[item.id] = nk;
//             return acc;
//           }, {});
//         }

//         // Merge with any providedKinds
//         const merged: KindsMap = { ...(providedKinds ?? {}), ...result };
//         if (!cancelled) setMap(merged);
//       } catch (e: any) {
//         if (!cancelled) setErr(e?.message ?? "Failed to load kinds");
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     if (categoryIds.length > 0) {
//       run();
//     } else {
//       setMap(providedKinds ?? {});
//       setErr(null);
//       setLoading(false);
//     }

//     return () => {
//       cancelled = true;
//     };
//   }, [categoryIds.join(","), fetchKinds, providedKinds]);

//   return { kindsMap: map, loading, error: err };
// }

// function normalizeKindFromMap(q: ApiQuestion, kindsMap: KindsMap): GKind {
//   // 1) DB-provided kind by categoryId
//   const byCat = q.categoryId ? kindsMap[q.categoryId] : undefined;
//   if (byCat) return byCat;

//   // 2) Infer from structure when DB doesn’t specify
//   const inferred = inferFromOptions(q);
//   if (inferred) return inferred;

//   // 3) Fallback
//   return "short answer";
// }

// export default function SurveyPreview({
//   title,
//   description,
//   questions,
//   kindsByCategoryId, // optional: ready map from parent
//   fetchKinds, // optional: resolver to fetch kinds by category IDs
// }: {
//   title: string;
//   description?: string;
//   questions: ApiQuestion[];
//   kindsByCategoryId?: KindsMap;
//   fetchKinds?: (ids: string[]) => Promise<KindsMap>;
// }) {
//   const list = Array.isArray(questions) ? questions : [];

//   const categoryIds = useMemo(() => {
//     const set = new Set<string>();
//     list.forEach((q) => {
//       if (q.categoryId) set.add(q.categoryId);
//     });
//     return Array.from(set);
//   }, [list]);

//   const { kindsMap, loading, error } = useKindsByCategory(
//     categoryIds,
//     kindsByCategoryId,
//     fetchKinds
//   );

//   return (
//     <Card className="border-slate-200">
//       <CardHeader>
//         <CardTitle className="text-xl">{title}</CardTitle>
//         {description ? (
//           <p className="text-sm text-slate-500">{description}</p>
//         ) : null}
//         <p className="text-xs text-slate-400">
//           This is a preview — inputs are disabled.
//         </p>
//       </CardHeader>

//       <CardContent className="space-y-6">
//         {loading && (
//           <p className="text-sm text-slate-500">Loading question types…</p>
//         )}

//         {error && (
//           <p className="text-sm text-rose-600">
//             Failed to load question types. Showing inferred previews.
//           </p>
//         )}

//         {!loading && list.length === 0 && (
//           <p className="text-sm text-slate-500">No questions to preview yet.</p>
//         )}

//         {list.map((q, idx) => {
//           const kind = normalizeKindFromMap(q, kindsMap);
//           const label = q.question_text || "Untitled question";
//           const opts = Array.isArray(q.options) ? q.options : [];

//           return (
//             <div key={q.id} className="space-y-3">
//               <div className="flex items-start gap-2">
//                 <span className="font-medium text-slate-800">
//                   {idx + 1}. {label}
//                 </span>
//                 {q.required ? (
//                   <span className="mt-0.5 text-[10px] uppercase tracking-wide text-rose-600">
//                     Required
//                   </span>
//                 ) : null}
//               </div>

//               {/* short answer */}
//               {kind === "short answer" && (
//                 <Input placeholder="Short answer text" disabled />
//               )}

//               {/* paragraph */}
//               {kind === "paragraph" && (
//                 <Textarea
//                   placeholder="Long answer text"
//                   className="resize-none"
//                   disabled
//                 />
//               )}

//               {/* multiple choice (radio) */}
//               {kind === "multiple choice" && (
//                 <RadioGroup className="space-y-2">
//                   {(opts.length
//                     ? opts.filter((o) => (o.text ?? "").trim().length > 0)
//                     : []
//                   ).map((o, i) => {
//                     const id = `${q.id}-mc-${o.id ?? i}`;
//                     return (
//                       <div className="flex items-center space-x-2" key={id}>
//                         <RadioGroupItem id={id} value={String(i)} disabled />
//                         <Label htmlFor={id} className="text-slate-700">
//                           {o.text}
//                         </Label>
//                       </div>
//                     );
//                   })}
//                   {opts.length === 0 && (
//                     <>
//                       <div className="flex items-center space-x-2">
//                         <RadioGroupItem
//                           id={`${q.id}-mc-ph-1`}
//                           value="1"
//                           disabled
//                         />
//                         <Label
//                           htmlFor={`${q.id}-mc-ph-1`}
//                           className="text-slate-700"
//                         >
//                           Option 1
//                         </Label>
//                       </div>
//                       <div className="flex items-center space-x-2">
//                         <RadioGroupItem
//                           id={`${q.id}-mc-ph-2`}
//                           value="2"
//                           disabled
//                         />
//                         <Label
//                           htmlFor={`${q.id}-mc-ph-2`}
//                           className="text-slate-700"
//                         >
//                           Option 2
//                         </Label>
//                       </div>
//                     </>
//                   )}
//                 </RadioGroup>
//               )}

//               {/* checkboxes */}
//               {kind === "checkboxes" && (
//                 <div className="space-y-2">
//                   {(opts.length
//                     ? opts.filter((o) => (o.text ?? "").trim().length > 0)
//                     : []
//                   ).map((o, i) => {
//                     const id = `${q.id}-cb-${o.id ?? i}`;
//                     return (
//                       <div className="flex items-center space-x-2" key={id}>
//                         <Checkbox id={id} disabled />
//                         <Label htmlFor={id} className="text-slate-700">
//                           {o.text}
//                         </Label>
//                       </div>
//                     );
//                   })}
//                   {opts.length === 0 && (
//                     <>
//                       <div className="flex items-center space-x-2">
//                         <Checkbox id={`${q.id}-cb-ph-1`} disabled />
//                         <Label
//                           htmlFor={`${q.id}-cb-ph-1`}
//                           className="text-slate-700"
//                         >
//                           Option A
//                         </Label>
//                       </div>
//                       <div className="flex items-center space-x-2">
//                         <Checkbox id={`${q.id}-cb-ph-2`} disabled />
//                         <Label
//                           htmlFor={`${q.id}-cb-ph-2`}
//                           className="text-slate-700"
//                         >
//                           Option B
//                         </Label>
//                       </div>
//                     </>
//                   )}
//                 </div>
//               )}

//               {/* dropdown */}
//               {kind === "dropdown" && (
//                 <div className="w-72">
//                   <Select disabled defaultValue={undefined}>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Choose an option" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {(opts.length
//                         ? opts.filter((o) => (o.text ?? "").trim().length > 0)
//                         : []
//                       ).map((o, i) => (
//                         <SelectItem
//                           key={`${q.id}-dd-${o.id ?? i}`}
//                           value={String(o.id ?? i)}
//                         >
//                           {o.text}
//                         </SelectItem>
//                       ))}
//                       {opts.length === 0 && (
//                         <>
//                           <SelectItem value="1">Option 1</SelectItem>
//                           <SelectItem value="2">Option 2</SelectItem>
//                         </>
//                       )}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               )}

//               {/* linear scale */}
//               {kind === "linear scale" && (
//                 <div className="space-y-2">
//                   {(() => {
//                     const { min, max, fromLabel, toLabel } =
//                       extractScaleSpec(q);
//                     return (
//                       <>
//                         <RadioGroup className="flex items-center gap-3 flex-wrap">
//                           {Array.from({
//                             length: Math.max(1, max - min + 1),
//                           }).map((_, i) => {
//                             const value = min + i;
//                             const id = `${q.id}-ls-${value}`;
//                             return (
//                               <div
//                                 className="flex items-center space-x-1"
//                                 key={id}
//                               >
//                                 <RadioGroupItem
//                                   value={String(value)}
//                                   id={id}
//                                   disabled
//                                 />
//                                 <Label htmlFor={id} className="text-slate-700">
//                                   {value}
//                                 </Label>
//                               </div>
//                             );
//                           })}
//                         </RadioGroup>
//                         {(fromLabel || toLabel) && (
//                           <div className="flex justify-between text-xs text-slate-500">
//                             <span>{fromLabel}</span>
//                             <span>{toLabel}</span>
//                           </div>
//                         )}
//                       </>
//                     );
//                   })()}
//                 </div>
//               )}

//               {/* rating (stars) */}
//               {kind === "rating" && (
//                 <div className="space-y-1">
//                   {(() => {
//                     const { min, max } = extractScaleSpec(q);
//                     const count = Math.max(1, max - min + 1);
//                     return (
//                       <div className="flex items-center gap-1">
//                         {Array.from({ length: count }).map((_, i) => (
//                           <Star
//                             key={`${q.id}-star-${i}`}
//                             className="h-5 w-5 text-amber-400 opacity-60"
//                           />
//                         ))}
//                       </div>
//                     );
//                   })()}
//                 </div>
//               )}

//               {/* multiple choice grid (radio per row) */}
//               {kind === "multi-choice grid" && (
//                 <div className="overflow-x-auto">
//                   {(() => {
//                     const { rows, cols } = extractGrid(q);
//                     return (
//                       <table className="min-w-[480px] border-collapse text-sm">
//                         <thead>
//                           <tr>
//                             <th className="px-3 py-2 text-left text-slate-500 font-medium">
//                               {" "}
//                             </th>
//                             {cols.map((c) => (
//                               <th
//                                 key={c.id}
//                                 className="px-3 py-2 text-slate-700 font-medium"
//                               >
//                                 {c.text}
//                               </th>
//                             ))}
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {rows.map((r) => (
//                             <tr key={r.id} className="border-t">
//                               <td className="px-3 py-2 text-slate-700">
//                                 {r.text}
//                               </td>
//                               <td colSpan={cols.length} className="px-3 py-2">
//                                 <RadioGroup
//                                   className="grid"
//                                   style={{
//                                     gridTemplateColumns: `repeat(${cols.length}, minmax(64px, 1fr))`,
//                                     gap: "0.5rem",
//                                   }}
//                                 >
//                                   {cols.map((c) => {
//                                     const id = `${q.id}-grid-mc-${r.id}-${c.id}`;
//                                     return (
//                                       <div
//                                         key={id}
//                                         className="flex items-center justify-center"
//                                       >
//                                         <RadioGroupItem
//                                           id={id}
//                                           value={c.id}
//                                           disabled
//                                         />
//                                       </div>
//                                     );
//                                   })}
//                                 </RadioGroup>
//                               </td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     );
//                   })()}
//                 </div>
//               )}

//               {/* checkboxes grid */}
//               {kind === "checkbox grid" && (
//                 <div className="overflow-x-auto">
//                   {(() => {
//                     const { rows, cols } = extractGrid(q);
//                     return (
//                       <table className="min-w-[480px] border-collapse text-sm">
//                         <thead>
//                           <tr>
//                             <th className="px-3 py-2 text-left text-slate-500 font-medium">
//                               {" "}
//                             </th>
//                             {cols.map((c) => (
//                               <th
//                                 key={c.id}
//                                 className="px-3 py-2 text-slate-700 font-medium"
//                               >
//                                 {c.text}
//                               </th>
//                             ))}
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {rows.map((r) => (
//                             <tr key={r.id} className="border-t">
//                               <td className="px-3 py-2 text-slate-700">
//                                 {r.text}
//                               </td>
//                               {cols.map((c) => {
//                                 const id = `${q.id}-grid-cb-${r.id}-${c.id}`;
//                                 return (
//                                   <td key={id} className="px-3 py-2">
//                                     <div className="flex items-center justify-center">
//                                       <Checkbox id={id} disabled />
//                                     </div>
//                                   </td>
//                                 );
//                               })}
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     );
//                   })()}
//                 </div>
//               )}

//               {/* date */}
//               {kind === "date" && <Input type="date" disabled />}

//               {/* time */}
//               {kind === "time" && <Input type="time" disabled />}
//             </div>
//           );
//         })}
//       </CardContent>
//     </Card>
//   );
// }
