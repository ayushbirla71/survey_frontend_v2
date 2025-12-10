import { questionApi } from "@/lib/api";

// Normalizes camelCase vs snake_case fields so either shape works
const get = (obj: any, keyA: string, keyB: string) =>
  obj?.[keyA] ?? obj?.[keyB];

export type AnyQuestion = {
  id?: string;
  surveyId?: string;
  question_type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";
  question_text?: string;
  questiontext?: string;
  order_index?: number;
  orderindex?: number;
  required?: boolean;
  categoryId?: string;
  options?: any[];
  mediaId?: string | null;
  rowOptions?: any[];
  columnOptions?: any[];
};

export function normalize(q: AnyQuestion, surveyId: string) {
  return {
    id: q.id,
    surveyId,
    question_type: get(q, "question_type", "questiontype") ?? "TEXT",
    question_text: get(q, "question_text", "questiontext") ?? "",
    options: q.options ?? [],
    categoryId: q.categoryId,
    order_index: get(q, "order_index", "orderindex") ?? 0,
    required: q.required ?? false,
    mediaId: q.mediaId ?? null,
    rowOptions: q.rowOptions ?? [],
    columnOptions: q.columnOptions ?? [],
  };
}

export function diffQuestions(original: AnyQuestion[], current: AnyQuestion[]) {
  const origMap = new Map((original || []).map((q) => [q.id, q]));
  const curMap = new Map((current || []).map((q) => [q.id, q]));

  const toDelete: AnyQuestion[] = [];
  const toCreate: AnyQuestion[] = [];
  const toUpdate: AnyQuestion[] = [];

  // deletions
  for (const [id, oq] of origMap) {
    if (!id) continue;
    if (!curMap.has(id)) toDelete.push(oq);
  }

  // creates + updates
  for (const cq of current || []) {
    if (!cq.id || !origMap.has(cq.id)) {
      toCreate.push(cq);
    } else {
      const oq = origMap.get(cq.id)!;
      const changed =
        get(oq, "question_text", "questiontext") !==
          get(cq, "question_text", "questiontext") ||
        (oq.categoryId ?? "") !== (cq.categoryId ?? "") ||
        JSON.stringify(oq.options ?? []) !== JSON.stringify(cq.options ?? []) ||
        JSON.stringify(oq.rowOptions ?? []) !==
          JSON.stringify(cq.rowOptions ?? []) ||
        JSON.stringify(oq.columnOptions ?? []) !==
          JSON.stringify(cq.columnOptions ?? []) ||
        (get(oq, "order_index", "orderindex") ?? 0) !==
          (get(cq, "order_index", "orderindex") ?? 0) ||
        (oq.required ?? false) !== (cq.required ?? false) ||
        (oq.mediaId ?? null) !== (cq.mediaId ?? null);

      if (changed) toUpdate.push(cq);
    }
  }

  return { toCreate, toUpdate, toDelete };
}

// Applies creates/updates/deletes; returns the updated current list with new IDs filled in
export async function syncSurveyQuestions(
  surveyId: string,
  original: AnyQuestion[],
  current: AnyQuestion[]
) {
  console.log(">>>>>> the VALUE OF THE ORIGINAL QUESTIONS is : ", original);
  console.log(">>>>>> the VALUE OF THE CURRENT QUESTIONS is : ", current);
  const { toCreate, toUpdate, toDelete } = diffQuestions(original, current);
  console.log("toCreate is", toCreate, " and toUpdate is", toUpdate);

  // Create
  const createdPairs = await Promise.all(
    toCreate.map(async (q) => {
      const n = normalize(q, surveyId);
      const { data, error } = await questionApi.createQuestion({
        surveyId,
        question_type: n.question_type,
        question_text: n.question_text,
        options: n.options || [],
        mediaId: n.mediaId ?? undefined,
        categoryId: n.categoryId || "",
        order_index: n.order_index ?? 0,
        required: n.required ?? false,
        rowOptions: n.rowOptions || [],
        columnOptions: n.columnOptions || [],
      });
      if (error) throw new Error(error);
      return { localId: q.id, server: data };
    })
  );

  // Update
  await Promise.all(
    toUpdate.map(async (q) => {
      const n = normalize(q, surveyId);
      // question_type typically immutable here; backend update does not accept it
      const { error } = await questionApi.updateQuestion(String(q.id), {
        question_type: n.question_type,
        question_text: n.question_text,
        options: n.options || [],
        categoryId: n.categoryId,
        order_index: n.order_index,
        required: n.required,
        rowOptions: n.rowOptions || [],
        columnOptions: n.columnOptions || [],
        // Send null explicitly when mediaId is null (to clear media in DB)
        mediaId: n.mediaId,
      });
      if (error) throw new Error(error);
    })
  );

  // Delete
  await Promise.all(
    toDelete.map(async (q) => {
      if (!q.id) return;
      const { error } = await questionApi.deleteQuestion(String(q.id));
      if (error) throw new Error(error);
    })
  );

  // Replace local temp IDs with server IDs for created questions
  const idMap = new Map(
    createdPairs
      .filter((p) => p.server?.id)
      .map((p) => [p.localId, p.server.id] as const)
  );

  const merged = (current || []).map((q) => {
    if (idMap.has(q.id)) {
      return { ...q, id: idMap.get(q.id) };
    }
    return q;
  });

  return merged;
}
