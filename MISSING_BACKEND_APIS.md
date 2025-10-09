# Missing Backend APIs

This document lists the APIs that are currently used by the frontend but are not yet implemented in the new backend according to the API Reference Guide.

## 🔴 Critical Missing APIs (Required for Core Functionality)

### 1. Categories API
**Frontend Usage:** Survey creation, question categorization
**Missing Endpoints:**
- `GET /api/categories` - Get list of survey categories
- `GET /api/categories/{categoryId}/subcategories` - Get subcategories

**Current Frontend Code:**
```typescript
// lib/api.ts - categoriesApi.getCategories()
// Used in: app/generate-survey/page.tsx
```

### 2. Dashboard APIs
**Frontend Usage:** Main dashboard statistics and charts
**Missing Endpoints:**
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/charts` - Chart data for analytics
- `GET /api/dashboard/recent-surveys` - Recent surveys list

**Current Frontend Code:**
```typescript
// lib/api.ts - dashboardApi.getStats(), getCharts(), getRecentSurveys()
// Used in: app/page.tsx (main dashboard)
```

### 3. Question Generation APIs
**Frontend Usage:** AI-powered question generation
**Missing Endpoints:**
- `POST /api/questions/generate` - Generate questions using AI/templates
- `GET /api/questions/config` - Get generation configuration
- `GET /api/questions/categories` - Get question categories

**Current Frontend Code:**
```typescript
// lib/api.ts - questionGenerationApi
// Used in: app/generate-survey/page.tsx
```

## 🟡 Important Missing APIs (Enhanced Functionality)

### 4. Audience Management APIs
**Frontend Usage:** Audience targeting and management
**Missing Endpoints:**
- `GET /api/audience` - Get audience members with filtering
- `GET /api/audience/stats` - Audience statistics
- `POST /api/audience/import` - Import audience from CSV/Excel
- `GET /api/audience/export` - Export audience data
- `POST /api/audience/segments` - Create audience segments
- `GET /api/audience/segments` - Get audience segments

**Current Frontend Code:**
```typescript
// lib/api.ts - audienceApi
// Used in: components/audience-selector.tsx, app/audience/page.tsx
```

### 5. Survey Results & Analytics APIs
**Frontend Usage:** Survey results display and analytics
**Missing Endpoints:**
- `GET /api/surveys/{id}/results` - Detailed survey results
- `GET /api/surveys/{id}/responses` - Individual responses with pagination
- `GET /api/surveys/{id}/export` - Export survey data

**Current Frontend Code:**
```typescript
// lib/api.ts - surveyResultsApi
// Used in: app/survey-results/[id]/page.tsx
```

### 6. Public Survey APIs
**Frontend Usage:** Public survey display and submission
**Missing Endpoints:**
- `GET /api/public/survey/{id}` - Get public survey for display
- `POST /api/public/survey/{id}/submit` - Submit survey response

**Current Frontend Code:**
```typescript
// lib/api.ts - publicSurveyApi
// Used in: Generated survey HTML files
```

## 🟢 Optional APIs (Nice to Have)

### 7. Media Upload APIs
**Frontend Usage:** File uploads for questions and responses
**Missing Endpoints:**
- `POST /api/media/upload` - Upload media files
- `GET /api/media/{id}` - Get media file
- `DELETE /api/media/{id}` - Delete media file

### 8. Advanced Analytics APIs
**Frontend Usage:** Advanced reporting and insights
**Missing Endpoints:**
- `GET /api/analytics/trends` - Survey trends over time
- `GET /api/analytics/demographics` - Demographic breakdowns
- `GET /api/analytics/nps` - NPS score calculations

## 📋 Implementation Priority

### Phase 1 (Immediate - Core Functionality)
1. **Categories API** - Required for survey creation
2. **Dashboard APIs** - Required for main dashboard
3. **Basic Survey Results** - Required for viewing responses

### Phase 2 (Short Term - Enhanced Features)
1. **Question Generation APIs** - AI-powered features
2. **Public Survey APIs** - Survey sharing and responses
3. **Basic Audience APIs** - Audience targeting

### Phase 3 (Medium Term - Advanced Features)
1. **Advanced Audience Management** - Import/export, segments
2. **Advanced Analytics** - Detailed reporting
3. **Media Upload APIs** - File handling

## 🔧 Temporary Workarounds

The frontend currently uses demo data fallbacks for missing APIs:

```typescript
// lib/api.ts
export async function apiWithFallback<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  fallbackData: T,
): Promise<ApiResponse<T>> {
  // Falls back to demo data when API is not available
}
```

**Demo Data Sources:**
- `lib/assist-data.ts` - Contains sample data for all missing APIs
- Used throughout the application when real APIs are unavailable

## 📝 Notes for Backend Implementation

1. **Authentication:** All protected endpoints should use JWT authentication
2. **Error Handling:** Follow the error response format from API Reference Guide
3. **Pagination:** Implement pagination for list endpoints
4. **Validation:** Use proper request validation for all endpoints
5. **File Upload:** Consider using cloud storage for media files

## 🔄 Migration Strategy

1. **Implement APIs in priority order**
2. **Test each API with frontend integration**
3. **Remove demo data fallbacks gradually**
4. **Update frontend components to handle new data structures**
5. **Add proper error handling and loading states**
