# Survey Platform API - Frontend Documentation

## Overview

This document provides comprehensive API documentation for frontend developers working with the Survey Platform Backend v2. The API is built with Express.js and uses JWT authentication for protected endpoints.

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

## API Endpoints

### 1. Authentication

#### Register User

- **Endpoint:** `POST /api/auth/signup`
- **Authentication:** None required
- **Description:** Register a new user account

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "mobile_no": "1234567890",
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
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login User

- **Endpoint:** `POST /api/auth/login`
- **Authentication:** None required
- **Description:** Login with existing user credentials

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Surveys

#### Create Survey

- **Endpoint:** `POST /api/surveys`
- **Authentication:** Required
- **Description:** Create a new survey

**Request Body:**

```json
{
  "title": "Customer Satisfaction Survey",
  "description": "A survey to measure customer satisfaction",
  "flow_type": "STATIC",
  "survey_send_by": "EMAIL",
  "settings": {
    "isAnonymous": false,
    "showProgressBar": true,
    "shuffleQuestions": false
  },
  "status": "DRAFT",
  "scheduled_type": "IMMEDIATE",
  "categoryOfSurvey": "Customer Service",
  "autoGenerateQuestions": true
}
```

**Response (201 Created):**

```json
{
  "message": "Survey created",
  "survey": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Customer Satisfaction Survey",
    "description": "A survey to measure customer satisfaction",
    "flow_type": "STATIC",
    "survey_send_by": "EMAIL",
    "settings": {
      "isAnonymous": false,
      "showProgressBar": true,
      "shuffleQuestions": false
    },
    "status": "DRAFT",
    "scheduled_type": "IMMEDIATE",
    "categoryOfSurvey": "Customer Service",
    "autoGenerateQuestions": true,
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "aiGeneratedQuestions": [
    {
      "id": "ai-q-1",
      "question_type": "RATING",
      "question_text": "How would you rate your overall experience with our customer service? (1 = Very Poor, 5 = Excellent)",
      "options": [],
      "order_index": 1,
      "required": true,
      "ai_model": "gpt-3.5-turbo",
      "confidence_score": 0.8,
      "is_approved": false,
      "is_added_to_survey": false
    },
    {
      "id": "ai-q-2",
      "question_type": "MCQ",
      "question_text": "How did you first hear about our services?",
      "options": [
        "Social Media",
        "Search Engine",
        "Word of Mouth",
        "Advertisement",
        "Other"
      ],
      "order_index": 2,
      "required": true,
      "ai_model": "gpt-3.5-turbo",
      "confidence_score": 0.8,
      "is_approved": false,
      "is_added_to_survey": false
    }
  ]
}
```

#### Get All Surveys

- **Endpoint:** `GET /api/surveys`
- **Authentication:** Required
- **Description:** Get all surveys for the authenticated user

**Response (200 OK):**

