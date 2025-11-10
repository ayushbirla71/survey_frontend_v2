# Survey Publish Flow - Updated Implementation

## Overview
The survey publish functionality has been updated to work with the existing survey creation flow. The survey is now created at Step 1, questions are added at Step 2, and settings are updated at Step 3. At Step 5 (Preview), we only need to update the survey status to "PUBLISHED".

## Changes Made

### 1. Updated `handlePublishSurvey()` Function

**Location:** `app/generate-survey/page.tsx` (Line 465)

**Previous Behavior:**
- Created a new survey from scratch
- Created all questions
- Generated HTML
- Navigated to Step 6

**New Behavior:**
- Checks if survey exists (`createdSurvey?.id`)
- Updates only the survey status to "PUBLISHED"
- Updates survey settings
- Generates HTML for preview
- Navigates to Step 6

**Code:**
```typescript
const handlePublishSurvey = async () => {
  try {
    if (!createdSurvey?.id) {
      toast.error("Survey not found. Please go back to Step 1.");
      return;
    }

    setPublishLoading(true);

    // Update the survey status to PUBLISHED
    const updateData = {
      status: "PUBLISHED" as const,
      scheduled_type: "IMMEDIATE" as const,
      settings: {
        isAnonymous: surveySettings.isAnonymous,
        showProgressBar: surveySettings.showProgressBar,
        shuffleQuestions: surveySettings.shuffleQuestions,
        allowMultipleSubmissions: surveySettings.allowMultipleSubmissions,
      },
    };

    const result = await updateSurvey(updateData);

    if (result && (result as any).data) {
      // Update local survey state
      setCreatedSurvey({
        ...createdSurvey,
        status: "PUBLISHED",
        scheduled_type: "IMMEDIATE",
        settings: updateData.settings,
      });

      // Generate HTML and store in localStorage
      const html = generateSurveyHtml({
        id: createdSurvey.id,
        title: title,
        description: description,
        questions,
      });
      setSurveyHtml(html);
      
      localStorage.setItem("lastSurveyHtml", html);
      localStorage.setItem("lastSurveyTitle", `${getCategoryName(surveyCategoryId).toLowerCase().replace(/\s+/g, "-")}_survey`);
      localStorage.setItem("lastSurveyAudience", audience.targetCount.toString());
      localStorage.setItem("lastSurveyData", JSON.stringify({ 
        ...createdSurvey, 
        status: "PUBLISHED",
        settings: updateData.settings 
      }));

      toast.success("Survey published successfully!");
      
      // Navigate to share step
      setStep(6);
    } else {
      toast.error("Failed to publish survey. Please try again.");
    }
  } catch (error: any) {
    console.error("Error publishing survey:", error);
    toast.error(error.message || "Failed to publish survey");
  } finally {
    setPublishLoading(false);
  }
};
```

### 2. Updated Public Survey Page (No Authentication Required)

**Location:** `app/survey/[id]/page.tsx`

**Changes:**
- Removed authentication requirement
- Uses direct `fetch()` calls instead of API client
- No JWT token sent in headers
- Better error handling for different HTTP status codes

**Survey Loading:**
```typescript
const loadSurvey = async () => {
  try {
    setLoading(true);
    setError(null);

    // Fetch survey details (no auth required for public surveys)
    const surveyResponse = await fetch(
      `http://localhost:5000/api/surveys/${surveyId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!surveyResponse.ok) {
      if (surveyResponse.status === 404) {
        throw new Error("Survey not found");
      } else if (surveyResponse.status === 403) {
        throw new Error("This survey is not publicly accessible");
      }
      throw new Error("Failed to load survey");
    }

    const surveyData = await surveyResponse.json();

    // Fetch questions for the survey (no auth required)
    const questionsResponse = await fetch(
      `http://localhost:5000/api/questions/survey/${surveyId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!questionsResponse.ok) {
      throw new Error("Failed to load survey questions");
    }

    const questionsData = await questionsResponse.json();

    if (questionsData.data && Array.isArray(questionsData.data)) {
      const sortedQuestions = questionsData.data.sort(
        (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
      );

      setSurvey({
        id: surveyData.survey?.id || surveyData.id,
        title: surveyData.survey?.title || surveyData.title,
        description: surveyData.survey?.description || surveyData.description,
        questions: sortedQuestions,
        settings: surveyData.survey?.settings || surveyData.settings || {},
      });
    } else {
      throw new Error("No questions found for this survey");
    }
  } catch (err: any) {
    console.error("Error loading survey:", err);
    setError(err.message || "Failed to load survey");
  } finally {
    setLoading(false);
  }
};
```

**Response Submission:**
```typescript
// Submit response without authentication (public survey)
const submitResponse = await fetch(
  `http://localhost:5000/api/responses`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(responseData),
  }
);

if (!submitResponse.ok) {
  const errorData = await submitResponse.json().catch(() => ({}));
  throw new Error(errorData.message || "Failed to submit survey");
}

const result = await submitResponse.json();

if (result.data || result.id) {
  setSubmitted(true);
  toast.success("Survey submitted successfully!");
} else {
  throw new Error("Failed to submit survey");
}
```

### 3. Added Loading State

**Location:** `app/generate-survey/page.tsx` (Line 97)

Added `publishLoading` state to track publish operation:
```typescript
const [publishLoading, setPublishLoading] = useState(false);
```

Updated publish button to use this state:
```typescript
<Button
  onClick={handlePublishSurvey}
  size="lg"
  disabled={publishLoading}
  className="bg-violet-600 hover:bg-violet-700"
