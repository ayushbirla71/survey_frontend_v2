import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * Export Survey Analytics to Excel
 *
 * Updated to support new question types and API response format (2025-11-29)
 *
 * Supported Question Types:
 * - Text Input: "short answer", "paragraph", "number"
 * - Choice: "multiple choice", "checkboxes", "dropdown"
 * - Scale: "linear scale", "rating", "nps"
 * - Grid: "multi-choice grid", "checkbox grid"
 * - Date/Time: "date", "time"
 * - File: "file upload"
 *
 * Special Handling:
 * - Number: Exports average, min, median, max statistics
 * - NPS: Exports NPS score, promoters/passives/detractors percentages
 * - Overall NPS Score: Average of all NPS questions (in stats)
 *
 * See: EXPORT_ANALYTICS_FRONTEND_GUIDE.md for full documentation
 */

export const exportResponsesToExcel = (
  surveyTitle: string,
  questionResults: any[],
  individualResponses: any[],
  stats: any
) => {
  // 📍 Prepare Sheet 1 — Analytics Summary
  const analyticsSheetData: any[][] = [
    ["Survey Title", surveyTitle],
    ["Total Responses", stats.totalResponses],
    ["Completion Rate (%)", stats.completionRate],
    ["Average Time (mins)", stats.avgTime],
    ["Overall NPS Score", stats.npsScore || "N/A"],
    [],
    ["Question", "Type", "Responses", "Stats"],
  ];

  questionResults.forEach((q) => {
    // Rating and Linear Scale types
    if (q.type === "rating" || q.type === "linear scale") {
      analyticsSheetData.push([
        q.question,
        q.type,
        q.responses,
        `Avg: ${q.averageRating}`,
      ]);
    }
    // NPS type - with detailed breakdown
    else if (q.type === "nps") {
      const npsDetails = q.data
        ? `NPS: ${q.npsScore} | Promoters: ${q.data.promoters}% | Passives: ${q.data.passives}% | Detractors: ${q.data.detractors}%`
        : `NPS: ${q.npsScore}`;
      analyticsSheetData.push([q.question, q.type, q.responses, npsDetails]);
    }
    // Number type - with statistics
    else if (q.type === "number") {
      const numberStats = q.data
        ? `Avg: ${q.average} | Min: ${q.data.min} | Median: ${q.data.median} | Max: ${q.data.max}`
        : `Avg: ${q.average}`;
      analyticsSheetData.push([q.question, q.type, q.responses, numberStats]);
    }
    // Choice types: multiple choice, checkboxes, dropdown
    else if (
      q.type === "multiple choice" ||
      q.type === "checkboxes" ||
      q.type === "dropdown"
    ) {
      const ans = q.data.map(
        (o: any) => `${o.option}: ${o.count} (${o.percentage}%)`
      );
      analyticsSheetData.push([
        q.question,
        q.type,
        q.responses,
        ans.join(" | "),
      ]);
    }
    // Grid types: multi-choice grid, checkbox grid
    else if (q.type === "multi-choice grid" || q.type === "checkbox grid") {
      analyticsSheetData.push([
        q.question,
        q.type,
        q.responses,
        "[Grid results in next sheet]",
      ]);
    }
    // Text types: short answer, paragraph
    else if (q.type === "short answer" || q.type === "paragraph") {
      analyticsSheetData.push([
        q.question,
        q.type,
        q.responses,
        "[Text responses]",
      ]);
    }
    // Other types (date, time, file upload)
    else {
      analyticsSheetData.push([q.question, q.type, q.responses, ""]);
    }
  });

  // 🏗 Build Sheet 2 — Individual Responses
  const ioHeaders: string[] = [
    "Response ID",
    "Submitted At",
    "Completion Time (mins)",
  ];

  const columnKeys: string[] = [];
  let qIndex = 1;

  questionResults.forEach((q) => {
    // Text types: short answer, paragraph, number
    // Rating types: rating, linear scale, nps
    // Choice types: multiple choice, dropdown
    if (
      [
        "short answer",
        "paragraph",
        "number",
        "rating",
        "linear scale",
        "nps",
        "multiple choice",
        "dropdown",
      ].includes(q.type)
    ) {
      const key = `q${qIndex}`;
      columnKeys.push(key);
      ioHeaders.push(`Q${qIndex}\n${q.question}`);
    }
    // Checkboxes type - one column per option
    else if (q.type === "checkboxes") {
      q.data.forEach((opt: any, i: number) => {
        const key = `q${qIndex}_${i + 1}`;
        columnKeys.push(key);
        ioHeaders.push(`Q${qIndex}_${i + 1}\n${q.question} - ${opt.option}`);
      });
    }
    // Grid types: multi-choice grid, checkbox grid
    else if (q.type === "multi-choice grid" || q.type === "checkbox grid") {
      q.data.forEach((row: any, r: number) => {
        row.cells.forEach((cell: any, c: number) => {
          const key = `q${qIndex}r${r + 1}c${c + 1}`;
          columnKeys.push(key);
          ioHeaders.push(
            `Q${qIndex}r${r + 1}c${c + 1}\n${row.row} - ${cell.column}`
          );
        });
      });
    }

    qIndex++;
  });

  const ioRows = [
    ioHeaders,
    ...individualResponses.map((resp) => {
      const row: any[] = [resp.id, resp.submittedAt, resp.completionTime ?? ""];

      const answerMap = new Map(
        resp.answers.map((a: any) => [a.question, a.answer])
      );

      let qi = 1;

      questionResults.forEach((q) => {
        // Text types: short answer, paragraph, number
        // Rating types: rating, linear scale, nps
        // Choice types: multiple choice, dropdown
        if (
          [
            "short answer",
            "paragraph",
            "number",
            "rating",
            "linear scale",
            "nps",
            "multiple choice",
            "dropdown",
          ].includes(q.type)
        ) {
          row.push(answerMap.get(q.question) ?? "");
        }
        // Checkboxes type - one column per option (1/0)
        else if (q.type === "checkboxes") {
          const ans = (answerMap.get(q.question) || "") as string;
          const selected = ans.split(",").map((s: any) => s.trim());

          q.data.forEach((opt: any) => {
            row.push(selected.includes(opt.option) ? "1" : "0");
          });
        }
        // Grid types: multi-choice grid, checkbox grid
        else if (q.type === "multi-choice grid" || q.type === "checkbox grid") {
          const ans = (answerMap.get(q.question) || "") as string;
          const pairs = ans.split(";").map((s: string) => s.trim());

          q.data.forEach((rowItem: any) =>
            rowItem.cells.forEach((cell: any) => {
              const label = `${rowItem.row}: ${cell.column}`;
              row.push(pairs.includes(label) ? "1" : "0");
            })
          );
        }

        qi++;
      });

      return row;
    }),
  ];

  // 🔄 Build Workbook
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Analytics Summary
  const ws1 = XLSX.utils.aoa_to_sheet(analyticsSheetData);
  XLSX.utils.book_append_sheet(workbook, ws1, "Analytics Summary");

  // Sheet 2: Individual Responses
  const ws2 = XLSX.utils.aoa_to_sheet(ioRows);
  XLSX.utils.book_append_sheet(workbook, ws2, "Individual Responses");

  // 📤 Export File
  const excelBlob = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  });

  saveAs(new Blob([excelBlob]), `${surveyTitle}-Survey-Report.xlsx`);
};

// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";

// export const exportResponsesToExcel = (
//   surveyTitle: string,
//   questionResults: any[],
//   individualResponses: any[]
// ) => {
//   console.log(
//     "Exporting to Excel:",
//     surveyTitle,
//     questionResults,
//     individualResponses
//   );

//   // 🏗 Dynamic header structure
//   const headers: string[] = [
//     "Response ID",
//     "Submitted At",
//     "Completion Time (mins)",
//   ];

//   const columnKeys: string[] = [];

//   // Build header keys for each question type
//   questionResults.forEach((q) => {
//     if (["text", "single_choice", "rating"].includes(q.type)) {
//       const key = `q_${q.question}`;
//       columnKeys.push(key);
//       headers.push(q.question);
//     }

//     // Multiple Checkboxes → One col per option
//     else if (q.type === "multiple_choice") {
//       q.data.forEach((opt: any) => {
//         const key = `q_${q.question}_${opt.option}`;
//         columnKeys.push(key);
//         headers.push(`${q.question} - ${opt.option}`);
//       });
//     }

//     // Grids → One col per cell
//     else if (q.type === "grid") {
//       q.data.forEach((row: any) =>
//         row.cells.forEach((cell: any) => {
//           const key = `q_${q.question}_${row.row}_${cell.column}`;
//           columnKeys.push(key);
//           headers.push(`${q.question} - ${row.row} - ${cell.column}`);
//         })
//       );
//     }
//   });

//   // 🟩 Construct rows
//   const sheetData = [
//     headers, // header row
//     ...individualResponses.map((resp) => {
//       const row: any = [resp.id, resp.submittedAt, resp.completionTime ?? ""];

//       const answerMap = new Map(
//         resp.answers.map((a: any) => [a.question, a.answer])
//       );

//       questionResults.forEach((q) => {
//         // direct value types
//         if (["text", "single_choice", "rating"].includes(q.type)) {
//           row.push(answerMap.get(q.question) ?? "");
//         }

//         // Checkboxes → Set 1/0
//         else if (q.type === "multiple_choice") {
//           const ans = answerMap.get(q.question) || "";
//           const selected = ans.split(",").map((s: string) => s.trim());

//           q.data.forEach((opt: any) => {
//             row.push(selected.includes(opt.option) ? "1" : "0");
//           });
//         }

//         // Grid → 1/0 per cell
//         else if (q.type === "grid") {
//           const ans = answerMap.get(q.question) || "";
//           const pairs = ans.split(";").map((s: string) => s.trim());

//           q.data.forEach((rowItem: any) =>
//             rowItem.cells.forEach((cell: any) => {
//               const label = `${rowItem.row}: ${cell.column}`;
//               row.push(pairs.includes(label) ? "1" : "0");
//             })
//           );
//         }
//       });

//       return row;
//     }),
//   ];

//   // 🔄 Create workbook & sheet
//   const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
//   const workbook = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");

//   // 📤 Generate & download Excel file
//   const excelBlob = XLSX.write(workbook, {
//     bookType: "xlsx",
//     type: "array",
//   });

//   saveAs(new Blob([excelBlob]), `${surveyTitle}-Responses.xlsx`);
// };
