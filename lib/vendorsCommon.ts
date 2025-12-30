export async function groupQuestionsByPrimaryCategory(questions: any[]) {
  console.log(">>>>> the value of the QUESTIONS (in GRoup) is : ", questions);
  const groupsMap: Record<string, any> = {};

  for (const q of questions) {
    // 1️⃣ Find primary category
    const primaryCategory = Array.isArray(q.category)
      ? q.category.find((c: any) => c.is_primary === true)
      : null;

    const groupName = primaryCategory?.category_name || "Other";

    // 2️⃣ Init group if missing
    if (!groupsMap[groupName]) {
      groupsMap[groupName] = {
        groupName,
        questionCount: 0,
        questions: [],
      };
    }

    // 3️⃣ Push normalized question
    groupsMap[groupName].questions.push({
      id: q.id,
      questionKey: q.question_key,
      questionText: q.question_text,
      questionType: q.question_type,
      vendor_question_id: q.vendor_question_id,
      optionsCount: Array.isArray(q.options) ? q.options.length : 0,
      options: q.options || [],
    });

    groupsMap[groupName].questionCount++;
  }

  // 4️⃣ Convert map → array & sort (optional but smart)
  return Object.values(groupsMap).sort(
    (a, b) => b.questionCount - a.questionCount
  );
}
