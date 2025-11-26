# Survey Response Page - Grid Question Updates

## Overview
Updated the survey response page (`app/survey/[id]/page.tsx`) to support the new grid question structure where `rowOptions` and `columnOptions` are stored at the question level instead of nested inside `options[0]`.

## Changes Made

### 1. Updated Question Interface

**File:** `app/survey/[id]/page.tsx` (Lines 37-50)

**Added fields:**
```typescript
interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any[];
  required: boolean;
  order_index: number;
  categoryId?: string;
  rows?: any[];
  columns?: any[];
  rowOptions?: any[];      // ✅ NEW
  columnOptions?: any[];   // ✅ NEW
  allowMultipleInGrid?: boolean;
}
```

---

### 2. Updated inferFromOptions Function

**File:** `app/survey/[id]/page.tsx` (Lines 99-147)

**What Changed:** Now checks for question-level `rowOptions` and `columnOptions` first before falling back to the legacy format.

**Priority Order:**
1. ✅ **NEW:** Check `question.rowOptions` and `question.columnOptions` (preferred)
2. **LEGACY:** Check `options[0].rowOptions` and `options[0].columnOptions` (backward compatibility)
3. Check for grid pair references in options
4. Infer from other option properties

**Code:**
```typescript
function inferFromOptions(q: Question): GKind | null {
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
  
  // ... rest of the logic
}
```

---

### 3. Updated Multi-Choice Grid Rendering

**File:** `app/survey/[id]/page.tsx` (Lines 605-648)

**What Changed:** Now extracts rows and columns from question-level fields first, with fallback to legacy format.

**Before:**
```typescript
// Only checked options[0]
const first = opts[0];
const rows = first?.rowOptions?.map(...) ?? [];
const cols = first?.columnOptions?.map(...) ?? [];
```

**After:**
```typescript
// Check question-level first
let rows: { id: string; text: string }[] = [];
let cols: { id: string; text: string }[] = [];

if (Array.isArray(question.rowOptions) && question.rowOptions.length > 0) {
  rows = question.rowOptions.map((r: any, i: number) => ({
    id: r.id ?? `r-${i}`,
    text: r.text ?? `Row ${i + 1}`,
  }));
}

if (Array.isArray(question.columnOptions) && question.columnOptions.length > 0) {
  cols = question.columnOptions.map((c: any, j: number) => ({
    id: c.id ?? `c-${j}`,
    text: c.text ?? `Column ${j + 1}`,
  }));
}

// LEGACY: Fallback to options[0] if question-level not found
if (rows.length === 0 || cols.length === 0) {
  const first = opts[0];
  if (rows.length === 0 && first?.rowOptions) {
    rows = first.rowOptions.map(...);
  }
  if (cols.length === 0 && first?.columnOptions) {
    cols = first.columnOptions.map(...);
  }
}
```

---

### 4. Updated Checkbox Grid Rendering

**File:** `app/survey/[id]/page.tsx` (Lines 752-795)

**What Changed:** Same logic as multi-choice grid - checks question-level fields first with fallback to legacy format.

**Implementation:** Identical structure to multi-choice grid update (see above).

---

## Backward Compatibility

✅ **Fully backward compatible** - The page now supports BOTH formats:

1. **New format** (preferred): `question.rowOptions` and `question.columnOptions`
2. **Old format** (legacy): `question.options[0].rowOptions` and `question.options[0].columnOptions`

This ensures that:
- New grid questions created with the updated editor will display correctly
- Existing grid questions (if any) will continue to work
- The transition is seamless for users

---

## Testing Checklist

- [x] Updated Question interface to include rowOptions and columnOptions
- [x] Updated inferFromOptions to check question-level fields first
- [x] Updated multi-choice grid rendering
- [x] Updated checkbox grid rendering
- [x] Maintained backward compatibility with old format
- [ ] Test creating a new grid question and filling it out
- [ ] Test loading an existing grid question (if any exist)
- [ ] Test submitting grid question responses
- [ ] Verify grid displays correctly in the survey response page

---

## Related Files

All files updated for grid question refactoring:

1. ✅ `components/enhanced-question-editor.tsx` - Question creation/editing
2. ✅ `lib/question-sync.ts` - Question synchronization
3. ✅ `lib/api.ts` - API client
4. ✅ `app/generate-survey/page.tsx` - Survey generation
5. ✅ `components/survey-preview.tsx` - Survey preview
6. ✅ `app/survey/[id]/page.tsx` - Survey response page (THIS FILE)

---

## Next Steps

1. **Backend Updates Required:** Ensure backend API endpoints accept and return `rowOptions` and `columnOptions` as separate fields (see `GRID_QUESTION_REFACTORING_SUMMARY.md`)
2. **Testing:** Create a test grid question and verify it displays correctly in the survey response page
3. **Data Migration:** If there are existing grid questions in the database, migrate them to the new format

