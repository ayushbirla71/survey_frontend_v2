"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  Plus,
  GripVertical,
  Copy,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useApi } from "@/hooks/useApi";
import { apiWithFallback, categoriesApi, demoData } from "@/lib/api";

type QuestionType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";

interface MediaPreview {
  type: QuestionType;
  url: string;
  thumbnail_url?: string;
  mediaId?: string | null;
}

interface GridOptionText {
  text: string;
  mediaId?: string | null;
}

interface OptionPayload {
  id?: string;
  text?: string;
  mediaId?: string | null;
  // scale
  rangeFrom?: number | null;
  rangeTo?: number | null;
  fromLabel?: string | null;
  toLabel?: string | null;
  icon?: string | null;
  // grid
  rowOptions?: GridOptionText[];
  columnOptions?: GridOptionText[];
}

export interface QuestionVM {
  id: string;
  surveyId: string;
  question_type: QuestionType; // auto from media
  question_text: string;
  order_index: number;
  required: boolean;
  categoryId?: string;
  options: OptionPayload[]; // conforms to controller
  rowOptions?: GridOptionText[];
  columnOptions?: GridOptionText[];
  media?: MediaPreview[]; // preview only
  mediaId?: string | null; // backend id if uploaded
}

interface QuestionEditorProps {
  questions: QuestionVM[];
  onQuestionsUpdate: (questions: QuestionVM[]) => void;
  survey: { id: string };
}

const CATEGORY = {
  SHORT_ANSWER: "short answer",
  PARAGRAPH: "paragraph",
  MULTIPLE_CHOICE: "multiple choice",
  CHECKBOXES: "checkboxes",
  DROPDOWN: "dropdown",
  LINEAR_SCALE: "linear scale",
  RATING: "rating",
  MULTI_CHOICE_GRID: "multi-choice grid",
  CHECKBOX_GRID: "checkbox grid",
} as const;

const isTextEntry = (n: string) =>
  [CATEGORY.SHORT_ANSWER, CATEGORY.PARAGRAPH].includes(n.toLowerCase());

const isOptionsCat = (n: string) =>
  [CATEGORY.MULTIPLE_CHOICE, CATEGORY.CHECKBOXES, CATEGORY.DROPDOWN].includes(
    n.toLowerCase()
  );

const isScaleCat = (n: string) =>
  [CATEGORY.LINEAR_SCALE, CATEGORY.RATING].includes(n.toLowerCase());

const isGridCat = (n: string) =>
  [CATEGORY.MULTI_CHOICE_GRID, CATEGORY.CHECKBOX_GRID].includes(
    n.toLowerCase()
  );

const detectQuestionTypeFromFile = (file: File): QuestionType => {
  const t = file.type.toLowerCase();
  if (t.startsWith("image/")) return "IMAGE";
  if (t.startsWith("video/")) return "VIDEO";
  if (t.startsWith("audio/")) return "AUDIO";
  return "TEXT";
};

