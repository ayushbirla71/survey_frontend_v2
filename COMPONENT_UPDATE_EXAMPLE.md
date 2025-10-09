# Component Update Example

This document shows how to update React components to work with the new API structure.

## Example: Survey Creation Component

### Before (Old API Structure)
```typescript
// app/generate-survey/page.tsx - OLD VERSION
import { categoriesApi, surveyApi, questionGenerationApi } from "@/lib/api";

export default function GenerateSurvey() {
  // Old survey creation with legacy structure
  const createSurvey = async () => {
    const surveyData = {
      title,
      description: prompt,
      category,
      questions: questions.map(q => ({
        type: q.type,
        question: q.question,
        options: q.options,
        required: q.required
      })),
      audience: {
        ageGroups: audience.ageGroups,
        genders: audience.genders,
        locations: audience.locations,
        industries: audience.industries,
        targetCount: audience.targetCount,
        dataSource: audience.dataSource
      }
    };

    const response = await surveyApi.createSurvey(surveyData);
    if (response.success) {
      // Handle success
    }
  };
}
```

### After (New API Structure)
```typescript
// app/generate-survey/page.tsx - NEW VERSION
import { surveyApi, questionApi, authApi } from "@/lib/api";
import type { Survey, Question } from "@/lib/api";

export default function GenerateSurvey() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Step 1: Create survey with new structure
  const createSurvey = async () => {
    const surveyData = {
      title,
      description: prompt,
      flow_type: "STATIC" as const,
      survey_send_by: "EMAIL" as const,
      settings: {
        isAnonymous: false,
        showProgressBar: true,
        shuffleQuestions: false
      },
      status: "DRAFT" as const,
      scheduled_type: "IMMEDIATE" as const
    };

    const response = await surveyApi.createSurvey(surveyData);
    if (response.data) {
      setSurvey(response.data);
      // Move to next step
    } else {
      console.error("Survey creation failed:", response.error);
    }
  };

  // Step 2: Create questions separately
  const createQuestions = async (surveyId: string) => {
    const questionPromises = questions.map(async (q, index) => {
      const questionData = {
        surveyId,
        question_type: mapQuestionType(q.type), // Convert to new types
        question_text: q.question,
        options: q.options || [],
        categoryId: "default-category-id", // Need to get from categories API
        subCategoryId: "default-subcategory-id",
        order_index: index,
        required: q.required
      };

      return await questionApi.createQuestion(questionData);
    });

    const results = await Promise.all(questionPromises);
    const createdQuestions = results
      .filter(r => r.data)
      .map(r => r.data!);
    
    setQuestions(createdQuestions);
  };

  // Helper function to map old question types to new ones
  const mapQuestionType = (oldType: string) => {
    const typeMap = {
      'single_choice': 'MCQ',
      'checkbox': 'MCQ',
      'text': 'TEXT',
      'rating': 'RATING',
      'yes_no': 'MCQ'
    };
    return typeMap[oldType] || 'TEXT';
  };

  // Complete survey creation flow
  const handleSurveyCreation = async () => {
    try {
      // Step 1: Create survey
      await createSurvey();
      
      if (survey?.id) {
        // Step 2: Create questions
        await createQuestions(survey.id);
        
        // Step 3: Update survey status if needed
        await surveyApi.updateSurvey(survey.id, {
          status: "PUBLISHED"
        });
      }
    } catch (error) {
      console.error("Survey creation failed:", error);
    }
  };
}
```

## Key Changes Required

### 1. Import Updates
```typescript
// OLD
import { categoriesApi, surveyApi } from "@/lib/api";

// NEW
import { surveyApi, questionApi, authApi } from "@/lib/api";
import type { Survey, Question, User } from "@/lib/api";
```

### 2. State Management Updates
```typescript
// OLD
const [questions, setQuestions] = useState([]);

// NEW
const [questions, setQuestions] = useState<Question[]>([]);
const [survey, setSurvey] = useState<Survey | null>(null);
```

### 3. API Call Updates
```typescript
// OLD - Single API call with everything
const response = await surveyApi.createSurvey(allData);

// NEW - Separate calls for survey and questions
const surveyResponse = await surveyApi.createSurvey(surveyData);
const questionResponses = await Promise.all(
  questions.map(q => questionApi.createQuestion(q))
);
```

### 4. Error Handling Updates
```typescript
// OLD
if (response.success) {
  // Handle success
} else {
  console.error(response.error);
}

// NEW
if (response.data) {
  // Handle success
} else {
  console.error(response.error);
}
```

### 5. Form Data Mapping
```typescript
// OLD - Direct mapping
const surveyData = {
  title,
  category,
  questions: questions
};

// NEW - Map to new structure
const surveyData = {
  title,
  description: prompt,
  flow_type: "STATIC" as const,
  survey_send_by: "EMAIL" as const,
  settings: {
    isAnonymous: false,
    showProgressBar: true,
    shuffleQuestions: false
  },
  status: "DRAFT" as const
};
```

## Components That Need Updates

### High Priority
1. **Survey Creation** (`app/generate-survey/page.tsx`)
2. **Question Editor** (`components/question-editor.tsx`)
3. **Survey Results** (`app/survey-results/[id]/page.tsx`)
4. **Dashboard** (`app/page.tsx`)

### Medium Priority
1. **Audience Selector** (`components/audience-selector.tsx`)
2. **Survey Preview** (`components/survey-preview.tsx`)
3. **Sent Surveys** (`app/sent-surveys/page.tsx`)

### Low Priority
1. **Sidebar** (`components/sidebar.tsx`) - Minimal changes
2. **Theme Provider** (`components/theme-provider.tsx`) - No changes needed

## Migration Strategy

### Phase 1: Core Components
1. Update survey creation flow
2. Update question management
3. Test with demo data fallbacks

### Phase 2: Data Display
1. Update dashboard components
2. Update results display
3. Update audience components

### Phase 3: Polish
1. Add proper loading states
2. Improve error handling
3. Add form validation

## Testing Approach

### Unit Tests
```typescript
// Test API integration
describe('Survey Creation', () => {
  it('should create survey with new API structure', async () => {
    const mockSurvey = { id: '123', title: 'Test' };
    jest.spyOn(surveyApi, 'createSurvey').mockResolvedValue({ data: mockSurvey });
    
    // Test component
  });
});
```

### Integration Tests
1. Test complete survey creation flow
2. Test question management
3. Test error scenarios
4. Test fallback to demo data

The key is to update components gradually while maintaining backward compatibility through the demo data fallback system.
