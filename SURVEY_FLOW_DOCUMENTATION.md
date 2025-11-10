# Survey Platform - Complete Flow Documentation

## Overview
This document describes the complete survey creation, distribution, and response collection flow for the survey platform.

## Survey Creation Flow

### Step 1: Survey Details
**Location:** `app/generate-survey/page.tsx` (Step 1)

**Fields:**
- Survey Category (dropdown with search)
- Survey Title (text input)
- Survey Description (textarea)
- Auto-generate questions (checkbox)

**API Call:**
- `POST /api/surveys` - Creates a new survey or updates existing one
- Saves: title, description, surveyCategoryId, flow_type, survey_send_by

**Navigation:**
- Next → Step 2 (Questions)

---

### Step 2: Questions
**Location:** `app/generate-survey/page.tsx` (Step 2)

**Features:**
- Add/Edit/Delete questions
- Reorder questions via drag-and-drop
- Support for multiple question types:
  - Text (short answer, paragraph)
  - Multiple Choice (radio buttons)
  - Checkboxes (multiple selection)
  - Dropdown
  - Linear Scale
  - Rating
  - Date/Time
  - Grid types

**API Calls:**
- `POST /api/questions` - Create new questions
- `PUT /api/questions/{id}` - Update existing questions
- `DELETE /api/questions/{id}` - Delete questions

**Navigation:**
- Previous → Step 1
- Next → Step 3 (Settings)

---

### Step 3: Survey Settings
**Location:** `app/generate-survey/page.tsx` (Step 3)

**Fields:**
- Flow Type: STATIC | INTERACTIVE | GAME
- Distribution Method (survey_send_by): 
  - WHATSAPP
  - EMAIL
  - BOTH
  - **NONE** (Public Link Only)
- Anonymous responses (checkbox)
- Show progress bar (checkbox)
- Shuffle questions (checkbox)
- Allow multiple submissions (checkbox)

**Navigation Logic:**
- If `survey_send_by === "NONE"`:
  - Next → **Step 5** (Preview) - **SKIPS Step 4**
- Else:
  - Next → Step 4 (Audience)
- Previous → Step 2

---

### Step 4: Target Audience
**Location:** `app/generate-survey/page.tsx` (Step 4)

**Note:** This step is **SKIPPED** when `survey_send_by === "NONE"`

**Fields:**
- Age Groups
- Genders
- Locations
- Industries
- Target Count

**Navigation:**
- Previous → Step 3
- Next → Step 5 (Preview)

---

### Step 5: Preview & Publish
**Location:** `app/generate-survey/page.tsx` (Step 5)

**Features:**
- Live preview of the survey
- Shows all questions as they will appear to respondents
- Publish button to make survey live

**API Call:**
- `handlePublishSurvey()` - Publishes the survey with status "PUBLISHED"

**Navigation:**
- Previous → 
  - If `survey_send_by === "NONE"`: Go to Step 3
  - Else: Go to Step 4
- Publish → Step 6 (Share)

---

### Step 6: Share Survey
**Location:** `app/generate-survey/page.tsx` (Step 6)

**Features:**
- Success message
- Survey details summary
- **Public Link Generation** (when `survey_send_by === "NONE"`):
  - Button to generate public link
  - Displays shareable URL: `{domain}/survey/{surveyId}`
  - Share code for easy access
  - Copy to clipboard functionality
  - Preview survey button
  - Share via email button

**API Call:**
- `POST /api/surveys/{surveyId}/generate-link` - Generates public link
- Fallback: Creates local URL if API fails

**Actions:**
- View Dashboard → `/`
- View Responses → `/survey-results/{surveyId}`

---

## Public Survey Fill Flow

### Survey Fill Page
**Location:** `app/survey/[id]/page.tsx`

**URL Format:** `/survey/{surveyId}`

**Features:**
1. **Survey Loading:**
   - Fetches survey details from `GET /api/surveys/{surveyId}`
   - Fetches questions from `GET /api/questions/survey/{surveyId}`
   - Sorts questions by `order_index`

2. **Question Display:**
   - One question per page
   - Progress bar showing completion percentage
   - Question counter (e.g., "Question 1 of 10")
   - Required field indicator (*)

3. **Question Types Support:**
   - Text input (short answer)
   - Textarea (paragraph)
   - Radio buttons (multiple choice)
   - Checkboxes (multiple selection)
   - All question types from the editor

4. **Navigation:**
   - Previous button (disabled on first question)
   - Next button (validates required fields)
   - Submit button (on last question)

5. **Validation:**
   - Required field validation
   - Shows error toast if required question not answered

6. **Submission:**
   - API Call: `POST /api/responses`
   - Payload:
     ```json
     {
       "surveyId": "uuid",
       "user_metadata": {},
       "answers": [
         {
           "questionId": "uuid",
           "answer_type": "TEXT",
           "answer_value": "user's answer"
         }
       ]
     }
     ```

7. **Thank You Page:**
   - Shown after successful submission
   - Success message with checkmark icon
   - Close button to exit