export default function EnhancedQuestionEditor({
  questions,
  onQuestionsUpdate,
  survey,
}: QuestionEditorProps) {
  console.log("^^^^^ Questions is", questions);
  const [focusedQuestion, setFocusedQuestion] = useState<string | null>(null);

  const { data: questionCategories } = useApi(() =>
    apiWithFallback(
      () => categoriesApi.getQuestionCategories(),
      demoData.question_categories
    )
  );

  const categories = questionCategories || demoData.question_categories;

  const byId = useMemo(
    () => new Map(questions.map((q) => [q.id, q] as const)),
    [questions]
  );

  const reindex = (items: QuestionVM[]) =>
    items.map((q, i) => ({ ...q, order_index: i }));

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "";
    const c = (categories as any[])?.find((cat) => cat.id === categoryId);
    return c ? String(c.type_name).trim() : String(categoryId);
  };

  const handleQuestionChange = <K extends keyof QuestionVM>(
    id: string,
    field: K,
    value: QuestionVM[K]
  ) => {
    const updated = questions.map((q) => {
      if (q.id !== id) return q;

      if (field === "categoryId") {
        const next = { ...q, [field]: value } as QuestionVM;
        const catName = getCategoryName(String(value)).toLowerCase();

        if (isOptionsCat(catName)) {
          next.options = q.options?.length ? q.options : [];
        } else if (isScaleCat(catName)) {
          const current = q.options?.[0] || {};
          next.options = [
            {
              rangeFrom: (current as any).rangeFrom ?? 1,
              rangeTo: (current as any).rangeTo ?? 5,
              fromLabel: (current as any).fromLabel ?? null,
              toLabel: (current as any).toLabel ?? null,
              icon: (current as any).icon ?? null,
            },
          ];
        } else if (isGridCat(catName)) {
          const current = q.options?.[0] || {};
          next.options = [
            {
              rowOptions: Array.isArray((current as any).rowOptions)
                ? (current as any).rowOptions
                : [],
              columnOptions: Array.isArray((current as any).columnOptions)
                ? (current as any).columnOptions
                : [],
            },
          ];
        } else {
          next.options = [];
        }
        return next;
      }

      return { ...q, [field]: value };
    });

    onQuestionsUpdate(updated);
  };

  // MC/Checkbox/Dropdown
  const addOption = (qid: string) => {
    const q = byId.get(qid);
    if (!q) return;
    handleQuestionChange(qid, "options", [...(q.options || []), { text: "" }]);
  };

  const removeOption = (qid: string, idx: number) => {
    const q = byId.get(qid);
    if (!q) return;
    const next = (q.options || []).filter((_, i) => i !== idx);
    handleQuestionChange(qid, "options", next);
  };

  const setOptionText = (qid: string, idx: number, text: string) => {
    const q = byId.get(qid);
    if (!q) return;
    const next = (q.options || []).map((opt, i) =>
      i === idx ? { ...opt, text } : opt
    );
    handleQuestionChange(qid, "options", next);
  };

  // Scale
  const setScaleField = (qid: string, key: keyof OptionPayload, val: any) => {
    const q = byId.get(qid);
    if (!q) return;
    const base = q.options?.[0] || {};
    const nextFirst = { ...(base as any), [key]: val };
    handleQuestionChange(qid, "options", [nextFirst]);
  };

  // Grid
  const ensureGridInit = (qid: string) => {
    const q = byId.get(qid);
    if (!q) return;
    const current = q.options?.[0] || {};
    const nextFirst = {
      rowOptions: Array.isArray((current as any).rowOptions)
        ? (current as any).rowOptions
        : [],
      columnOptions: Array.isArray((current as any).columnOptions)
        ? (current as any).columnOptions
        : [],
    };
    handleQuestionChange(qid, "options", [nextFirst]);
  };

  const addGridRow = (qid: string) => {
    ensureGridInit(qid);
    const q = byId.get(qid);
    if (!q) return;
    const first = q.options[0] || { rowOptions: [], columnOptions: [] };
    const rows = [...(first.rowOptions || []), { text: "" }];
    handleQuestionChange(qid, "options", [{ ...first, rowOptions: rows }]);
  };

  const addGridColumn = (qid: string) => {
    ensureGridInit(qid);
    const q = byId.get(qid);
    if (!q) return;
    const first = q.options[0] || { rowOptions: [], columnOptions: [] };
    const cols = [...(first.columnOptions || []), { text: "" }];
    handleQuestionChange(qid, "options", [{ ...first, columnOptions: cols }]);
  };

  const setGridRowText = (qid: string, idx: number, text: string) => {
    const q = byId.get(qid);
    if (!q) return;
    const first = q.options[0] || { rowOptions: [], columnOptions: [] };
    const rows = (first.rowOptions || []).map((r: any, i: number) =>
      i === idx ? { ...r, text } : r
    );
    handleQuestionChange(qid, "options", [{ ...first, rowOptions: rows }]);
  };

  const setGridColumnText = (qid: string, idx: number, text: string) => {
    const q = byId.get(qid);
    if (!q) return;
    const first = q.options[0] || { rowOptions: [], columnOptions: [] };
    const cols = (first.columnOptions || []).map((c: any, i: number) =>
      i === idx ? { ...c, text } : c
    );
    handleQuestionChange(qid, "options", [{ ...first, columnOptions: cols }]);
  };

  const removeGridRow = (qid: string, idx: number) => {
    const q = byId.get(qid);
    if (!q) return;
    const first = q.options[0] || { rowOptions: [], columnOptions: [] };
    const rows = (first.rowOptions || []).filter(
      (_: any, i: number) => i !== idx
    );
    handleQuestionChange(qid, "options", [{ ...first, rowOptions: rows }]);
  };

  const removeGridColumn = (qid: string, idx: number) => {
    const q = byId.get(qid);
    if (!q) return;
    const first = q.options[0] || { rowOptions: [], columnOptions: [] };
    const cols = (first.columnOptions || []).filter(
      (_: any, i: number) => i !== idx
    );
    handleQuestionChange(qid, "options", [{ ...first, columnOptions: cols }]);
  };

  const addQuestion = () => {
    const newQ: QuestionVM = {
      id: crypto.randomUUID?.() ?? `q_${Date.now()}`,
      surveyId: survey.id,
      question_type: "TEXT",
      question_text: "Untitled question",
      order_index: questions.length,
      required: true,
      categoryId: undefined,
      options: [],
      media: [],
      mediaId: null,
    };
    onQuestionsUpdate([...questions, newQ]);
    setFocusedQuestion(newQ.id);
  };

  const duplicateQuestion = (id: string) => {
    const src = byId.get(id);
    if (!src) return;
    const copy: QuestionVM = {
      ...src,
      id: crypto.randomUUID?.() ?? `q_${Date.now()}`,
      question_text: `${src.question_text} (Copy)`,
      order_index: questions.length,
      options: src.options ? JSON.parse(JSON.stringify(src.options)) : [],
      media: src.media ? src.media.map((m) => ({ ...m })) : [],
      mediaId: src.mediaId ?? null,
    };
    onQuestionsUpdate([...questions, copy]);
    setFocusedQuestion(copy.id);
  };

  // IMPORTANT: no API call here — defer deletes to parent Continue sync
  const removeQuestion = (id: string) => {
    const next = reindex(questions.filter((q) => q.id !== id));
    onQuestionsUpdate(next);
    if (focusedQuestion === id) setFocusedQuestion(null);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(questions);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    onQuestionsUpdate(reindex(items));
  };

  const handleFileSelected = async (qid: string, file: File) => {
    const detected = detectQuestionTypeFromFile(file);
    const previewUrl = URL.createObjectURL(file);
    handleQuestionChange(qid, "question_type", detected);
    const q = byId.get(qid);
    if (!q) return;
    handleQuestionChange(qid, "media", [
      {
        type: detected,
        url: previewUrl,
        thumbnail_url: detected === "IMAGE" ? previewUrl : undefined,
      },
    ]);
    if (q.mediaId == null) handleQuestionChange(qid, "mediaId", null);
  };

  const clearMedia = (qid: string) => {
    handleQuestionChange(qid, "media", []);
    handleQuestionChange(qid, "mediaId", null);
    handleQuestionChange(qid, "question_type", "TEXT");
  };

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="questions">
          {(dropProvided) => (
            <div
              ref={dropProvided.innerRef}
              {...dropProvided.droppableProps}
              className="space-y-4"
            >
              {questions
                .slice()
                .sort((a, b) => a.order_index - b.order_index)
                .map((q, index) => {
                  const catName = getCategoryName(q.categoryId).toLowerCase();
                  const showOptions = isOptionsCat(catName);
                  const showScale = isScaleCat(catName);
                  const showTextPreview = isTextEntry(catName);
                  const showGrid = isGridCat(catName);

                  return (
                    <Draggable draggableId={q.id} index={index} key={q.id}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={snapshot.isDragging ? "opacity-90" : ""}
                          onFocus={() => setFocusedQuestion(q.id)}
                        >
                          <Card
                            className={
                              focusedQuestion === q.id
                                ? "ring-2 ring-violet-500"
                                : ""
                            }
                            onClick={() => setFocusedQuestion(q.id)}
                          >
                            <CardHeader className="flex-row items-center justify-between space-y-0">
                              <div className="flex items-center gap-2">
                                <div
                                  {...dragProvided.dragHandleProps}
                                  className="cursor-grab text-slate-500"
                                  title="Drag to reorder"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <span className="text-sm text-slate-500">
                                  {index + 1}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Save button removed intentionally */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => duplicateQuestion(q.id)}
                                  title="Duplicate"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeQuestion(q.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                              {/* Question text */}
                              <div className="space-y-1">
                                <Label>Question</Label>
                                <Input
                                  value={q.question_text}
                                  onChange={(e) =>
                                    handleQuestionChange(
                                      q.id,
                                      "question_text",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Question"
                                  className="text-lg font-medium"
                                />
                              </div>

                              {/* Category */}
                              <div className="space-y-1">
                                <Label>Category</Label>
                                <Select
                                  value={q.categoryId ?? ""}
                                  onValueChange={(v) =>
                                    handleQuestionChange(q.id, "categoryId", v)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={
                                        getCategoryName(q.categoryId) ||
                                        "Select category"
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(categories as any[])?.map((cat) => (
                                      <SelectItem key={cat.id} value={cat.id}>
                                        {cat.type_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Required */}
                              <div className="space-y-1 flex items-center gap-2">
                                <Switch
                                  checked={q.required}
                                  onCheckedChange={(checked) =>
                                    handleQuestionChange(
                                      q.id,
                                      "required",
                                      checked
                                    )
                                  }
                                />
                                <Label>Required</Label>
                              </div>

                              {/* Media attachment (optional) */}
                              <div className="space-y-2">
                                <Label>Media attachment (optional)</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="file"
                                    accept="image/*,video/*,audio/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileSelected(q.id, file);
                                    }}
                                  />
                                  {q.media && q.media.length > 0 ? (
                                    <Button
                                      variant="ghost"
                                      onClick={() => clearMedia(q.id)}
                                    >
                                      Remove
                                    </Button>
                                  ) : null}
                                </div>

                                {q.media && q.media.length > 0 ? (
                                  <div className="text-green-700 text-sm flex items-center gap-2">
                                    {q.question_type === "IMAGE" && (
                                      <ImageIcon className="h-4 w-4" />
                                    )}
                                    {q.question_type === "VIDEO" && (
                                      <VideoIcon className="h-4 w-4" />
                                    )}
                                    {q.question_type === "AUDIO" && (
                                      <Mic className="h-4 w-4" />
                                    )}
                                    <span>
                                      Attached • type: {q.question_type}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-slate-500 text-sm">
                                    No media attached
                                  </div>
                                )}
                              </div>

                              {/* Short/Paragraph preview */}
                              {showTextPreview && (
                                <div className="space-y-1">
                                  <Label>
                                    Response (user enters at runtime)
                                  </Label>
                                  <Input
                                    disabled
                                    placeholder="Short/Long answer"
                                  />
                                </div>
                              )}

                              {/* Multiple choice / Checkboxes / Dropdown options */}
                              {showOptions && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>Options</Label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => addOption(q.id)}
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Add option
                                    </Button>
                                  </div>

                                  <div className="space-y-2">
                                    {(q.options || []).map((opt, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-2"
                                      >
                                        <Input
                                          value={opt?.text ?? ""}
                                          onChange={(e) =>
                                            setOptionText(
                                              q.id,
                                              idx,
                                              e.target.value
                                            )
                                          }
                                          placeholder={`Option ${idx + 1}`}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          title="Remove option"
                                          onClick={() =>
                                            removeOption(q.id, idx)
                                          }
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                    ))}

                                    {(q.options || []).length === 0 && (
                                      <div className="text-slate-500 text-sm">
                                        No options yet. Add at least one option.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Linear scale / Rating */}
                              {showScale && (
                                <div className="space-y-2">
                                  <Label>
                                    {getCategoryName(
                                      q.categoryId
                                    ).toLowerCase() === "rating"
                                      ? "Rating scale"
                                      : "Linear scale"}
                                  </Label>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                      <Label>Min</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={q.options?.[0]?.rangeFrom ?? 1}
                                        onChange={(e) =>
                                          setScaleField(
                                            q.id,
                                            "rangeFrom",
                                            Number(e.target.value)
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Max</Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={q.options?.[0]?.rangeTo ?? 5}
                                        onChange={(e) =>
                                          setScaleField(
                                            q.id,
                                            "rangeTo",
                                            Number(e.target.value)
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Bounds labels (optional)</Label>
                                      <div className="flex gap-2">
                                        <Input
                                          placeholder="From label"
                                          value={
                                            q.options?.[0]?.fromLabel ?? ""
                                          }
                                          onChange={(e) =>
                                            setScaleField(
                                              q.id,
                                              "fromLabel",
                                              e.target.value || null
                                            )
                                          }
                                        />
                                        <Input
                                          placeholder="To label"
                                          value={q.options?.[0]?.toLabel ?? ""}
                                          onChange={(e) =>
                                            setScaleField(
                                              q.id,
                                              "toLabel",
                                              e.target.value || null
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-slate-500 text-xs">
                                    Tip: Common ranges are 1–5 or 1–10.
                                  </div>
                                </div>
                              )}

                              {/* Multi-choice grid / Checkbox grid */}
                              {showGrid && (
                                <div className="space-y-3">
                                  <Label>Grid options</Label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Rows */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label>Rows</Label>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => addGridRow(q.id)}
                                        >
                                          <Plus className="mr-2 h-4 w-4" />
                                          Add row
                                        </Button>
                                      </div>
                                      <div className="space-y-2">
                                        {(q.options?.[0]?.rowOptions || []).map(
                                          (row, idx) => (
                                            <div
                                              key={`row-${idx}`}
                                              className="flex items-center gap-2"
                                            >
                                              <Input
                                                value={row?.text ?? ""}
                                                onChange={(e) =>
                                                  setGridRowText(
                                                    q.id,
                                                    idx,
                                                    e.target.value
                                                  )
                                                }
                                                placeholder={`Row ${idx + 1}`}
                                              />
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Remove row"
                                                onClick={() =>
                                                  removeGridRow(q.id, idx)
                                                }
                                              >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                              </Button>
                                            </div>
                                          )
                                        )}
                                        {(q.options?.[0]?.rowOptions || [])
                                          .length === 0 && (
                                          <div className="text-slate-500 text-sm">
                                            No rows yet. Add rows.
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Columns */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label>Columns</Label>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => addGridColumn(q.id)}
                                        >
                                          <Plus className="mr-2 h-4 w-4" />
                                          Add column
                                        </Button>
                                      </div>
                                      <div className="space-y-2">
                                        {(
                                          q.options?.[0]?.columnOptions || []
                                        ).map((col, idx) => (
                                          <div
                                            key={`col-${idx}`}
                                            className="flex items-center gap-2"
                                          >
                                            <Input
                                              value={col?.text ?? ""}
                                              onChange={(e) =>
                                                setGridColumnText(
                                                  q.id,
                                                  idx,
                                                  e.target.value
                                                )
                                              }
                                              placeholder={`Column ${idx + 1}`}
                                            />
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              title="Remove column"
                                              onClick={() =>
                                                removeGridColumn(q.id, idx)
                                              }
                                            >
                                              <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                          </div>
                                        ))}
                                        {(q.options?.[0]?.columnOptions || [])
                                          .length === 0 && (
                                          <div className="text-slate-500 text-sm">
                                            No columns yet. Add columns.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-slate-500 text-xs">
                                    Respondents select one option per row for
                                    multi‑choice grid, or multiple per row for
                                    checkbox grid.
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  );
                })}

              {dropProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="pt-2">
        <Button variant="outline" onClick={addQuestion}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>
    </div>
  );
}
