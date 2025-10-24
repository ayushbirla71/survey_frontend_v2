# Enhanced Survey APIs Needed for Google Forms-Style Editor

This document lists the additional APIs needed to support the enhanced survey functionality with Google Forms-style question editor and public sharing.

## 1. Survey Sharing APIs

### Generate Public Link
```
POST /api/surveys/{surveyId}/generate-link
```

**Request Body:**
```json
{
  "expiresAt": "2024-12-31T23:59:59Z", // Optional
  "maxResponses": 1000, // Optional
  "requireAuth": false // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "publicUrl": "https://yourapp.com/survey/abc123",
    "shareCode": "ABC123",
    "expiresAt": "2024-12-31T23:59:59Z",
    "maxResponses": 1000
  }
}
```

### Get Share Settings
```
GET /api/surveys/{surveyId}/share-settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isPublic": true,
    "publicUrl": "https://yourapp.com/survey/abc123",
    "shareCode": "ABC123",
    "expiresAt": "2024-12-31T23:59:59Z",
    "maxResponses": 1000,
    "responseCount": 45
  }
}
```

### Update Share Settings
```
PUT /api/surveys/{surveyId}/share-settings
```

**Request Body:**
```json
{
  "isPublic": true,
  "expiresAt": "2024-12-31T23:59:59Z",
  "maxResponses": 1000,
  "requireAuth": false
}
```

### Revoke Public Link
```
DELETE /api/surveys/{surveyId}/public-link
```

## 2. Enhanced Question Types Support

### Additional Question Types Needed:
- `CHECKBOX` - Multiple choice (multiple selections)
- `DROPDOWN` - Dropdown selection
- `DATE` - Date picker
- `TIME` - Time picker
- `EMAIL` - Email input with validation
- `PHONE` - Phone number input
- `URL` - URL input with validation
- `NUMBER` - Number input

### Enhanced Question Schema
```json
{
  "id": "uuid",
  "surveyId": "uuid",
  "question_type": "MCQ",
  "question_text": "What is your favorite color?",
  "description": "Optional description for the question",
  "placeholder": "Enter your answer here...",
  "options": ["Red", "Blue", "Green", "Yellow"],
  "required": true,
  "order_index": 1,
  "validation": {
    "min": 1,
    "max": 10,
    "pattern": "^[a-zA-Z]+$"
  },
  "categoryId": "uuid"
}
```

## 3. Question Categories API Fix

### Current Issue:
The frontend expects: `/api/categories/getQuestionCategory`
But the API might be: `/api/categories/getQuestionCategorys`

### Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type_name": "Multiple Choice",
      "description": "Single selection from multiple options",
      "icon": "circle"
    }
  ]
}
```

## 4. Public Survey Access APIs

### Access Survey by Share Code
```
GET /api/public/survey/{shareCode}
```

### Submit Public Survey Response
```
POST /api/public/survey/{shareCode}/response
```

**Request Body:**
```json
{
  "responses": [
    {
      "questionId": "uuid",
      "answer": "Blue",
      "questionType": "MCQ"
    }
  ],
  "metadata": {
    "completionTime": 120
  }
}
```

## 5. Database Schema Updates Needed

### Questions Table
```sql
ALTER TABLE questions ADD COLUMN description TEXT;
ALTER TABLE questions ADD COLUMN placeholder TEXT;
ALTER TABLE questions ADD COLUMN validation JSON;
```

### Survey Sharing Table (New)
```sql
CREATE TABLE survey_shares (
  id UUID PRIMARY KEY,
  survey_id UUID REFERENCES surveys(id),
  share_code VARCHAR(10) UNIQUE,
  public_url TEXT,
  is_public BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  max_responses INTEGER,
  response_count INTEGER DEFAULT 0,
  require_auth BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 6. Implementation Priority

### High Priority (Core Functionality):
1. Fix question categories API endpoint
2. Support additional question types (CHECKBOX, DROPDOWN, etc.)
3. Enhanced question schema with description and placeholder

### Medium Priority (Enhanced Features):
1. Public link generation APIs
2. Share settings management
3. Public survey access endpoints

### Low Priority (Nice to Have):
1. Advanced validation rules
2. File upload support for media questions
3. Analytics and tracking

This completes the enhanced APIs needed for the Google Forms-style survey editor.
