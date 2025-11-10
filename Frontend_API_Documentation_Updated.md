# Survey Platform API - Frontend Documentation (Updated)

## Overview

This document provides comprehensive API documentation for frontend developers working with the Survey Platform Backend v2. The API is built with Express.js, uses Prisma ORM, and implements JWT authentication for protected endpoints.

## Base URL

```
Development: http://localhost:5000
Production: [Your production URL]
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

1. Register a new user or login with existing credentials
2. Receive JWT token in response
3. Include token in subsequent API requests

---

## API Endpoints

### 1. Authentication Endpoints

#### POST /api/auth/signup - Register User

**Description:** Register a new user account

**Authentication:** Not required

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "mobile_no": "9876543210",
  "password": "password123",
  "role": "USER",
  "theme": "LIGHT"
}
```

**Response (201 Created):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-string",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (400):**

```json
{
  "message": "User already exists"
}
```

---

#### POST /api/auth/login - Login User

**Description:** Authenticate existing user

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid-string",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**

```json
{
  "message": "Invalid credentials"
}
```

---

### 2. Survey Endpoints

#### POST /api/surveys - Create Survey

**Description:** Create a new survey

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "title": "Customer Satisfaction Survey",
  "description": "Please rate your experience with our service",
  "flow_type": "STATIC",
  "survey_send_by": "EMAIL",
  "status": "DRAFT",
  "scheduled_type": "IMMEDIATE",
  "surveyCategoryId": null,
  "autoGenerateQuestions": false,
  "settings": {}
}
```

**Response (201 Created):**

```json
{
  "message": "Survey created",
  "survey": {
    "id": "uuid-string",
    "title": "Customer Satisfaction Survey",
    "description": "Please rate your experience with our service",
    "userId": "user-uuid",
    "no_of_questions": 0,
    "survey_send_by": "EMAIL",
    "flow_type": "STATIC",
    "status": "DRAFT",
    "scheduled_type": "IMMEDIATE",
    "is_deleted": false,
    "created_at": "2024-10-21T10:00:00Z",
    "updated_at": "2024-10-21T10:00:00Z"
  }
}
```

---

#### GET /api/surveys - Get All Surveys

**Description:** Get all surveys for the logged-in user

**Authentication:** Required (Bearer token)

**Response (200 OK):**

```json
{
  "surveys": [
    {
      "id": "uuid-string",
      "title": "Customer Satisfaction Survey",
      "description": "Please rate your experience",
      "no_of_questions": 5,
      "status": "PUBLISHED",
      "created_at": "2024-10-21T10:00:00Z",
      "questions": [...]
    }
  ]
}
```

---

#### GET /api/surveys/{id} - Get Survey by ID

**Description:** Get a specific survey by ID

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `id` (string, required): Survey ID

**Response (200 OK):**

```json
{
  "survey": {
    "id": "uuid-string",
    "title": "Customer Satisfaction Survey",
    "description": "Please rate your experience",
    "no_of_questions": 5,
    "status": "PUBLISHED",
    "created_at": "2024-10-21T10:00:00Z"
  }
}
```

**Error Response (404):**

```json
{
  "message": "Survey not found"
}
```

---

#### PUT /api/surveys/{id} - Update Survey

**Description:** Update an existing survey

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `id` (string, required): Survey ID

**Request Body:**

```json
{
  "title": "Updated Survey Title",
  "description": "Updated description",
  "status": "PUBLISHED"
}
```

**Response (200 OK):**

```json
{
  "message": "Survey updated"
}
```

---

#### DELETE /api/surveys/{id} - Delete Survey

**Description:** Delete a survey (soft delete)

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `id` (string, required): Survey ID

**Response (200 OK):**

```json
{
  "message": "Survey deleted"
}
```

---

### 3. Question Endpoints

#### POST /api/questions - Create Question

**Description:** Create a new question for a survey

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "surveyId": "survey-uuid",
  "question_type": "TEXT",
  "question_text": "What is your name?",
  "order_index": 1,
  "required": true,
  "categoryId": null,
  "options": []
}
```

