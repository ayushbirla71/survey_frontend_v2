"use client";

import { useEffect, useMemo, useState } from "react";
import {
  screeningQuestionsApi,
  vendorsApi, // you already have this
  CreateScreeningQuestionDto,
  QuestionSource,
  ScreeningQuestionDefinition,
  UpdateScreeningQuestionDto,
  Vendor,
} from "@/lib/api";

const COUNTRY_CODES = ["IN", "US"] as const;
const LANGUAGES = ["ENGLISH", "HINDI"] as const;

const QUESTION_TYPES: ScreeningQuestionDefinition["question_type"][] = [
  "SINGLE",
  "MULTI",
  "RANGE",
  "NUMBER",
];

const DATA_TYPES: ScreeningQuestionDefinition["data_type"][] = [
  "STRING",
  "NUMBER",
  "ARRAY",
];

type OptionDraft = { option_text: string; order_index: number };

type FormDraft = {
  source: "CUSTOM" | "SYSTEM";
  country_code: string;
  language: string;
  question_key: string;
  question_text: string;
  question_type: ScreeningQuestionDefinition["question_type"];
  data_type: ScreeningQuestionDefinition["data_type"];
  options: OptionDraft[];
};

function makeEmptyDraft(
  source: "CUSTOM" | "SYSTEM",
  country_code: string,
  language: string
): FormDraft {
  return {
    source,
    country_code,
    language,
    question_key: "",
    question_text: "",
    question_type: "SINGLE",
    data_type: "STRING",
    options: [{ option_text: "", order_index: 0 }],
  };
}

function normalizeOptions(options: OptionDraft[]) {
  return options
    .map((o) => ({ ...o, option_text: o.option_text.trim() }))
    .filter((o) => o.option_text.length > 0)
    .map((o, idx) => ({ option_text: o.option_text, order_index: idx }));
}

