# 🧾 Survey Response API Documentation

## Overview
These endpoints allow users to **submit survey responses**, either directly or using a **secure token**, and to **fetch collected responses** for a survey.

---

## 🔹 1. Submit Survey Response

### **Endpoint**
```
POST /api/responses/submit
```

### **Description**
Submit a user’s answers for a specific survey.  
Used when no token-based sharing is required (e.g., public or open surveys).

---

### **Request Body**
```json
{
  "surveyId": "6c9d3b3f-b69f-49f3-9a7e-12f768a8ab23",
  "user_metadata": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+911234567890"
  },
  "answers": [
    {
      "questionId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
      "answer_value": "This is my short answer",
      "media": []
    },
    {
      "questionId": "b2c3d4e5-6789-0abc-def1-234567890abc",
      "answer_value": "option-id-1"
    },
    {
      "questionId": "c3d4e5f6-7890-abcd-ef12-34567890abcd",
      "answer_value": ["option-id-2", "option-id-3"]
    },
    {
      "questionId": "d4e5f6g7-890a-bcde-f123-4567890abcde",
      "answer_value": [
        {
          "rowOptionId": "row1",
          "selectedColumns": ["col1", "col2"]
        },
        {
          "rowOptionId": "row2",
          "selectedColumns": ["col3"]
        }
      ]
    },
    {
      "questionId": "e5f6g7h8-901b-cdef-2345-67890abcdef1",
      "answer_value": "",
      "media": [
        { "type": "image", "url": "https://example.com/upload/img1.jpg" }
      ]
    }
  ]
}
```

### **Request Field Details**

| Field | Type | Required | Description |
|-------|------|-----------|-------------|
| `surveyId` | `string (UUID)` | ✅ | The unique ID of the survey being answered. |
| `user_metadata` | `object` | ❌ | Optional metadata about the respondent (e.g., name, email, etc.). |
| `answers` | `array` | ✅ | List of answers for each question. |
| `answers[].questionId` | `string (UUID)` | ✅ | ID of the question being answered. |
| `answers[].answer_value` | `string` / `array` / `object` | ✅ | The answer content depending on the question type. |
| `answers[].media` | `array` | ❌ | List of uploaded media files (for file upload questions). |

---

### **Response (201 Created)**
```json
{
  "message": "Response submitted",
  "response": {
    "id": "3e9c5b12-8e77-4b5d-9ad2-657ab93bfa02",
    "surveyId": "6c9d3b3f-b69f-49f3-9a7e-12f768a8ab23",
    "user_metadata": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "response_answers": [
      {
        "id": "91b0b5a8-1de0-43cf-9c15-3fd1a53db471",
        "questionId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
        "answer_type": "short answer",
        "answer_value": "This is my short answer",
        "media": [],
        "selected_option_ids": null,
        "grid_answers": [],
        "question": {
          "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
          "question_text": "What do you think about our service?"
        }
      }
    ]
  }
}
```

### **Possible Errors**

| Code | Message | Cause |
|------|----------|-------|
| 400 | `"Invalid payload"` | Missing `surveyId` or invalid `answers` array |
| 500 | `"Server error"` | Internal processing issue |

---

## 🔹 2. Submit Survey Response (with Token)

### **Endpoint**
```
POST /api/responses/submit-with-token
```

### **Description**
Used when the survey is **shared privately** using a one-time or token-based link.  
Ensures that each token can only be used once.

---

### **Request Body**
```json
{
  "token": "b9c9fbbd32d44b25ad3c8d5df66b8c3b",
  "user_metadata": {
    "email": "invitee@example.com"
  },
  "answers": [
    {
      "questionId": "q1-uuid",
      "answer_value": "option-id-1"
    }
  ]
}
```

### **Response (201 Created)**
```json
{
  "message": "Response submitted",
  "response": {
    "id": "e2ab4d5c-7f98-4b1c-8d23-657a3b2adf02",
    "surveyId": "b8a3d5e6-f9a1-4b2c-a3b7-d1e24f7a5b23",
    "response_answers": [
      {
        "questionId": "q1-uuid",
        "answer_type": "multiple choice",
        "answer_value": "option-id-1"
      }
    ]
  }
}
```

### **Possible Errors**

| Code | Message | Cause |
|------|----------|-------|
| 400 | `"Invalid or used token"` | Token not found or already used |
| 500 | `"Server error"` | Internal issue |

---

## 🔹 3. Get All Responses by Survey

### **Endpoint**
```
GET /api/responses/:surveyId
```

### **Example**
```
GET /api/responses/6c9d3b3f-b69f-49f3-9a7e-12f768a8ab23
```

### **Description**
Fetch all responses (and their nested answers) for a given survey.

---

### **Response (200 OK)**
```json
{
  "responses": [
    {
      "id": "3e9c5b12-8e77-4b5d-9ad2-657ab93bfa02",
      "surveyId": "6c9d3b3f-b69f-49f3-9a7e-12f768a8ab23",
      "user_metadata": { "email": "john@example.com" },
      "response_answers": [
        {
          "id": "91b0b5a8-1de0-43cf-9c15-3fd1a53db471",
          "answer_type": "checkboxes",
          "answer_value": null,
          "selected_option_ids": ["opt1", "opt3"],
          "media": [],
          "grid_answers": [],
          "question": {
            "id": "abc123",
            "question_text": "Select your preferred colors"
          }
        }
      ]
    }
  ]
}
```

### **Possible Errors**

| Code | Message | Cause |
|------|----------|-------|
| 500 | `"Server error"` | Database or internal issue |

---

## ⚙️ Summary Table

| Endpoint | Method | Purpose |
|-----------|--------|----------|
| `/api/responses/submit` | `POST` | Submit responses (public survey) |
| `/api/responses/submit-with-token` | `POST` | Submit responses (token-based survey) |
| `/api/responses/:surveyId` | `GET` | Fetch all responses for a survey |

---

## 🧩 Notes for Frontend Integration
- All API requests should use `Content-Type: application/json`.
- File uploads should first be handled separately (upload URL → store link in `media` array).
- Token submission invalidates the token (`used: true`).
- `answer_value` type depends on the question:
  - **Text/Paragraph:** string  
  - **Multiple Choice/Dropdown:** string (optionId)  
  - **Checkboxes:** array of optionIds  
  - **Grid Questions:** array of `{ rowOptionId, selectedColumns[] }`  
  - **File Upload:** `media` array  
  - **Rating/Scale:** number or optionId