**Response (201 Created):**

```json
{
  "message": "Question created successfully",
  "question": {
    "id": "uuid-string",
    "surveyId": "survey-uuid",
    "question_type": "TEXT",
    "question_text": "What is your name?",
    "order_index": 1,
    "required": true,
    "options": [],
    "created_at": "2024-10-21T10:00:00Z"
  }
}
```

---

#### GET /api/questions/survey/{surveyId} - Get Questions by Survey

**Description:** Get all questions for a specific survey

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `surveyId` (string, required): Survey ID

**Response (200 OK):**

```json
{
  "questions": [
    {
      "id": "uuid-string",
      "surveyId": "survey-uuid",
      "question_type": "TEXT",
      "question_text": "What is your name?",
      "order_index": 1,
      "required": true,
      "options": [],
      "created_at": "2024-10-21T10:00:00Z"
    }
  ]
}
```

---

#### PUT /api/questions/{id} - Update Question

**Description:** Update an existing question

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `id` (string, required): Question ID

**Request Body:**

```json
{
  "question_text": "Updated question text",
  "required": false
}
```

**Response (200 OK):**

```json
{
  "message": "Question updated",
  "question": {
    "id": "uuid-string",
    "question_text": "Updated question text",
    "required": false
  }
}
```

---

#### DELETE /api/questions/{id} - Delete Question

**Description:** Delete a question

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `id` (string, required): Question ID

**Response (200 OK):**

```json
{
  "message": "Question deleted"
}
```

---

### 4. Response Endpoints

#### POST /api/responses - Submit Response