```json
{
  "surveys": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Customer Satisfaction Survey",
      "description": "A survey to measure customer satisfaction",
      "flow_type": "STATIC",
      "survey_send_by": "EMAIL",
      "status": "DRAFT",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Survey by ID

- **Endpoint:** `GET /api/surveys/{surveyId}`
- **Authentication:** Required
- **Description:** Get a specific survey by ID

**Response (200 OK):**

```json
{
  "survey": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Customer Satisfaction Survey",
    "description": "A survey to measure customer satisfaction",
    "flow_type": "STATIC",
    "survey_send_by": "EMAIL",
    "settings": {
      "isAnonymous": false,
      "showProgressBar": true,
      "shuffleQuestions": false
    },
    "status": "DRAFT",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update Survey

- **Endpoint:** `PUT /api/surveys/{surveyId}`
- **Authentication:** Required
- **Description:** Update an existing survey

**Request Body:**

```json
{
  "title": "Updated Survey Title",
  "description": "Updated survey description",
  "status": "PUBLISHED"
}
```

**Response (200 OK):**

```json
{
  "message": "Survey updated"
}
```

#### Delete Survey

- **Endpoint:** `DELETE /api/surveys/{surveyId}`
- **Authentication:** Required
- **Description:** Soft delete a survey

**Response (200 OK):**

```json
{
  "message": "Survey deleted"
}
```

### 3. AI Generated Questions

#### Get AI Generated Questions for Survey

- **Endpoint:** `GET /api/ai-questions/survey/{surveyId}`
- **Authentication:** Required
- **Description:** Get all AI generated questions for a specific survey

**Response (200 OK):**

```json
{
  "aiQuestions": [
    {
      "id": "ai-q-1",
      "surveyId": "550e8400-e29b-41d4-a716-446655440001",
      "question_type": "RATING",
      "question_text": "How would you rate your overall experience?",
      "options": [],
      "order_index": 1,
      "required": true,
      "ai_prompt": "Generate survey questions...",
      "ai_model": "gpt-3.5-turbo",
      "confidence_score": 0.8,
      "is_approved": false,
      "is_added_to_survey": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Approve AI Generated Questions

- **Endpoint:** `POST /api/ai-questions/approve?addToSurvey=true`
- **Authentication:** Required
- **Description:** Approve AI generated questions and optionally add them to the survey

**Request Body:**

```json
{
  "questionIds": ["ai-q-1", "ai-q-2", "ai-q-3"]
}
```

**Response (200 OK):**

```json
{
  "message": "3 questions approved and added to survey",
  "approvedCount": 3
}
```

#### Add Approved Questions to Survey

- **Endpoint:** `POST /api/ai-questions/survey/{surveyId}/add`
- **Authentication:** Required
- **Description:** Add approved AI questions to the actual survey

**Request Body:**

```json
{
  "questionIds": ["ai-q-1", "ai-q-2"]
}
```

**Response (200 OK):**

```json
{
  "message": "2 questions added to survey",
  "addedCount": 2
}
```

### 4. Questions

#### Create Question

- **Endpoint:** `POST /api/questions`
- **Authentication:** Required
- **Description:** Create a new question for a survey

**Request Body:**

```json
{
  "surveyId": "550e8400-e29b-41d4-a716-446655440001",
  "question_type": "MCQ",
  "question_text": "What is your favorite programming language?",
  "options": ["JavaScript", "Python", "Java", "C++"],
  "media": [],
  "categoryId": "550e8400-e29b-41d4-a716-446655440002",
  "subCategoryId": "550e8400-e29b-41d4-a716-446655440003",
  "order_index": 1,
  "required": true
}
```

**Response (201 Created):**

```json
{
  "message": "Question created",
  "question": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "surveyId": "550e8400-e29b-41d4-a716-446655440001",
    "question_type": "MCQ",
    "question_text": "What is your favorite programming language?",
    "options": ["JavaScript", "Python", "Java", "C++"],
    "media": [],
    "order_index": 1,
    "required": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Questions by Survey

- **Endpoint:** `GET /api/questions/survey/{surveyId}`
- **Authentication:** Required
- **Description:** Get all questions for a specific survey

**Response (200 OK):**

```json
{
  "questions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "surveyId": "550e8400-e29b-41d4-a716-446655440001",
      "question_type": "MCQ",
      "question_text": "What is your favorite programming language?",
      "options": ["JavaScript", "Python", "Java", "C++"],
      "media": [],
      "order_index": 1,
      "required": true
    }
  ]
}
```

#### Update Question

- **Endpoint:** `PUT /api/questions/{questionId}`
- **Authentication:** Required
- **Description:** Update an existing question

**Request Body:**

```json
{
  "question_text": "Updated question text",
  "options": ["Option 1", "Option 2", "Option 3"],
  "required": false
}
```

**Response (200 OK):**

```json
{
  "message": "Question updated",
  "question": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "question_text": "Updated question text",
    "options": ["Option 1", "Option 2", "Option 3"],
    "required": false,
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Delete Question

- **Endpoint:** `DELETE /api/questions/{questionId}`
- **Authentication:** Required
- **Description:** Delete a question

**Response (200 OK):**

```json
{
  "message": "Question deleted"
}
```

### 4. Responses

#### Submit Response

- **Endpoint:** `POST /api/responses`
- **Authentication:** Required
- **Description:** Submit a response to a survey

**Request Body:**

```json
{
  "surveyId": "550e8400-e29b-41d4-a716-446655440001",
  "user_metadata": {
    "age": 25,
    "location": "New York"
  },
  "answers": [
    {
      "questionId": "550e8400-e29b-41d4-a716-446655440004",
      "answer_type": "multiple_choice",
      "answer_value": "JavaScript",
      "media": []
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "message": "Response submitted",
  "response": {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "surveyId": "550e8400-e29b-41d4-a716-446655440001",
    "user_metadata": {
      "age": 25,
      "location": "New York"
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "response_answers": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440006",
        "questionId": "550e8400-e29b-41d4-a716-446655440004",
        "answer_type": "multiple_choice",
        "answer_value": "JavaScript",
        "media": []
      }
    ]
  }
}
```

#### Submit Response with Token

- **Endpoint:** `POST /api/responses/submit-token`
- **Authentication:** None required (uses share token)
- **Description:** Submit a response using a share token

**Request Body:**

```json
{
  "token": "abc123def456ghi789",
  "user_metadata": {
    "age": 30,
    "location": "California"
  },
  "answers": [
    {
      "questionId": "550e8400-e29b-41d4-a716-446655440004",
      "answer_type": "multiple_choice",
      "answer_value": "Python",
      "media": []
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "message": "Response submitted",
  "response": {
    "id": "550e8400-e29b-41d4-a716-446655440007",
    "surveyId": "550e8400-e29b-41d4-a716-446655440001",
    "user_metadata": {
      "age": 30,
      "location": "California"
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "response_answers": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440008",
        "questionId": "550e8400-e29b-41d4-a716-446655440004",
        "answer_type": "multiple_choice",
        "answer_value": "Python",
        "media": []
      }
    ]
  }
}
```

#### Get Responses by Survey

- **Endpoint:** `GET /api/responses/survey/{surveyId}`
- **Authentication:** Required
- **Description:** Get all responses for a specific survey

**Response (200 OK):**

```json
{
  "responses": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "surveyId": "550e8400-e29b-41d4-a716-446655440001",
      "user_metadata": {
        "age": 25,
        "location": "New York"
      },
      "created_at": "2024-01-01T00:00:00.000Z",
      "response_answers": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440006",
          "questionId": "550e8400-e29b-41d4-a716-446655440004",
          "answer_type": "multiple_choice",
          "answer_value": "JavaScript",
          "media": []
        }
      ]
    }
  ]
}
```

### 5. Sharing

#### Share Survey (Public)

- **Endpoint:** `POST /api/share`
- **Authentication:** Required
- **Description:** Share a survey publicly

**Request Body:**

```json
{
  "surveyId": "550e8400-e29b-41d4-a716-446655440001",
  "type": "PUBLIC"
}
```

**Response (200 OK):**

```json
{
  "message": "Survey shared publicly",
  "link": "http://localhost:3000/survey/abc123def456ghi789"
}
```

#### Share Survey (Personalized)

- **Endpoint:** `POST /api/share`
- **Authentication:** Required
- **Description:** Share a survey with specific recipients

**Request Body:**

```json
{
  "surveyId": "550e8400-e29b-41d4-a716-446655440001",
  "type": "PERSONALIZED",
  "recipients": [
    {
      "email": "user1@example.com",
      "mobile_no": "1234567890"
    },
    {
      "email": "user2@example.com",
      "mobile_no": "0987654321"
    }
  ]
}
```

**Response (200 OK):**

```json
{
  "message": "Survey shared with recipients",
  "shareTokens": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440009",
      "surveyId": "550e8400-e29b-41d4-a716-446655440001",
      "token_hash": "abc123def456ghi789",
      "recipient_email": "user1@example.com",
      "recipient_mobile": "1234567890"
    }
  ]
}
```

#### Validate Share Token

- **Endpoint:** `GET /api/share/validate/{token}`
- **Authentication:** Required
- **Description:** Validate a share token and get survey information

**Response (200 OK):**

```json
{
  "surveyId": "550e8400-e29b-41d4-a716-446655440001",
  "survey": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Customer Satisfaction Survey",
    "description": "A survey to measure customer satisfaction",
    "status": "PUBLISHED"
  }
}
```

### 6. Analytics

#### Get Survey Analytics

- **Endpoint:** `GET /api/analytics/survey/{surveyId}`
- **Authentication:** Required
- **Description:** Get overall analytics for a survey

**Response (200 OK):**

```json
{
  "surveyId": "550e8400-e29b-41d4-a716-446655440001",
  "totalResponses": 45,
  "totalQuestions": 5,
  "avgCompletionRate": 0.85
}
```

#### Get Question Analytics (All)

- **Endpoint:** `GET /api/analytics/survey/{surveyId}/questions`
- **Authentication:** Required
- **Description:** Get analytics for all questions in a survey

**Response (200 OK):**

```json
{
  "surveyId": "550e8400-e29b-41d4-a716-446655440001",
  "analytics": [
    {
      "questionId": "550e8400-e29b-41d4-a716-446655440004",
      "question_text": "What is your favorite programming language?",
      "totalAnswers": 45,
      "answerDistribution": {
        "JavaScript": 20,
        "Python": 15,
        "Java": 7,
        "C++": 3
      }
    }
  ]
}
```

#### Get Question Analytics (Specific)

- **Endpoint:** `GET /api/analytics/survey/{surveyId}/questions/{questionId}`
- **Authentication:** Required
- **Description:** Get analytics for a specific question

**Response (200 OK):**

```json
{
  "surveyId": "550e8400-e29b-41d4-a716-446655440001",
  "analytics": [
    {
      "questionId": "550e8400-e29b-41d4-a716-446655440004",
      "question_text": "What is your favorite programming language?",
      "totalAnswers": 45,
      "answerDistribution": {
        "JavaScript": 20,
        "Python": 15,
        "Java": 7,
        "C++": 3
      }
    }
  ]
}
```

#### Get Audience Analytics

- **Endpoint:** `GET /api/analytics/survey/{surveyId}/audience`
- **Authentication:** Required
- **Description:** Get audience analytics for a survey

**Response (200 OK):**

```json
{
  "surveyId": "550e8400-e29b-41d4-a716-446655440001",
  "totalAudience": 100,
  "respondedAudience": 45,
  "responseRate": 45.0
}
```

## Data Types and Enums

### User Roles

- `USER` - Regular user
- `SYSTEM_ADMIN` - System administrator

### Survey Status

- `DRAFT` - Survey is in draft mode
- `SCHEDULED` - Survey is scheduled for future publication
- `PUBLISHED` - Survey is live and accepting responses

### Flow Types

- `STATIC` - Traditional linear survey flow
- `INTERACTIVE` - Interactive survey with dynamic flow
- `GAME` - Gamified survey experience

### Survey Send By

- `WHATSAPP` - Send via WhatsApp
- `EMAIL` - Send via email
- `BOTH` - Send via both WhatsApp and email
- `NONE` - No automatic sending

### Question Types

- `TEXT` - Text input question
- `MCQ` - Multiple choice question
- `RATING` - Rating scale question
- `IMAGE` - Image upload question
- `VIDEO` - Video upload question
- `AUDIO` - Audio upload question
- `FILE` - File upload question
- `MATRIX` - Matrix/grid question

### Share Types

- `PUBLIC` - Public sharing (anyone with link can access)
- `PERSONALIZED` - Personalized sharing (specific recipients)

## Error Handling

The API uses standard HTTP status codes and returns error messages in JSON format.

### Common Error Responses

#### 400 Bad Request

```json
{
  "message": "Validation error message"
}
```

#### 401 Unauthorized

```json
{
  "message": "Unauthorized - missing or invalid token"
}
```

#### 404 Not Found

```json
{
  "message": "Resource not found"
}
```

#### 500 Internal Server Error

```json
{
  "message": "Server error"
}
```

### Validation Errors

The API uses Joi for request validation. Validation errors will include specific field information:

```json
{
  "message": "\"email\" must be a valid email"
}
```

## Usage Guidelines

### 1. Authentication Flow

1. Register a new user or login with existing credentials
2. Store the JWT token securely (localStorage, sessionStorage, or secure cookie)
3. Include the token in the Authorization header for all protected endpoints
4. Handle token expiration by redirecting to login

### 2. Survey Creation Workflow

1. Create a survey with basic information
2. Add questions to the survey
3. Update survey status to "PUBLISHED" when ready
4. Share the survey using the sharing endpoints

### 3. Response Collection

- Use the token-based submission for public surveys
- Use authenticated submission for logged-in users
- Include user metadata for better analytics

### 4. Analytics and Reporting

- Fetch survey analytics for overview metrics
- Use question analytics for detailed insights
- Monitor audience analytics for engagement metrics

### 5. Error Handling Best Practices

- Always check response status codes
- Display user-friendly error messages
- Implement retry logic for network errors
- Handle authentication errors by redirecting to login

### 6. Performance Considerations

- Implement pagination for large datasets (surveys, responses)
- Cache survey data when appropriate
- Use loading states for better user experience
- Implement debouncing for search/filter operations

## SDK Integration Examples

### JavaScript/TypeScript Example

```javascript
class SurveyAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "API request failed");
    }

    return response.json();
  }

  // Authentication
  async login(email, password) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // Surveys
  async createSurvey(surveyData) {
    return this.request("/api/surveys", {
      method: "POST",
      body: JSON.stringify(surveyData),
    });
  }

  async getSurveys() {
    return this.request("/api/surveys");
  }

  // Questions
  async createQuestion(questionData) {
    return this.request("/api/questions", {
      method: "POST",
      body: JSON.stringify(questionData),
    });
  }

  // AI Generated Questions
  async getAIQuestions(surveyId) {
    return this.request(`/api/ai-questions/survey/${surveyId}`);
  }

  async approveAIQuestions(questionIds, addToSurvey = false) {
    return this.request(
      `/api/ai-questions/approve?addToSurvey=${addToSurvey}`,
      {
        method: "POST",
        body: JSON.stringify({ questionIds }),
      }
    );
  }

  async addAIQuestionsToSurvey(surveyId, questionIds) {
    return this.request(`/api/ai-questions/survey/${surveyId}/add`, {
      method: "POST",
      body: JSON.stringify({ questionIds }),
    });
  }

  // Responses
  async submitResponse(responseData) {
    return this.request("/api/responses", {
      method: "POST",
      body: JSON.stringify(responseData),
    });
  }
}

// Usage
const api = new SurveyAPI("http://localhost:5000", "your-jwt-token");

try {
  const surveys = await api.getSurveys();
  console.log("Surveys:", surveys);
} catch (error) {
  console.error("Error:", error.message);
}
```

## Rate Limiting

Currently, there are no rate limits implemented, but it's recommended to:

- Implement client-side throttling for API calls
- Avoid making excessive concurrent requests
- Use appropriate caching strategies

## Support and Documentation

- API Documentation: Available at `/api-docs` when server is running
- Swagger UI: Interactive API documentation
- GitHub Issues: For bug reports and feature requests

---

**Note:** This documentation is for Survey Platform API v2. Always refer to the latest version for the most up-to-date information.
