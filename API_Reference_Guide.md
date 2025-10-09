# Survey Platform API Reference Guide

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Error Codes](#error-codes)
6. [Rate Limiting](#rate-limiting)

## Overview

The Survey Platform API v2 is a RESTful API built with Express.js and Prisma ORM. It provides comprehensive functionality for creating, managing, and analyzing surveys.

### Base URL

```
Development: http://localhost:5000
Production: [Your production URL]
```

### API Version

Current version: v2

### Content Type

All requests and responses use `application/json` content type.

## Authentication

### JWT Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Token Lifecycle

- Tokens are issued upon successful login/registration
- Tokens should be stored securely on the client side
- Include tokens in all protected endpoint requests
- Handle token expiration gracefully

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/signup

Register a new user account.

**Parameters:**

- `name` (string, required): User's full name (2-50 characters)
- `email` (string, required): Valid email address
- `mobile_no` (string, optional): 10-digit mobile number
- `password` (string, required): Password (6-30 characters)
- `role` (string, optional): User role (`USER` or `SYSTEM_ADMIN`, default: `USER`)
- `theme` (string, optional): UI theme (`LIGHT` or `DARK`, default: `LIGHT`)

**Response:** User object with JWT token

#### POST /api/auth/login

Authenticate existing user.

**Parameters:**

- `email` (string, required): User's email address
- `password` (string, required): User's password

**Response:** User object with JWT token

### Survey Management Endpoints

#### POST /api/surveys

Create a new survey. **Requires authentication.**

**Parameters:**

- `title` (string, required): Survey title (3-100 characters)
- `description` (string, optional): Survey description (max 500 characters)
- `flow_type` (string, optional): Survey flow type (`STATIC`, `INTERACTIVE`, `GAME`, default: `STATIC`)
- `survey_send_by` (string, optional): Distribution method (`WHATSAPP`, `EMAIL`, `BOTH`, `NONE`, default: `NONE`)
- `settings` (object, optional): Survey settings
  - `isAnonymous` (boolean): Whether survey is anonymous
  - `showProgressBar` (boolean): Show progress bar to respondents
  - `shuffleQuestions` (boolean): Randomize question order
- `status` (string, optional): Survey status (`DRAFT`, `SCHEDULED`, `PUBLISHED`, default: `DRAFT`)
- `scheduled_date` (datetime, optional): When to publish survey
- `scheduled_type` (string, optional): Schedule type (`IMMEDIATE`, `SCHEDULED`, default: `IMMEDIATE`)

**Response:** Created survey object

#### GET /api/surveys

Get all surveys for authenticated user. **Requires authentication.**

**Response:** Array of survey objects

#### GET /api/surveys/{surveyId}

Get specific survey by ID. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the survey

**Response:** Survey object

#### PUT /api/surveys/{surveyId}

Update existing survey. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the survey
- Body: Same as create survey (all fields optional)

**Response:** Success message

#### DELETE /api/surveys/{surveyId}

Soft delete survey. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the survey

**Response:** Success message

### Question Management Endpoints

#### POST /api/questions

Create a new question. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the parent survey
- `question_type` (string, required): Question type (`TEXT`, `MCQ`, `RATING`, `IMAGE`, `VIDEO`, `AUDIO`, `FILE`, `MATRIX`)
- `question_text` (string, required): Question text (1-500 characters)
- `options` (array, required): Array of answer options
- `media` (array, optional): Array of media objects
  - `type` (string): Media type
  - `url` (string): Media URL
  - `thumbnail_url` (string, optional): Thumbnail URL
- `categoryId` (string, required): UUID of question category
- `subCategoryId` (string, required): UUID of question sub-category
- `order_index` (integer, optional): Question order in survey
- `required` (boolean, optional): Whether question is required (default: true)

**Response:** Created question object

#### GET /api/questions/survey/{surveyId}

Get all questions for a survey. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the survey

**Response:** Array of question objects

#### PUT /api/questions/{questionId}

Update existing question. **Requires authentication.**

**Parameters:**

- `questionId` (string, required): UUID of the question
- Body: Same as create question (all fields optional except question_type)

**Response:** Updated question object

#### DELETE /api/questions/{questionId}

Delete question. **Requires authentication.**

**Parameters:**

- `questionId` (string, required): UUID of the question

**Response:** Success message

### Response Management Endpoints

#### POST /api/responses

Submit response to survey. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the survey
- `user_metadata` (object, optional): Additional user information
- `answers` (array, required): Array of answer objects
  - `questionId` (string, required): UUID of the question
  - `answer_type` (string, required): Type of answer
  - `answer_value` (string, optional): Answer value
  - `media` (array, optional): Array of media objects

**Response:** Created response object with answers

#### POST /api/responses/submit-token

Submit response using share token. **No authentication required.**

**Parameters:**

- `token` (string, required): Share token
- `user_metadata` (object, optional): Additional user information
- `answers` (array, required): Array of answer objects (same structure as above)

**Response:** Created response object with answers

#### GET /api/responses/survey/{surveyId}

Get all responses for a survey. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the survey

**Response:** Array of response objects with answers

### Sharing Endpoints

#### POST /api/share

Share survey publicly or with specific recipients. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the survey
- `type` (string, required): Share type (`PUBLIC` or `PERSONALIZED`)
- `recipients` (array, required for PERSONALIZED): Array of recipient objects
  - `email` (string, optional): Recipient email
  - `mobile_no` (string, optional): Recipient mobile number

**Response:**

- For PUBLIC: Share link
- For PERSONALIZED: Array of share tokens

#### GET /api/share/validate/{token}

Validate share token. **Requires authentication.**

**Parameters:**

- `token` (string, required): Share token to validate

**Response:** Survey information if token is valid

### Analytics Endpoints

#### GET /api/analytics/survey/{surveyId}

Get survey-level analytics. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the survey

**Response:** Survey analytics object with total responses, questions, and completion rate

#### GET /api/analytics/survey/{surveyId}/questions/{questionId?}

Get question-level analytics. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the survey
- `questionId` (string, optional): UUID of specific question (omit for all questions)

**Response:** Question analytics with answer distribution

#### GET /api/analytics/survey/{surveyId}/audience

Get audience analytics. **Requires authentication.**

**Parameters:**

- `surveyId` (string, required): UUID of the survey

**Response:** Audience analytics with total audience, responded audience, and response rate

## Data Models

### User Model

```json
{
  "id": "string (UUID)",
  "name": "string",
  "email": "string",
  "mobile_no": "string (optional)",
  "role": "USER | SYSTEM_ADMIN",
  "theme": "LIGHT | DARK",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Survey Model

```json
{
  "id": "string (UUID)",
  "title": "string",
  "description": "string (optional)",
  "no_of_questions": "integer",
  "userId": "string (UUID)",
  "survey_send_by": "WHATSAPP | EMAIL | BOTH | NONE",
  "flow_type": "STATIC | INTERACTIVE | GAME",
  "settings": "object",
  "status": "DRAFT | SCHEDULED | PUBLISHED",
  "scheduled_date": "datetime (optional)",
  "scheduled_type": "IMMEDIATE | SCHEDULED",
  "is_deleted": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Question Model

```json
{
  "id": "string (UUID)",
  "surveyId": "string (UUID)",
  "question_type": "TEXT | MCQ | RATING | IMAGE | VIDEO | AUDIO | FILE | MATRIX",
  "question_text": "string",
  "options": "array",
  "media": "array",
  "order_index": "integer",
  "required": "boolean",
  "categoryId": "string (UUID, optional)",
  "subCategoryId": "string (UUID, optional)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Response Model

```json
{
  "id": "string (UUID)",
  "surveyId": "string (UUID)",
  "user_metadata": "object",
  "created_at": "datetime",
  "response_answers": [
    {
      "id": "string (UUID)",
      "questionId": "string (UUID)",
      "answer_type": "string",
      "answer_value": "string (optional)",
      "media": "array",
      "submitted_at": "datetime",
      "created_at": "datetime"
    }
  ]
}
```

### ShareToken Model

```json
{
  "id": "string (UUID)",
  "surveyId": "string (UUID)",
  "recipient_email": "string (optional)",
  "recipient_mobile": "string (optional)",
  "token_hash": "string",
  "expires_at": "datetime (optional)",
  "used": "boolean",
  "created_at": "datetime"
}
```

### Analytics Models

#### Survey Analytics

```json
{
  "surveyId": "string (UUID)",
  "totalResponses": "integer",
  "totalQuestions": "integer",
  "avgCompletionRate": "float"
}
```

#### Question Analytics

```json
{
  "surveyId": "string (UUID)",
  "analytics": [
    {
      "questionId": "string (UUID)",
      "question_text": "string",
      "totalAnswers": "integer",
      "answerDistribution": "object"
    }
  ]
}
```

#### Audience Analytics

```json
{
  "surveyId": "string (UUID)",
  "totalAudience": "integer",
  "respondedAudience": "integer",
  "responseRate": "float"
}
```

## Error Codes

### HTTP Status Codes

| Code | Description           | Common Causes                           |
| ---- | --------------------- | --------------------------------------- |
| 200  | OK                    | Successful GET, PUT requests            |
| 201  | Created               | Successful POST requests                |
| 400  | Bad Request           | Invalid request data, validation errors |
| 401  | Unauthorized          | Missing or invalid authentication token |
| 404  | Not Found             | Resource not found, invalid ID          |
| 500  | Internal Server Error | Server-side errors, database issues     |

### Error Response Format

```json
{
  "message": "Error description"
}
```

### Common Error Messages

#### Authentication Errors

- `"User already exists"` - Email already registered
- `"Invalid credentials"` - Wrong email/password combination
- `"Unauthorized - missing or invalid token"` - Authentication required

#### Validation Errors

- `"\"email\" must be a valid email"` - Invalid email format
- `"\"password\" length must be at least 6 characters long"` - Password too short
- `"Mobile number must be 10 digits"` - Invalid mobile number format

#### Resource Errors

- `"Survey not found"` - Survey ID doesn't exist or user doesn't have access
- `"Question not found"` - Question ID doesn't exist
- `"Invalid or used token"` - Share token is invalid or already used

## Rate Limiting

Currently, no rate limiting is implemented. However, consider implementing:

### Recommended Limits

- Authentication endpoints: 5 requests per minute per IP
- Survey creation: 10 requests per minute per user
- Response submission: 100 requests per minute per IP
- Analytics endpoints: 60 requests per minute per user

### Best Practices

- Implement exponential backoff for failed requests
- Cache frequently accessed data
- Use pagination for large datasets
- Implement request debouncing on the client side

## Pagination

For endpoints that return large datasets, implement pagination:

### Query Parameters

- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `sort` (string): Sort field
- `order` (string): Sort order (`asc` or `desc`)

### Response Format

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Webhooks (Future Enhancement)

Consider implementing webhooks for real-time notifications:

### Supported Events

- `survey.created` - New survey created
- `survey.published` - Survey published
- `response.submitted` - New response received
- `survey.completed` - Survey reached target responses

### Webhook Payload

```json
{
  "event": "response.submitted",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "surveyId": "uuid",
    "responseId": "uuid",
    "userId": "uuid"
  }
}
```