**Description:** Submit a response to a survey

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "surveyId": "survey-uuid",
  "user_metadata": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "answers": [
    {
      "questionId": "question-uuid",
      "answer_value": "My answer"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "message": "Response submitted",
  "response": {
    "id": "uuid-string",
    "surveyId": "survey-uuid",
    "user_metadata": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "response_answers": [
      {
        "id": "uuid-string",
        "questionId": "question-uuid",
        "answer_value": "My answer",
        "submitted_at": "2024-10-21T10:00:00Z"
      }
    ],
    "created_at": "2024-10-21T10:00:00Z"
  }
}
```

---

#### POST /api/responses/submit-token - Submit Response with Token

**Description:** Submit a response using a share token (no authentication required)

**Authentication:** Not required

**Request Body:**

```json
{
  "token": "share-token-hash",
  "user_metadata": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "answers": [
    {
      "questionId": "question-uuid",
      "answer_value": "My answer"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "message": "Response submitted",
  "response": {
    "id": "uuid-string",
    "surveyId": "survey-uuid",
    "response_answers": [...]
  }
}
```

**Error Response (400):**

```json
{
  "message": "Invalid or used token"
}
```

---

#### GET /api/responses/survey/{surveyId} - Get Responses by Survey

**Description:** Get all responses for a specific survey

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `surveyId` (string, required): Survey ID

**Response (200 OK):**

```json
{
  "responses": [
    {
      "id": "uuid-string",
      "surveyId": "survey-uuid",
      "user_metadata": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "response_answers": [...]
    }
  ]
}
```

---

### 5. Share Endpoints

#### POST /api/share - Share Survey

**Description:** Share survey publicly or with specific recipients

**Authentication:** Required (Bearer token)

**Request Body (Public Share):**

```json
{
  "surveyId": "survey-uuid",
  "type": "PUBLIC",
  "recipients": []
}
```

**Request Body (Personalized Share):**

```json
{
  "surveyId": "survey-uuid",
  "type": "PERSONALIZED",
  "recipients": [
    {
      "email": "recipient@example.com",
      "mobile_no": "9876543210"
    }
  ]
}
```

**Response (200 OK - Public):**

```json
{
  "message": "Survey shared publicly",
  "link": "http://localhost:3000/survey/token-hash"
}
```

**Response (200 OK - Personalized):**

```json
{
  "message": "Survey shared with recipients",
  "shareTokens": [
    {
      "id": "uuid-string",
      "surveyId": "survey-uuid",
      "token_hash": "token-hash",
      "recipient_email": "recipient@example.com",
      "used": false,
      "created_at": "2024-10-21T10:00:00Z"
    }
  ]
}
```

---

#### GET /api/share/validate/{token} - Validate Share Token

**Description:** Validate a share token and get survey info

**Authentication:** Not required

**Path Parameters:**

- `token` (string, required): Share token hash

**Response (200 OK):**

```json
{
  "surveyId": "survey-uuid",
  "survey": {
    "id": "survey-uuid",
    "title": "Customer Satisfaction Survey",
    "description": "Please rate your experience"
  }
}
```

**Error Response (404):**

```json
{
  "message": "Invalid or used token"
}
```

---

### 6. Analytics Endpoints

#### GET /api/analytics/survey/{surveyId} - Get Survey Analytics

**Description:** Get analytics for a specific survey

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `surveyId` (string, required): Survey ID

**Response (200 OK):**

```json
{
  "surveyId": "survey-uuid",
  "totalResponses": 25,
  "totalQuestions": 5,
  "avgCompletionRate": 0.95
}
```

---

#### GET /api/analytics/survey/{surveyId}/questions - Get Question Analytics

**Description:** Get analytics for all questions in a survey

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `surveyId` (string, required): Survey ID

**Response (200 OK):**

```json
{
  "surveyId": "survey-uuid",
  "analytics": [
    {
      "questionId": "question-uuid",
      "question_text": "What is your satisfaction level?",
      "totalAnswers": 25,
      "answerDistribution": {
        "Very Satisfied": 15,
        "Satisfied": 8,
        "Neutral": 2
      }
    }
  ]
}
```

---

#### GET /api/analytics/survey/{surveyId}/audience - Get Audience Analytics

**Description:** Get audience analytics for a survey

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `surveyId` (string, required): Survey ID

**Response (200 OK):**

```json
{
  "surveyId": "survey-uuid",
  "totalAudience": 50,
  "respondedAudience": 25,
  "responseRate": 50
}
```

---

### 6.5. AI Questions Endpoints

#### GET /api/ai-questions/survey/{surveyId} - Get AI Questions by Survey

**Description:** Get all AI-generated questions for a survey

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `surveyId` (string, required): Survey ID

**Response (200 OK):**

```json
{
  "aiQuestions": [
    {
      "id": "uuid-string",
      "surveyId": "survey-uuid",
      "question_type": "TEXT",
      "question_text": "What is your feedback?",
      "options": [],
      "order_index": 1,
      "required": true,
      "ai_prompt": "Generate a feedback question",
      "ai_model": "gpt-3.5-turbo",
      "confidence_score": 0.95,
      "is_approved": false,
      "is_added_to_survey": false,
      "created_at": "2024-10-21T10:00:00Z"
    }
  ]
}
```

---

#### POST /api/ai-questions - Create AI Question

**Description:** Create an AI-generated question manually

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "surveyId": "survey-uuid",
  "question_type": "TEXT",
  "question_text": "What is your feedback?",
  "options": [],
  "order_index": 1,
  "required": true,
  "ai_prompt": "Generate a feedback question",
  "ai_model": "gpt-3.5-turbo",
  "confidence_score": 0.95
}
```

**Response (201 Created):**

```json
{
  "message": "AI question created",
  "aiQuestion": {
    "id": "uuid-string",
    "surveyId": "survey-uuid",
    "question_type": "TEXT",
    "question_text": "What is your feedback?",
    "is_approved": false,
    "is_added_to_survey": false
  }
}
```

---

#### PUT /api/ai-questions/{id} - Update AI Question

**Description:** Update an AI-generated question

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `id` (string, required): AI Question ID

**Request Body:**

```json
{
  "question_text": "Updated question text",
  "is_approved": true
}
```

**Response (200 OK):**

```json
{
  "message": "AI question updated",
  "aiQuestion": {
    "id": "uuid-string",
    "question_text": "Updated question text",
    "is_approved": true
  }
}
```

---

#### DELETE /api/ai-questions/{id} - Delete AI Question

**Description:** Delete an AI-generated question

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `id` (string, required): AI Question ID

**Response (200 OK):**

```json
{
  "message": "AI question deleted"
}
```

---

#### POST /api/ai-questions/approve - Approve AI Questions

**Description:** Approve AI-generated questions and optionally add them to survey

**Authentication:** Required (Bearer token)

**Query Parameters:**

- `addToSurvey` (boolean, optional): Whether to add approved questions to survey

**Request Body:**

```json
{
  "questionIds": ["question-uuid-1", "question-uuid-2"]
}
```

**Response (200 OK):**

```json
{
  "message": "2 questions approved and added to survey",
  "approvedCount": 2
}
```

---

#### POST /api/ai-questions/survey/{surveyId}/add - Add AI Questions to Survey

**Description:** Bulk add approved AI questions to survey

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `surveyId` (string, required): Survey ID

**Request Body:**

```json
{
  "questionIds": ["question-uuid-1", "question-uuid-2"]
}
```

**Response (200 OK):**

```json
{
  "message": "2 questions added to survey",
  "addedCount": 2
}
```

---

### 7. Categories Endpoints

#### POST /api/categories/createSurveyCategory - Create Survey Category

**Description:** Create a new survey category

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "name": "Customer Feedback"
}
```

**Response (201 Created):**

```json
{
  "message": "Category created",
  "categories": {
    "id": "uuid-string",
    "name": "Customer Feedback"
  }
}
```

---

#### GET /api/categories/getSurveyCategory - Get Survey Categories

**Description:** Get all survey categories

**Authentication:** Required (Bearer token)

**Response (200 OK):**

```json
{
  "categories": [
    {
      "id": "uuid-string",
      "name": "Customer Feedback"
    }
  ]
}
```

---

#### POST /api/categories/createQuestionCategory - Create Question Category

**Description:** Create a new question category

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "type_name": "Multiple Choice"
}
```

**Response (200 OK):**

```json
{
  "message": "Created successfully",
  "data": {
    "id": "uuid-string",
    "type_name": "Multiple Choice"
  }
}
```

---

#### GET /api/categories/getQuestionCategory - Get Question Categories

**Description:** Get all question categories

**Authentication:** Required (Bearer token)

**Response (200 OK):**

```json
{
  "categories": [
    {
      "id": "uuid-string",
      "type_name": "Multiple Choice"
    }
  ]
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "message": "Error description"
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Data Models

### User Model

```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "mobile_no": "string (optional)",
  "password": "string (hashed)",
  "role": "USER | SYSTEM_ADMIN",
  "theme": "LIGHT | DARK",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Survey Model

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string (optional)",
  "userId": "uuid",
  "no_of_questions": "integer",
  "survey_send_by": "WHATSAPP | EMAIL | BOTH | NONE",
  "flow_type": "STATIC | INTERACTIVE | GAME",
  "status": "DRAFT | SCHEDULED | PUBLISHED",
  "scheduled_type": "IMMEDIATE | SCHEDULED",
  "scheduled_date": "datetime (optional)",
  "is_deleted": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Question Model

```json
{
  "id": "uuid",
  "surveyId": "uuid",
  "question_type": "TEXT | IMAGE | VIDEO | AUDIO",
  "question_text": "string",
  "order_index": "integer",
  "required": "boolean",
  "categoryId": "uuid (optional)",
  "mediaId": "uuid (optional)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Response Model

```json
{
  "id": "uuid",
  "surveyId": "uuid",
  "user_metadata": "json",
  "created_at": "datetime"
}
```

---

## Best Practices

1. **Always include authentication token** for protected endpoints
2. **Validate input data** before sending requests
3. **Handle errors gracefully** with appropriate error messages
4. **Store tokens securely** (localStorage, sessionStorage, or secure cookies)
5. **Implement token refresh** logic for expired tokens
6. **Use environment variables** for API base URL and sensitive data
7. **Implement proper error handling** and user feedback
8. **Test all endpoints** before deploying to production

---

## Support

For questions or issues:

- Check the documentation files
- Review the Postman collection examples
- Check server logs for debugging
- Contact the development team