**Error Handling:**
- Survey not found → Shows error card
- Loading state → Shows spinner
- Submission error → Shows error toast

---

## Survey Results & Responses

### Survey Results Page
**Location:** `app/survey-results/[id]/page.tsx`

**URL Format:** `/survey-results/{surveyId}`

**Features:**

1. **Overview Tab:**
   - Total responses count
   - Completion rate
   - Average completion time
   - NPS score
   - Question-by-question results with charts
   - Response timeline

2. **Responses Tab:**
   - Individual response listing
   - Pagination support
   - Response details:
     - Response ID
     - Completion time
     - Submitted date
     - All answers

3. **Export Options:**
   - CSV
   - Excel
   - PDF
   - JSON

**API Calls:**
- `GET /api/surveys/{surveyId}/results` - Get aggregated results
- `GET /api/surveys/{surveyId}/responses` - Get individual responses (paginated)
- `GET /api/surveys/{surveyId}/export?format={format}` - Export data

---

## API Endpoints Summary

### Survey Management
- `POST /api/surveys` - Create survey
- `GET /api/surveys/{id}` - Get survey details
- `PUT /api/surveys/{id}` - Update survey
- `DELETE /api/surveys/{id}` - Delete survey

### Question Management
- `POST /api/questions` - Create question
- `GET /api/questions/survey/{surveyId}` - Get all questions for survey
- `PUT /api/questions/{id}` - Update question
- `DELETE /api/questions/{id}` - Delete question

### Response Management
- `POST /api/responses` - Submit survey response
- `GET /api/responses/survey/{surveyId}` - Get all responses for survey

### Survey Sharing
- `POST /api/surveys/{surveyId}/generate-link` - Generate public link
- `GET /api/surveys/{surveyId}/share-settings` - Get share settings
- `PUT /api/surveys/{surveyId}/share-settings` - Update share settings
- `DELETE /api/surveys/{surveyId}/public-link` - Revoke public link

### Survey Results
- `GET /api/surveys/{surveyId}/results` - Get aggregated results
- `GET /api/surveys/{surveyId}/responses` - Get individual responses
- `GET /api/surveys/{surveyId}/export` - Export survey data

---

## Key Files Modified/Created

### Modified Files:
1. **`app/generate-survey/page.tsx`**
   - Updated `nextStep()` function to skip Step 4 when `survey_send_by === "NONE"`
   - Updated `prevStep()` function to handle back navigation correctly
   - Updated `generatePublicLink()` to include fallback URL generation

### Created Files:
1. **`app/survey/[id]/page.tsx`**
   - Public survey fill page
   - Handles survey loading, question display, and response submission
   - Supports all question types
   - Includes validation and error handling

2. **`app/survey/[id]/loading.tsx`**
   - Loading state for survey page

3. **`SURVEY_FLOW_DOCUMENTATION.md`**
   - This documentation file

---

## Testing Checklist

### Survey Creation:
- [ ] Create survey with NONE distribution method
- [ ] Verify Step 4 is skipped
- [ ] Verify preview shows correctly at Step 5
- [ ] Verify publish creates survey successfully
- [ ] Verify Step 6 shows public link generation option

### Public Link:
- [ ] Generate public link
- [ ] Copy link to clipboard
- [ ] Open link in new tab
- [ ] Verify survey loads correctly

### Survey Fill:
- [ ] Navigate through all questions
- [ ] Test Previous/Next buttons
- [ ] Test required field validation
- [ ] Test different question types
- [ ] Submit survey
- [ ] Verify thank you page shows

### Response Viewing:
- [ ] Navigate to survey results page
- [ ] Verify responses are displayed
- [ ] Check individual response details
- [ ] Test export functionality

---

## Environment Variables

Make sure the following are configured:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Common Issues & Solutions

### Issue: Survey not loading on public page
**Solution:** Check that:
1. Survey ID is correct in URL
2. Survey exists in database
3. Questions are created for the survey
4. API endpoint is accessible

### Issue: Response submission fails
**Solution:** Check that:
1. All required questions are answered
2. Answer format matches API expectations
3. Survey ID is valid
4. API endpoint is accessible

### Issue: Public link not generating
**Solution:**
1. Check API endpoint `/api/surveys/{surveyId}/generate-link`
2. Fallback URL will be used if API fails
3. Check browser console for errors

---

## Future Enhancements

1. **Survey Analytics:**
   - Real-time response tracking
   - Advanced filtering and segmentation
   - Custom report generation

2. **Question Types:**
   - File upload
   - Signature capture
   - Location picker
   - Image choice

3. **Distribution:**
   - Email integration
   - WhatsApp integration
   - SMS integration
   - QR code generation

4. **Response Management:**
   - Response editing
   - Partial response saving
   - Response validation rules
   - Conditional logic

---

## Support

For issues or questions, please refer to:
- API Documentation: `Frontend_API_Documentation.md`
- Component Documentation: `COMPONENT_UPDATE_EXAMPLE.md`
- Backend APIs: `ENHANCED_APIS_NEEDED.md`

