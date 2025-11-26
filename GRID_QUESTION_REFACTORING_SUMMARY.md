# Grid Question Refactoring Summary

## Overview

Refactored grid questions (multi-choice grid and checkbox grid) to send `rowOptions` and `columnOptions` as **separate top-level fields** instead of nested inside `options[0]`.

## Changes Made

### 1. Enhanced Question Editor (`components/enhanced-question-editor.tsx`)

**Changed:** Grid handlers now store rowOptions/columnOptions at the question level instead of inside options[0]

**Before:**

```typescript
// Stored in options[0]
q.options[0].rowOptions;
q.options[0].columnOptions;
```

**After:**

```typescript
// Stored at question level
q.rowOptions;
q.columnOptions;
```

**Modified Functions:**

- `ensureGridInit()` - Initializes rowOptions/columnOptions at question level
- `addGridRow()` - Adds rows to question.rowOptions
- `addGridColumn()` - Adds columns to question.columnOptions
- `setGridRowText()` - Updates row text in question.rowOptions
- `setGridColumnText()` - Updates column text in question.columnOptions
- `removeGridRow()` - Removes rows from question.rowOptions
- `removeGridColumn()` - Removes columns from question.columnOptions

**UI Updates:**

- Changed `{(q.options?.[0]?.rowOptions || []).map(...)}` to `{(q.rowOptions || []).map(...)}`
- Changed `{(q.options?.[0]?.columnOptions || []).map(...)}` to `{(q.columnOptions || []).map(...)}`

### 2. Question Sync (`lib/question-sync.ts`)

**Added fields to AnyQuestion type:**

```typescript
rowOptions?: any[];
columnOptions?: any[];
```

**Updated normalize() function:**

- Now includes rowOptions and columnOptions in normalized output

**Updated diffQuestions() function:**

- Now compares rowOptions and columnOptions when detecting changes

**Updated syncSurveyQuestions() function:**

- Sends rowOptions and columnOptions when creating questions
- Sends rowOptions and columnOptions when updating questions

### 3. API Client (`lib/api.ts`)

**Updated questionApi.createQuestion() parameters:**

```typescript
createQuestion: async (questionData: {
  // ... existing fields
  rowOptions?: any[];
  columnOptions?: any[];
})
```

**Updated questionApi.updateQuestion() parameters:**

```typescript
updateQuestion: async (questionId: string, questionData: {
  // ... existing fields
  rowOptions?: any[];
  columnOptions?: any[];
})
```

### 4. Generate Survey Page (`app/generate-survey/page.tsx`)

**Updated createQuestionsForSurvey() function:**

```typescript
const questionData: any = {
  // ... existing fields
  rowOptions: q.rowOptions || [],
  columnOptions: q.columnOptions || [],
};
```

### 5. Survey Preview (`components/survey-preview.tsx`)

**Updated ApiQuestion type:**

```typescript
type ApiQuestion = {
  // ... existing fields
  rowOptions?: { text?: string | null; id?: string }[];
  columnOptions?: { text?: string | null; id?: string }[];
};
```

**Updated extractGrid() function:**

- Priority 1: Check question-level rowOptions/columnOptions (NEW)
- Priority 2: Check options[0].rowOptions/columnOptions (LEGACY - for backward compatibility)
- Priority 3: Check explicit rows/columns props
- Priority 4: Derive from pair IDs (fallback)

## Backend API Endpoints to Update

### 🔴 CRITICAL: POST /api/questions

**Endpoint:** `POST /api/questions`

**What Changed:** Now accepts `rowOptions` and `columnOptions` as separate top-level fields

**Request Body (add these fields):**

```json
{
  "surveyId": "uuid",
  "question_type": "TEXT",
  "question_text": "Question text",
  "options": [],
  "categoryId": "uuid",
  "order_index": 0,
  "required": false,
  "rowOptions": [{ "text": "Row 1" }, { "text": "Row 2" }],
  "columnOptions": [{ "text": "Column 1" }, { "text": "Column 2" }]
}
```

**Backend Implementation Notes:**

- Accept `rowOptions` and `columnOptions` as optional arrays
- Store them separately in the database (not inside options)
- For grid question types (multi-choice grid, checkbox grid), these fields are required
- Each row/column should be stored with a unique ID