export default function ScreeningQuestionsPage() {
  const [source, setSource] = useState<QuestionSource>("SYSTEM");

  // vendor filters
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState("");

  const [countryCode, setCountryCode] =
    useState<(typeof COUNTRY_CODES)[number]>("IN");
  const [language, setLanguage] =
    useState<(typeof LANGUAGES)[number]>("ENGLISH");

  // list state
  const [questions, setQuestions] = useState<ScreeningQuestionDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create/edit modal state
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [createDraft, setCreateDraft] = useState<FormDraft>(() =>
    makeEmptyDraft("CUSTOM", "IN", "ENGLISH")
  );

  const [editId, setEditId] = useState<string>("");
  const [editDraft, setEditDraft] = useState<FormDraft>(() =>
    makeEmptyDraft("CUSTOM", "IN", "ENGLISH")
  );

  const [saving, setSaving] = useState(false);

  const showVendorFilters = source === "VENDOR";
  const canCreate = source === "CUSTOM" || source === "SYSTEM";

  // Load vendors once (same style as your VendorsPage)
  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await vendorsApi.getVendors();
      console.log(">>>>> the value of the VENDORS is : ", res);
      const data = res.data?.data || [];
      setVendors(data);
      if (!vendorId && data.length) setVendorId(data[0].id);
    } catch (err: any) {
      // vendors failing should not break questions screen
      console.error(err);
    }
  };

  const fetchQuestions = async () => {
    try {
      setError(null);

      if (source === "VENDOR" && !vendorId) {
        setQuestions([]);
        return;
      }

      setLoading(true);

      const res = await screeningQuestionsApi.getScreeningQuestions({
        source,
        vendorId: source === "VENDOR" ? vendorId : undefined,
        countryCode,
        language,
      });
      console.log(">>>>> the value of the QUESTIONS is : ", res);

      const data = res.data?.data || [];
      setQuestions(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load screening questions");
    } finally {
      setLoading(false);
    }
  };

  // Refetch when filters change
  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, vendorId, countryCode, language]);

  const openCreateModal = () => {
    setError(null);
    const defaultSource: "CUSTOM" | "SYSTEM" =
      source === "SYSTEM" ? "SYSTEM" : "CUSTOM";
    setCreateDraft(makeEmptyDraft(defaultSource, countryCode, language));
    setShowCreate(true);
  };

  const openEditModal = (q: ScreeningQuestionDefinition) => {
    setError(null);
    setEditId(q.id);

    setEditDraft({
      source: q.source === "SYSTEM" ? "SYSTEM" : "CUSTOM",
      country_code: q.country_code,
      language: q.language,
      question_key: q.question_key,
      question_text: q.question_text,
      question_type: q.question_type,
      data_type: q.data_type,
      options:
        q.options?.length > 0
          ? q.options
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((o, idx) => ({
                option_text: o.option_text,
                order_index: idx,
              }))
          : [{ option_text: "", order_index: 0 }],
    });

    setShowEdit(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!createDraft.question_key.trim() || !createDraft.question_text.trim()) {
      setError("question_key and question_text are required.");
      return;
    }

    const payload: CreateScreeningQuestionDto = {
      source: createDraft.source,
      country_code: createDraft.country_code,
      language: createDraft.language,
      question_key: createDraft.question_key.trim(),
      question_text: createDraft.question_text.trim(),
      question_type: createDraft.question_type,
      data_type: createDraft.data_type,
      options: normalizeOptions(createDraft.options),
    };

    try {
      setSaving(true);
      await screeningQuestionsApi.createScreeningQuestion(payload);
      setShowCreate(false);
      // refresh list based on active filters
      fetchQuestions();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create screening question");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editId) return;

    const payload: UpdateScreeningQuestionDto = {
      country_code: editDraft.country_code,
      language: editDraft.language,
      question_key: editDraft.question_key.trim(),
      question_text: editDraft.question_text.trim(),
      question_type: editDraft.question_type,
      data_type: editDraft.data_type,
      options: normalizeOptions(editDraft.options),
    };

    try {
      setSaving(true);
      await screeningQuestionsApi.updateScreeningQuestion(editId, payload);
      setShowEdit(false);
      setEditId("");
      fetchQuestions();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update screening question");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVendorQuestion = async (q: ScreeningQuestionDefinition) => {
    if (q.source !== "VENDOR") return;

    const ok = confirm("Delete this VENDOR screening question?");
    if (!ok) return;

    try {
      setError(null);
      await screeningQuestionsApi.deleteScreeningQuestion(q.id);
      fetchQuestions();
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete question");
    }
  };

  const addOption = (
    setter: React.Dispatch<React.SetStateAction<FormDraft>>
  ) => {
    setter((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { option_text: "", order_index: prev.options.length },
      ],
    }));
  };

  const removeOption = (
    setter: React.Dispatch<React.SetStateAction<FormDraft>>,
    idx: number
  ) => {
    setter((prev) => {
      const next = prev.options.filter((_, i) => i !== idx);
      return {
        ...prev,
        options: next.map((o, i) => ({ ...o, order_index: i })),
      };
    });
  };

  const updateOptionText = (
    setter: React.Dispatch<React.SetStateAction<FormDraft>>,
    idx: number,
    value: string
  ) => {
    setter((prev) => ({
      ...prev,
      options: prev.options.map((o, i) =>
        i === idx ? { ...o, option_text: value } : o
      ),
    }));
  };

  const rulesHint = useMemo(() => {
    if (source === "VENDOR") return "VENDOR: can only delete (no create/edit).";
    if (source === "SYSTEM") return "SYSTEM: can create + edit.";
    return "CUSTOM: can create + edit.";
  }, [source]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Manage Screening Questions
        </h2>

        <button
          onClick={canCreate ? openCreateModal : undefined}
          disabled={!canCreate}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            canCreate
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Add Screening Question
        </button>
      </div>

      <div className="mb-3 text-xs text-gray-600">{rulesHint}</div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label className="block mb-1 font-medium">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as QuestionSource)}
              className="w-full rounded border border-gray-300 px-2 py-1"
            >
              <option value="SYSTEM">SYSTEM</option>
              <option value="VENDOR">VENDOR</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>
          </div>

          {showVendorFilters && (
            <div>
              <label className="block mb-1 font-medium">Vendor</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1"
              >
                {vendors.length === 0 && <option value="">No vendors</option>}
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block mb-1 font-medium">Country</label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value as any)}
              className="w-full rounded border border-gray-300 px-2 py-1"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full rounded border border-gray-300 px-2 py-1"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-gray-600">Loading questions...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                  Key
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                  Text
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                  Source
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {questions.map((q) => {
                const allowEdit =
                  q.source === "CUSTOM" || q.source === "SYSTEM";
                const allowDelete = q.source === "VENDOR";

                return (
                  <tr key={q.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono">
                      {q.question_key}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {q.question_text}
                      </div>
                      {q.options?.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Options:{" "}
                          {q.options
                            .slice()
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((o) => o.option_text)
                            .join(", ")}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">{q.question_type}</td>
                    <td className="px-4 py-3">{q.source}</td>

                    <td className="px-4 py-3 space-x-2">
                      <button
                        type="button"
                        disabled={!allowEdit}
                        onClick={() => allowEdit && openEditModal(q)}
                        className={`text-xs font-medium ${
                          allowEdit
                            ? "text-blue-600 hover:text-blue-900"
                            : "text-gray-400"
                        }`}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={!allowDelete}
                        onClick={() =>
                          allowDelete && handleDeleteVendorQuestion(q)
                        }
                        className={`text-xs font-medium ${
                          allowDelete
                            ? "text-red-600 hover:text-red-900"
                            : "text-gray-400"
                        }`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}

              {questions.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-4 text-center text-gray-500"
                    colSpan={5}
                  >
                    No questions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Create Screening Question
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Source</label>
                  <select
                    value={createDraft.source}
                    onChange={(e) =>
                      setCreateDraft((p) => ({
                        ...p,
                        source: e.target.value as any,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  >
                    <option value="CUSTOM">CUSTOM</option>
                    <option value="SYSTEM">SYSTEM</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Country</label>
                  <select
                    value={createDraft.country_code}
                    onChange={(e) =>
                      setCreateDraft((p) => ({
                        ...p,
                        country_code: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Language</label>
                  <select
                    value={createDraft.language}
                    onChange={(e) =>
                      setCreateDraft((p) => ({
                        ...p,
                        language: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Question Key</label>
                  <input
                    value={createDraft.question_key}
                    onChange={(e) =>
                      setCreateDraft((p) => ({
                        ...p,
                        question_key: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                    placeholder="AGE, GENDER, Q_CUSTOM_1"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium">
                    Question Type
                  </label>
                  <select
                    value={createDraft.question_type}
                    onChange={(e) =>
                      setCreateDraft((p) => ({
                        ...p,
                        question_type: e.target.value as any,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Question Text</label>
                <textarea
                  value={createDraft.question_text}
                  onChange={(e) =>
                    setCreateDraft((p) => ({
                      ...p,
                      question_text: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-gray-300 px-2 py-1"
                  rows={3}
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Data Type</label>
                <select
                  value={createDraft.data_type}
                  onChange={(e) =>
                    setCreateDraft((p) => ({
                      ...p,
                      data_type: e.target.value as any,
                    }))
                  }
                  className="w-full rounded border border-gray-300 px-2 py-1"
                >
                  {DATA_TYPES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Options</h4>
                  <button
                    type="button"
                    onClick={() => addOption(setCreateDraft)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-900"
                  >
                    + Add option
                  </button>
                </div>

                <div className="space-y-2">
                  {createDraft.options.map((o, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={o.option_text}
                        onChange={(e) =>
                          updateOptionText(setCreateDraft, idx, e.target.value)
                        }
                        className="flex-1 rounded border border-gray-300 px-2 py-1"
                        placeholder={`Option ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(setCreateDraft, idx)}
                        disabled={createDraft.options.length === 1}
                        className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1 text-xs rounded border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Screening Question</h3>
              <button
                onClick={() => setShowEdit(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Country</label>
                  <select
                    value={editDraft.country_code}
                    onChange={(e) =>
                      setEditDraft((p) => ({
                        ...p,
                        country_code: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Language</label>
                  <select
                    value={editDraft.language}
                    onChange={(e) =>
                      setEditDraft((p) => ({ ...p, language: e.target.value }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">
                    Question Type
                  </label>
                  <select
                    value={editDraft.question_type}
                    onChange={(e) =>
                      setEditDraft((p) => ({
                        ...p,
                        question_type: e.target.value as any,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Question Key</label>
                  <input
                    value={editDraft.question_key}
                    onChange={(e) =>
                      setEditDraft((p) => ({
                        ...p,
                        question_key: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium">Data Type</label>
                  <select
                    value={editDraft.data_type}
                    onChange={(e) =>
                      setEditDraft((p) => ({
                        ...p,
                        data_type: e.target.value as any,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  >
                    {DATA_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Question Text</label>
                <textarea
                  value={editDraft.question_text}
                  onChange={(e) =>
                    setEditDraft((p) => ({
                      ...p,
                      question_text: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-gray-300 px-2 py-1"
                  rows={3}
                />
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Options</h4>
                  <button
                    type="button"
                    onClick={() => addOption(setEditDraft)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-900"
                  >
                    + Add option
                  </button>
                </div>

                <div className="space-y-2">
                  {editDraft.options.map((o, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={o.option_text}
                        onChange={(e) =>
                          updateOptionText(setEditDraft, idx, e.target.value)
                        }
                        className="flex-1 rounded border border-gray-300 px-2 py-1"
                        placeholder={`Option ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(setEditDraft, idx)}
                        disabled={editDraft.options.length === 1}
                        className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="px-3 py-1 text-xs rounded border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
