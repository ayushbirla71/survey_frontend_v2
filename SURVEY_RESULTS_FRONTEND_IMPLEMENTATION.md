# Survey Results API - Frontend Implementation Guide

## Base URL

```
http://localhost:5000/api/survey-results
```

## Authentication

All endpoints require JWT Bearer token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Get Survey Results with Pagination & Filters

### Endpoint

```
GET /api/survey-results/:surveyId
```

### Query Parameters

```
page=1                    # Page number (default: 1)
limit=10                  # Results per page (default: 10)
startDate=2024-01-01      # Filter from date (optional)
endDate=2024-12-31        # Filter to date (optional)
questionId=q-1            # Filter by question (optional)
sortBy=created_at         # Sort field (default: created_at)
sortOrder=desc            # asc or desc (default: desc)
```

### Request Example

```bash
GET http://localhost:5000/api/survey-results/survey-123?page=1&limit=10&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Body (200 OK)

```json
{
  "message": "Survey results retrieved",
  "data": {
    "surveyId": "survey-123",
    "surveyTitle": "Customer Satisfaction Survey",
    "totalResponses": 150,
    "currentPage": 1,
    "totalPages": 15,
    "responses": [
      {
        "id": "response-1",
        "surveyId": "survey-123",
        "user_metadata": {
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "9876543210"
        },
        "created_at": "2024-01-15T10:30:00Z",
        "response_answers": [
          {
            "id": "answer-1",
            "questionId": "question-1",
            "answer_value": "Very satisfied",
            "selected_option_ids": null,
            "scaleRatingValue": null,
            "question": {
              "id": "question-1",
              "question_text": "How satisfied are you?",
              "question_type": "TEXT",
              "options": []
            },
            "grid_answers": []
          }
        ]
      }
    ]
  }
}
```

---

## 2. Get Survey Results Summary

### Endpoint

```
GET /api/survey-results/:surveyId/summary
```

### Request Example

```bash
GET http://localhost:5000/api/survey-results/survey-123/summary
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Body (200 OK)

```json
{
  "message": "Survey results summary retrieved",
  "data": {
    "surveyId": "survey-123",
    "surveyTitle": "Customer Satisfaction Survey",
    "totalQuestions": 10,
    "totalResponses": 150,
    "completionRate": "92.50",
    "responseTimeline": {
      "2024-01-15": 25,
      "2024-01-16": 30,
      "2024-01-17": 28,
      "2024-01-18": 35,
      "2024-01-19": 32
    },
    "avgResponsesPerDay": "30.00"
  }
}
```

---

## 3. Get Question-wise Results

### Endpoint

```
GET /api/survey-results/:surveyId/questions/:questionId
```

### Request Example

```bash
GET http://localhost:5000/api/survey-results/survey-123/questions/question-1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Body (200 OK)

```json
{
  "message": "Question results retrieved",
  "data": {
    "surveyId": "survey-123",
    "questionId": "question-1",
    "questionText": "How satisfied are you with our service?",
    "questionType": "TEXT",
    "totalAnswers": 150,
    "answerDistribution": {
      "Very satisfied": 45,
      "Satisfied": 60,
      "Neutral": 30,
      "Dissatisfied": 15
    },
    "gridDistribution": null,
    "options": [
      {
        "id": "option-1",
        "text": "Very satisfied",
        "rangeFrom": null,
        "rangeTo": null
      }
    ]
  }
}
```

---

## 4. Export Survey Results

### Endpoint

```
GET /api/survey-results/:surveyId/export?format=json|csv
```

### Query Parameters

```
format=json    # json or csv (default: json)
```

### Request Example (JSON)

```bash
GET http://localhost:5000/api/survey-results/survey-123/export?format=json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Body (200 OK - JSON)

```json
{
  "message": "Survey results exported",
  "data": {
    "surveyId": "survey-123",
    "surveyTitle": "Customer Satisfaction Survey",
    "exportedAt": "2024-01-20T15:30:00Z",
    "totalResponses": 150,
    "responses": [
      {
        "id": "response-1",
        "surveyId": "survey-123",
        "user_metadata": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "created_at": "2024-01-15T10:30:00Z",
        "response_answers": [...]
      }
    ]
  }
}
```

### Request Example (CSV)

```bash
GET http://localhost:5000/api/survey-results/survey-123/export?format=csv
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Body (200 OK - CSV)

```
Response ID,Submitted At,Question,Answer
"response-1","2024-01-15T10:30:00Z","How satisfied are you?","Very satisfied"
"response-2","2024-01-15T11:45:00Z","How satisfied are you?","Satisfied"
"response-3","2024-01-15T13:20:00Z","How satisfied are you?","Neutral"
```

---

## 5. Get Response Details

### Endpoint

```
GET /api/survey-results/:surveyId/responses/:responseId
```

### Request Example

```bash
GET http://localhost:5000/api/survey-results/survey-123/responses/response-1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Body (200 OK)