---

### 🔴 CRITICAL: PUT /api/questions/{questionId}

**Endpoint:** `PUT /api/questions/{questionId}`

**What Changed:** Now accepts `rowOptions` and `columnOptions` for updates

**Request Body (add these fields):**

```json
{
  "question_text": "Updated question",
  "options": [],
  "rowOptions": [{ "text": "Updated Row 1" }],
  "columnOptions": [{ "text": "Updated Column 1" }]
}
```

**Backend Implementation Notes:**

- Accept `rowOptions` and `columnOptions` as optional arrays
- Replace existing rows/columns when provided
- Maintain IDs for existing rows/columns if possible

---

### 🔴 CRITICAL: GET /api/questions/survey/{surveyId}

**Endpoint:** `GET /api/questions/survey/{surveyId}`

**What Changed:** Should return `rowOptions` and `columnOptions` as separate fields

**Response (should include these fields for grid questions):**

```json
{
  "data": [
    {
      "id": "uuid",
      "question_text": "Grid question",
      "categoryId": "grid-category-id",
      "options": [],
      "rowOptions": [
        { "id": "uuid", "text": "Row 1" },
        { "id": "uuid", "text": "Row 2" }
      ],
      "columnOptions": [
        { "id": "uuid", "text": "Column 1" },
        { "id": "uuid", "text": "Column 2" }
      ]
    }
  ]
}
```

**Backend Implementation Notes:**

- Return `rowOptions` and `columnOptions` as separate arrays
- Each row/column should include an `id` and `text` field
- Empty arrays are acceptable for non-grid questions

---

### 🟡 OPTIONAL: GET /api/questions/{questionId}

**Endpoint:** `GET /api/questions/{questionId}`

**What Changed:** Should return `rowOptions` and `columnOptions` if it's a grid question

**Same response format as above**

## Testing Checklist

- [ ] Create a new grid question (multi-choice grid)
- [ ] Create a new grid question (checkbox grid)
- [ ] Add rows and columns to grid questions
- [ ] Edit row and column text
- [ ] Remove rows and columns
- [ ] Save grid questions to backend
- [ ] Load existing grid questions from backend
- [ ] Preview grid questions in survey preview
- [ ] Submit responses to grid questions
- [ ] Verify backward compatibility with old format (options[0].rowOptions)

## Database Schema Suggestion

### Option 1: Separate Tables (Recommended)

```sql
-- Questions table (existing)
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  survey_id UUID,
  question_text TEXT,
  question_type VARCHAR(50),
  -- ... other fields
);

-- New table for grid rows
CREATE TABLE question_grid_rows (
  id UUID PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- New table for grid columns
CREATE TABLE question_grid_columns (
  id UUID PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Option 2: JSON Fields (Alternative)

```sql
-- Add to existing questions table
ALTER TABLE questions
ADD COLUMN row_options JSONB,
ADD COLUMN column_options JSONB;

-- Example data:
-- row_options: [{"id": "uuid", "text": "Row 1"}, {"id": "uuid", "text": "Row 2"}]
-- column_options: [{"id": "uuid", "text": "Col 1"}, {"id": "uuid", "text": "Col 2"}]
```

## Migration Notes

The frontend now supports BOTH formats for backward compatibility:

1. **New format** (preferred): `question.rowOptions` and `question.columnOptions`
2. **Old format** (legacy): `question.options[0].rowOptions` and `question.options[0].columnOptions`

The backend should be updated to:

1. Accept rowOptions/columnOptions as separate fields in POST/PUT requests
2. Return rowOptions/columnOptions as separate fields in GET responses
3. Optionally maintain backward compatibility by also populating options[0] for old clients

### Migration Steps for Backend:

1. **Update database schema** (add tables or JSON columns)
2. **Update POST /api/questions** endpoint to accept and store rowOptions/columnOptions
3. **Update PUT /api/questions/{id}** endpoint to accept and update rowOptions/columnOptions
4. **Update GET endpoints** to return rowOptions/columnOptions
5. **Migrate existing data** from options[0] to separate fields (if any exists)
6. **Test with frontend** to ensure compatibility