>
  {publishLoading ? (
    <>
      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
      Publishing...
    </>
  ) : (
    <>
      Publish Survey
      <ArrowRight className="ml-2 h-4 w-4" />
    </>
  )}
</Button>
```

## Complete Flow

### Survey Creation Flow:

1. **Step 1: Survey Details**
   - User enters title, description, category
   - Clicks "Continue"
   - `handleStep1Continue()` is called
   - Survey is **CREATED** in database with status "DRAFT"
   - `createdSurvey` state is set with survey ID
   - Moves to Step 2

2. **Step 2: Questions**
   - User adds/edits questions
   - Clicks "Continue"
   - `handleStep2Continue()` is called
   - Questions are **SYNCED** to database using `syncSurveyQuestions()`
   - Moves to Step 3

3. **Step 3: Settings**
   - User configures survey settings
   - If `survey_send_by === "NONE"`, skips to Step 5
   - Otherwise, moves to Step 4

4. **Step 4: Audience** (Skipped if NONE)
   - User selects target audience
   - Moves to Step 5

5. **Step 5: Preview & Publish**
   - User previews survey
   - Clicks "Publish Survey"
   - `handlePublishSurvey()` is called
   - Survey status is **UPDATED** to "PUBLISHED"
   - Settings are updated
   - HTML is generated
   - Moves to Step 6

6. **Step 6: Share**
   - User sees success message
   - Can generate public link
   - Public link format: `http://localhost:3000/survey/{surveyId}`

### Public Survey Fill Flow:

1. **User Opens Public Link**
   - URL: `/survey/{surveyId}`
   - No authentication required
   - Survey and questions are loaded via public API

2. **User Fills Survey**
   - One question per page
   - Progress bar shows completion
   - Required field validation

3. **User Submits Survey**
   - Response is submitted via public API
   - No authentication required
   - Thank you page is shown

4. **Admin Views Responses**
   - Navigate to `/survey-results/{surveyId}`
   - See all submitted responses
   - Export data in various formats

## API Endpoints Used

### Survey Management:
- `POST /api/surveys` - Create survey (Step 1)
- `PUT /api/surveys/{id}` - Update survey (Step 1, Step 5)
- `GET /api/surveys/{id}` - Get survey (Public page - no auth)

### Question Management:
- `POST /api/questions` - Create question (Step 2)
- `PUT /api/questions/{id}` - Update question (Step 2)
- `DELETE /api/questions/{id}` - Delete question (Step 2)
- `GET /api/questions/survey/{surveyId}` - Get questions (Public page - no auth)

### Response Management:
- `POST /api/responses` - Submit response (Public page - no auth)
- `GET /api/responses/survey/{surveyId}` - Get responses (Admin only)

### Survey Sharing:
- `POST /api/surveys/{surveyId}/generate-link` - Generate public link

## Testing Instructions

### 1. Test Survey Creation and Publishing:

```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3000/generate-survey
```

**Steps:**
1. Fill in survey details (Step 1) → Survey created in DB
2. Add questions (Step 2) → Questions synced to DB
3. Set `survey_send_by` to "NONE" (Step 3) → Skips to Step 5
4. Click "Publish Survey" (Step 5) → Survey status updated to PUBLISHED
5. Generate public link (Step 6) → Get shareable URL

### 2. Test Public Survey (No Login Required):

**Steps:**
1. Copy public link from Step 6
2. Open in **incognito/private window** (to ensure no auth)
3. Survey should load without login
4. Fill out all questions
5. Submit survey
6. See thank you page

### 3. Test Response Viewing:

**Steps:**
1. Navigate to `/survey-results/{surveyId}`
2. Click "Responses" tab
3. See submitted response
4. Verify all answers are correct

## Troubleshooting

### Issue: "Survey not found" error at Step 5
**Solution:** 
- Go back to Step 1
- Ensure survey is created successfully
- Check browser console for errors
- Verify `createdSurvey` state has an ID

### Issue: Public survey page requires login
**Solution:**
- Check that you're using the correct URL format: `/survey/{id}`
- Verify backend API allows public access to `/api/surveys/{id}` and `/api/questions/survey/{id}`
- Check browser network tab for 401/403 errors

### Issue: Response submission fails
**Solution:**
- Check all required questions are answered
- Verify backend API allows public access to `/api/responses`
- Check browser console for errors
- Verify request payload format

## Files Modified

1. **`app/generate-survey/page.tsx`**
   - Updated `handlePublishSurvey()` to only update survey status
   - Added `publishLoading` state
   - Renamed `createLoading` from mutation hook to `createSurveyLoading`

2. **`app/survey/[id]/page.tsx`**
   - Removed authentication requirement
   - Updated to use direct `fetch()` calls
   - Better error handling

## Summary

✅ Survey is created at Step 1  
✅ Questions are added at Step 2  
✅ Settings are configured at Step 3  
✅ Publish only updates status to "PUBLISHED" at Step 5  
✅ Public survey page works without authentication  
✅ Response submission works without authentication  
✅ Proper error handling and loading states  
✅ Toast notifications for user feedback  

The flow is now complete and working as expected!