```json
{
  "message": "Response details retrieved",
  "data": {
    "id": "response-1",
    "surveyId": "survey-123",
    "user_metadata": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "company": "Acme Corp"
    },
    "created_at": "2024-01-15T10:30:00Z",
    "survey": {
      "id": "survey-123",
      "title": "Customer Satisfaction Survey",
      "description": "Please rate your experience with our service"
    },
    "response_answers": [
      {
        "id": "answer-1",
        "questionId": "question-1",
        "answer_value": "Very satisfied",
        "selected_option_ids": null,
        "scaleRatingValue": null,
        "question": {
          "id": "question-1",
          "question_text": "How satisfied are you?",
          "question_type": "TEXT"
        },
        "grid_answers": []
      },
      {
        "id": "answer-2",
        "questionId": "question-2",
        "answer_value": null,
        "selected_option_ids": ["option-1", "option-3"],
        "scaleRatingValue": null,
        "question": {
          "id": "question-2",
          "question_text": "Which features do you use?",
          "question_type": "CHECKBOX"
        },
        "grid_answers": []
      }
    ]
  }
}
```

---

## 6. Get Filtered Responses

### Endpoint

```
GET /api/survey-results/:surveyId/filtered
```

### Query Parameters

```
questionId=q-1            # Question ID (required)
answerValue=Very%20good   # Answer value (required)
page=1                    # Page number (default: 1)
limit=10                  # Results per page (default: 10)
```

### Request Example

```bash
GET http://localhost:5000/api/survey-results/survey-123/filtered?questionId=question-1&answerValue=Very%20satisfied&page=1&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Body (200 OK)

```json
{
  "message": "Filtered responses retrieved",
  "data": {
    "surveyId": "survey-123",
    "questionId": "question-1",
    "filterValue": "Very satisfied",
    "totalMatches": 45,
    "currentPage": 1,
    "totalPages": 5,
    "responses": [
      {
        "id": "response-1",
        "surveyId": "survey-123",
        "user_metadata": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "created_at": "2024-01-15T10:30:00Z",
        "response_answers": [
          {
            "id": "answer-1",
            "questionId": "question-1",
            "answer_value": "Very satisfied",
            "selected_option_ids": null,
            "scaleRatingValue": null,
            "question": {
              "id": "question-1",
              "question_text": "How satisfied are you?",
              "question_type": "TEXT"
            },
            "grid_answers": []
          }
        ]
      }
    ]
  }
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "message": "Invalid request parameters",
  "error": "Error details"
}
```

### 401 Unauthorized

```json
{
  "message": "Unauthorized - Invalid or expired token"
}
```

### 404 Not Found

```json
{
  "message": "Survey not found"
}
```

### 500 Server Error

```json
{
  "message": "Server error",
  "error": "Error details"
}
```

---

## Frontend Integration Example (React)

```javascript
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api/survey-results";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const surveyResultsAPI = {
  getSurveyResults: (surveyId, params) =>
    apiClient.get(`/${surveyId}`, { params }),

  getSummary: (surveyId) => apiClient.get(`/${surveyId}/summary`),

  getQuestionResults: (surveyId, questionId) =>
    apiClient.get(`/${surveyId}/questions/${questionId}`),

  exportResults: (surveyId, format = "json") =>
    apiClient.get(`/${surveyId}/export`, { params: { format } }),

  getResponseDetails: (surveyId, responseId) =>
    apiClient.get(`/${surveyId}/responses/${responseId}`),

  getFilteredResponses: (surveyId, params) =>
    apiClient.get(`/${surveyId}/filtered`, { params }),
};

export default apiClient;
```

---

## Usage Examples

### Get Results with Pagination

```javascript
const response = await surveyResultsAPI.getSurveyResults("survey-123", {
  page: 1,
  limit: 10,
});
```

### Get Results with Date Filter

```javascript
const response = await surveyResultsAPI.getSurveyResults("survey-123", {
  page: 1,
  limit: 10,
  startDate: "2024-01-01",
  endDate: "2024-12-31",
});
```

### Get Summary Statistics

```javascript
const summary = await surveyResultsAPI.getSummary("survey-123");
console.log(summary.data.data.completionRate);
```

### Get Question Analytics

```javascript
const questionResults = await surveyResultsAPI.getQuestionResults(
  "survey-123",
  "question-1"
);
console.log(questionResults.data.data.answerDistribution);
```

### Export Results

```javascript
const exported = await surveyResultsAPI.exportResults("survey-123", "csv");
// Download CSV file
```

### Filter Responses

```javascript
const filtered = await surveyResultsAPI.getFilteredResponses("survey-123", {
  questionId: "question-1",
  answerValue: "Very satisfied",
  page: 1,
  limit: 10,
});
```

---

## Postman Collection

Import the Postman collection from: `postman/Survey_Results_API.postman_collection.json`

Set environment variables:

- `base_url`: http://localhost:5000
- `auth_token`: Your JWT token
- `survey_id`: Your survey ID
- `question_id`: Your question ID
- `response_id`: Your response ID
