# API Payload Examples for Grid Questions

## Example 1: Creating a Multi-Choice Grid Question

### Frontend Request
```http
POST /api/questions HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "surveyId": "550e8400-e29b-41d4-a716-446655440000",
  "question_type": "TEXT",
  "question_text": "How satisfied are you with the following aspects of our service?",
  "categoryId": "multi-choice-grid-category-id",
  "order_index": 0,
  "required": true,
  "options": [],
  "rowOptions": [
    { "text": "Customer Support" },
    { "text": "Product Quality" },
    { "text": "Delivery Speed" },
    { "text": "Pricing" }
  ],
  "columnOptions": [
    { "text": "Very Dissatisfied" },
    { "text": "Dissatisfied" },
    { "text": "Neutral" },
    { "text": "Satisfied" },
    { "text": "Very Satisfied" }
  ]
}
```

### Expected Backend Response
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "message": "Question created successfully",
  "question": {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "surveyId": "550e8400-e29b-41d4-a716-446655440000",
    "question_type": "TEXT",
    "question_text": "How satisfied are you with the following aspects of our service?",
    "categoryId": "multi-choice-grid-category-id",
    "order_index": 0,
    "required": true,
    "options": [],
    "rowOptions": [
      { "id": "row-uuid-1", "text": "Customer Support" },
      { "id": "row-uuid-2", "text": "Product Quality" },
      { "id": "row-uuid-3", "text": "Delivery Speed" },
      { "id": "row-uuid-4", "text": "Pricing" }
    ],
    "columnOptions": [
      { "id": "col-uuid-1", "text": "Very Dissatisfied" },
      { "id": "col-uuid-2", "text": "Dissatisfied" },
      { "id": "col-uuid-3", "text": "Neutral" },
      { "id": "col-uuid-4", "text": "Satisfied" },
      { "id": "col-uuid-5", "text": "Very Satisfied" }
    ],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## Example 2: Creating a Checkbox Grid Question

### Frontend Request
```http
POST /api/questions HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "surveyId": "550e8400-e29b-41d4-a716-446655440000",
  "question_type": "TEXT",
  "question_text": "Which features do you use on each platform?",
  "categoryId": "checkbox-grid-category-id",
  "order_index": 1,
  "required": false,
  "options": [],
  "rowOptions": [
    { "text": "Mobile App" },
    { "text": "Web Browser" },
    { "text": "Desktop App" }
  ],
  "columnOptions": [
    { "text": "Messaging" },
    { "text": "Video Calls" },
    { "text": "File Sharing" },
    { "text": "Screen Sharing" }
  ]
}
```

## Example 3: Updating a Grid Question

### Frontend Request
```http
PUT /api/questions/650e8400-e29b-41d4-a716-446655440001 HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "question_text": "How satisfied are you with our service? (Updated)",
  "rowOptions": [
    { "text": "Customer Support" },
    { "text": "Product Quality" },
    { "text": "Delivery Speed" }
  ],
  "columnOptions": [
    { "text": "Poor" },
    { "text": "Fair" },
    { "text": "Good" },
    { "text": "Excellent" }
  ]
}
```

### Expected Backend Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Question updated successfully",
  "question": {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "question_text": "How satisfied are you with our service? (Updated)",
    "rowOptions": [
      { "id": "row-uuid-1", "text": "Customer Support" },
      { "id": "row-uuid-2", "text": "Product Quality" },
      { "id": "row-uuid-3", "text": "Delivery Speed" }
    ],
    "columnOptions": [
      { "id": "col-uuid-new-1", "text": "Poor" },
      { "id": "col-uuid-new-2", "text": "Fair" },
      { "id": "col-uuid-new-3", "text": "Good" },
      { "id": "col-uuid-new-4", "text": "Excellent" }
    ],
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

## Example 4: Getting Questions (with Grid Questions)

### Frontend Request
```http
GET /api/questions/survey/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer <token>
```

### Expected Backend Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "surveyId": "550e8400-e29b-41d4-a716-446655440000",
      "question_type": "TEXT",
      "question_text": "How satisfied are you with our service?",
      "categoryId": "multi-choice-grid-category-id",
      "order_index": 0,
      "required": true,
      "options": [],
      "rowOptions": [
        { "id": "row-uuid-1", "text": "Customer Support" },
        { "id": "row-uuid-2", "text": "Product Quality" }
      ],
      "columnOptions": [
        { "id": "col-uuid-1", "text": "Poor" },
        { "id": "col-uuid-2", "text": "Good" }
      ]
    }
  ]
}
```

