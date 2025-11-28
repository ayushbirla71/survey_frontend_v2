// API configuration and base functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Get JWT token from localStorage or your auth system
const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
};

// Updated API response types matching new backend documentation
// Note: New API returns data directly or error message, no 'success' wrapper
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User model from new API
export interface User {
  id: string;
  name: string;
  email: string;
  mobile_no?: string;
  role: "USER" | "SYSTEM_ADMIN";
  theme: "LIGHT" | "DARK";
  created_at: string;
  updated_at: string;
}

// Survey model from new API
export interface Survey {
  id: string;
  title: string;
  description?: string;
  no_of_questions: number;
  userId: string;
  survey_send_by: "WHATSAPP" | "EMAIL" | "BOTH" | "NONE";
  flow_type: "STATIC" | "INTERACTIVE" | "GAME";
  settings: {
    isAnonymous?: boolean;
    showProgressBar?: boolean;
    shuffleQuestions?: boolean;
  };
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  scheduled_date?: string;
  scheduled_type: "IMMEDIATE" | "SCHEDULED";
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  surveyCategoryId: string;
  autoGenerateQuestions: any;
  questions: Question[];
}

// Question model from new API
export interface Question {
  id: string;
  surveyId: string;
  question_type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";
  question_text: string;
  options: any[];
  media?: Array<{
    type: string;
    url: string;
    thumbnail_url?: string;
  }>;
  order_index: number;
  required: boolean;
  categoryId?: string;
  subCategoryId?: string;
  created_at: string;
  updated_at: string;
}

// Response model from new API
export interface SurveyResponse {
  id: string;
  surveyId: string;
  user_metadata?: any;
  created_at: string;
  response_answers: Array<{
    id: string;
    questionId: string;
    answer_type: string;
    answer_value?: string;
    media?: any[];
    submitted_at: string;
    created_at: string;
  }>;
}

export interface SurveyResponseResult {
  title: string;
  description: string;
  individualResponses: any[];
  questionResults: any[];
  responseTimeline: any[];
  stats: {
    totalResponses: number;
    completionRate: number;
    avgTime: number;
    npsScore: number;
  };
}

// ShareToken model from new API
export interface ShareToken {
  id?: string;
  surveyId?: string;
  recipient_email?: string;
  recipient_mobile?: string;
  agentUserUniqueId?: string;
  token_hash?: string;
  expires_at?: string;
  used?: boolean;
  created_at?: string;
}

// Base API function with error handling and authentication
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add authentication header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      signal: controller.signal,
      ...options,
    });
    console.log("response is", response);

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Handle error responses
      if (response.headers.get("content-type")?.includes("application/json")) {
        const errorData = await response.json();
        return { error: errorData.message || "API request failed" };
      } else {
        return { error: `HTTP ${response.status}: ${response.statusText}` };
      }
    }

    // Handle successful responses
    if (response.headers.get("content-type")?.includes("application/json")) {
      const data = await response.json();
      return { data };
    } else {
      // For non-JSON responses (like file downloads)
      return { data: response as any };
    }
  } catch (error) {
    console.error("API Error:", error);
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "Request timeout - please check your connection" };
    }
    return {
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

// Utility function for backward compatibility with existing code
export async function apiWithFallback<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  fallbackData: T
): Promise<ApiResponse<T>> {
  try {
    const result = await apiCall();

    if (result.data !== undefined) {
      return result;
    } else {
      console.warn("API call failed, using demo data:", result.error);
      return { data: fallbackData };
    }
  } catch (error) {
    console.warn("API call failed, using demo data:", error);
    return { data: fallbackData };
  }
}

// Authentication APIs
export const authApi = {
  // POST /api/auth/signup
  signup: async (userData: {
    name: string;
    email: string;
    mobile_no?: string;
    password: string;
    role?: "USER" | "SYSTEM_ADMIN";
    theme?: "LIGHT" | "DARK";
  }): Promise<ApiResponse<{ user: User; token: string }>> => {
    return apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  // POST /api/auth/login
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> => {
    return apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  // Store JWT token
  setAuthToken: (token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  },

  // Remove JWT token
  removeAuthToken: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return getAuthToken() !== null;
  },

  // Get current user info from token (you might want to decode JWT or call an endpoint)
  getCurrentUser: (): User | null => {
    // This would typically decode the JWT token or call a /me endpoint
    // For now, return null - implement based on your auth strategy
    return null;
  },
};

// Public Survey APIs (No Authentication Required)
export const publicSurveyApi = {
  // GET /api/public/survey/:id
  getSurvey: async (
    id: string
  ): Promise<
    ApiResponse<{
      id: string;
      title: string;
      description: string;
      category: string;
      questions: Array<{
        id: string;
        type: "single_choice" | "checkbox" | "text" | "rating";
        question: string;
        options?: string[];
        required: boolean;
      }>;
      status: "active" | "completed" | "draft";
    }>
  > => {
    // Public API doesn't require authentication
    return fetch(`${API_BASE_URL}/api/public/survey/${id}`)
      .then((response) => response.json())
      .catch((error) => ({
        success: false,
        error: error.message,
        code: "NETWORK_ERROR",
      }));
  },

  // POST /api/public/survey/:id/submit
  submitResponse: async (
    id: string,
    responseData: {
      answers: Array<{
        questionId: string;
        question: string;
        answer: string | string[];
      }>;
      completionTime: number;
      respondentInfo?: {
        name?: string;
        email?: string;
      };
    }
  ): Promise<
    ApiResponse<{
      id: string;
      message: string;
      submittedAt: string;
    }>
  > => {
    return fetch(`${API_BASE_URL}/api/public/survey/${id}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(responseData),
    })
      .then((response) => response.json())
      .catch((error) => ({
        success: false,
        error: error.message,
        code: "NETWORK_ERROR",
      }));
  },

  // GET /api/public/survey/:id/thank-you
  getThankYouMessage: async (
    id: string
  ): Promise<
    ApiResponse<{
      title: string;
      message: string;
      category: string;
    }>
  > => {
    return fetch(`${API_BASE_URL}/api/public/survey/${id}/thank-you`)
      .then((response) => response.json())
      .catch((error) => ({
        success: false,
        error: error.message,
        code: "NETWORK_ERROR",
      }));
  },
};

// Question Generation APIs (NEW)
export const questionGenerationApi = {
  // POST /api/questions/generate
  generateQuestions: async (requestData: {
    category: string;
    description?: string;
    questionCount?: number;
  }): Promise<
    ApiResponse<{
      category: string;
      description: string;
      questionCount: number;
      questions: Array<{
        id: string;
        type: "single_choice" | "checkbox" | "text" | "rating" | "yes_no";
        question: string;
        options: string[];
        required: boolean;
      }>;
      generatedWith: "openai" | "static";
    }>
  > => {
    return apiRequest("/api/questions/generate", {
      method: "POST",
      body: JSON.stringify(requestData),
    });
  },

  // GET /api/questions/categories
  getCategories: async (): Promise<ApiResponse<string[]>> => {
    return apiRequest("/api/questions/categories");
  },

  // GET /api/questions/static/:category
  getStaticQuestions: async (
    category: string
  ): Promise<
    ApiResponse<{
      category: string;
      questions: Array<{
        id: string;
        type: "single_choice" | "checkbox" | "text" | "rating" | "yes_no";
        question: string;
        options: string[];
        required: boolean;
      }>;
      generatedWith: "static";
    }>
  > => {
    return apiRequest(`/api/questions/static/${encodeURIComponent(category)}`);
  },

  // GET /api/questions/config
  getConfig: async (): Promise<
    ApiResponse<{
      mode: "openai" | "static";
      openaiConnected: boolean;
      openaiError?: string;
      availableCategories: string[];
      settings: {
        openai: {
          model: string;
          maxQuestions: number;
          temperature: number;
          questionTypes: string[];
        };
        static: {
          defaultQuestionsPerCategory: number;
        };
      };
    }>
  > => {
    return apiRequest("/api/questions/config");
  },
};

// Dashboard APIs
export const dashboardApi = {
  // GET /api/dashboard/stats
  getStats: async (): Promise<
    ApiResponse<{
      totalSurveys: number;
      surveyGrowth: number;
      totalResponses: number;
      responseGrowth: number;
      completionRate: number;
      completionRateGrowth: number;
      avgResponseTime: number;
      responseTimeImprovement: number;
    }>
  > => {
    return apiRequest("/api/dashboard/stats");
  },

  // GET /api/dashboard/charts
  getCharts: async (): Promise<
    ApiResponse<{
      barChart: Array<{ category: string; responses: number }>;
      lineChart: Array<{ month: string; surveys: number; responses: number }>;
      pieChart: Array<{ category: string; value: number }>;
    }>
  > => {
    return apiRequest("/api/dashboard/charts");
  },

  // GET /api/dashboard/recent-surveys
  getRecentSurveys: async (): Promise<
    ApiResponse<
      Array<{
        id: string;
        title: string;
        category: string;
        responses: number;
        target: number;
        completionRate: number;
        createdAt: string;
        status: "active" | "completed" | "draft";
      }>
    >
  > => {
    return apiRequest("/api/dashboard/recent-surveys");
  },
};

// Survey Management APIs
export const surveyApi = {
  // GET /api/surveys
  getAllSurveys: async (): Promise<{ surveys: Survey[] }> => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authentication header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/surveys`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  },

  // GET /api/surveys/{surveyId}
  getSurvey: async (surveyId: string): Promise<{ survey: Survey }> => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching survey:", error);
      throw error;
    }
  },

  // POST /api/surveys
  createSurvey: async (surveyData: {
    title: string;
    description: string;
    flow_type?: "STATIC" | "INTERACTIVE" | "GAME";
    survey_send_by?: "WHATSAPP" | "EMAIL" | "BOTH" | "NONE" | "AGENT";
    settings?: {
      isAnonymous?: boolean;
      showProgressBar?: boolean;
      shuffleQuestions?: boolean;
    };
    status?: "DRAFT" | "SCHEDULED" | "PUBLISHED";
    scheduled_date?: string;
    scheduled_type?: "IMMEDIATE" | "SCHEDULED";
    surveyCategoryId?: string;
    autoGenerateQuestions?: boolean;
  }): Promise<{ message?: string; survey?: Survey; data: any }> => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authentication header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/surveys`, {
        method: "POST",
        headers,
        body: JSON.stringify(surveyData),
      });
      console.log("response is", response);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("data is", data);
      return { data };
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  },

  // PUT /api/surveys/{surveyId}
  updateSurvey: async (
    surveyId: string,
    surveyData: {
      title?: string;
      description?: string;
      flow_type?: "STATIC" | "INTERACTIVE" | "GAME";
      survey_send_by?: "WHATSAPP" | "EMAIL" | "BOTH" | "NONE";
      settings?: {
        isAnonymous?: boolean;
        showProgressBar?: boolean;
        shuffleQuestions?: boolean;
      };
      autoGenerateQuestions?: boolean;
      status?: "DRAFT" | "SCHEDULED" | "PUBLISHED";
      scheduled_date?: string;
      scheduled_type?: "IMMEDIATE" | "SCHEDULED";
    }
  ): Promise<{ message: string; aiGeneratedQuestions: any }> => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authentication header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(surveyData),
      });
      console.log("response is", response);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("data is", data);
      return { data };
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
    // return apiRequest(`/api/surveys/${surveyId}`, {
    //   method: "PUT",
    //   body: JSON.stringify(surveyData),
    // });
  },

  // DELETE /api/surveys/{surveyId}
  deleteSurvey: async (
    surveyId: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest(`/api/surveys/${surveyId}`, {
      method: "DELETE",
    });
  },
};

// Question Management APIs
export const questionApi = {
  // POST /api/questions
  createQuestion: async (questionData: {
    surveyId: string;
    question_type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";
    question_text: string;
    options: any[];
    // media?: Array<{
    //   type: string;
    //   url: string;
    //   thumbnail_url?: string;
    // }>;
    mediaId?: string;
    categoryId: string;
    // subCategoryId: string;
    order_index?: number;
    required?: boolean;
    rowOptions?: any[];
    columnOptions?: any[];
  }): Promise<ApiResponse<Question>> => {
    return apiRequest("/api/questions", {
      method: "POST",
      body: JSON.stringify(questionData),
    });
  },

  // GET /api/questions/survey/{surveyId}
  getQuestionsBySurvey: async (
    surveyId: string
  ): Promise<ApiResponse<Question[]>> => {
    return apiRequest(`/api/questions/survey/${surveyId}`);
  },

  // GET /api/questions/?surveyId={surveyId} OR /api/questions/?id={questionId}
  // const response = await questionApi.getQuestions("survey123");
  // same as GET /api/questions?surveyId=survey123
  // const response = await questionApi.getQuestions(undefined, "question456");
  // same as GET /api/questions?id=question456
  getQuestions: async (
    surveyId?: string,
    id?: string
  ): Promise<ApiResponse<Question[]>> => {
    try {
      // Build query params using URLSearchParams for cleaner handling
      const params = new URLSearchParams();

      if (surveyId) params.append("surveyId", surveyId);
      else if (id) params.append("id", id);
      else return { error: "Either 'surveyId' or 'id' must be provided." };

      const url = `/api/questions?${params.toString()}`;

      // Make API request (your apiRequest already handles auth, timeout, JSON parsing)
      const response = await apiRequest<Question[]>(url);

      return response;
    } catch (err: any) {
      console.error("Error fetching questions:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while fetching questions.",
      };
    }
  },

  getAiGeneratedQuestions: async (surveyId: string) => {
    return apiRequest(`/api/questions/${surveyId}`);
  },

  // PUT /api/questions/{questionId}
  updateQuestion: async (
    questionId: string,
    questionData: {
      question_text?: string;
      options?: any[];
      media?: Array<{
        type: string;
        url: string;
        thumbnail_url?: string;
      }>;
      categoryId?: string;
      subCategoryId?: string;
      order_index?: number;
      required?: boolean;
      rowOptions?: any[];
      columnOptions?: any[];
    }
  ): Promise<ApiResponse<Question>> => {
    return apiRequest(`/api/questions/${questionId}`, {
      method: "PUT",
      body: JSON.stringify(questionData),
    });
  },

  // DELETE /api/questions/{questionId}
  deleteQuestion: async (
    questionId: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest(`/api/questions/${questionId}`, {
      method: "DELETE",
    });
  },
};

// Survey Sharing APIs
export const surveyShareApi = {
  // POST /api/surveys/{surveyId}/generate-link
  generatePublicLink: async (
    surveyId: string,
    options?: {
      expiresAt?: string;
      maxResponses?: number;
      requireAuth?: boolean;
    }
  ): Promise<
    ApiResponse<{
      publicUrl: string;
      shareCode: string;
      expiresAt?: string;
      maxResponses?: number;
    }>
  > => {
    return apiRequest(`/api/surveys/${surveyId}/generate-link`, {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },

  // GET /api/surveys/{surveyId}/share-settings
  getShareSettings: async (
    surveyId: string
  ): Promise<
    ApiResponse<{
      isPublic: boolean;
      publicUrl?: string;
      shareCode?: string;
      expiresAt?: string;
      maxResponses?: number;
      responseCount: number;
    }>
  > => {
    return apiRequest(`/api/surveys/${surveyId}/share-settings`);
  },

  // PUT /api/surveys/{surveyId}/share-settings
  updateShareSettings: async (
    surveyId: string,
    settings: {
      isPublic?: boolean;
      expiresAt?: string;
      maxResponses?: number;
      requireAuth?: boolean;
    }
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest(`/api/surveys/${surveyId}/share-settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },

  // DELETE /api/surveys/{surveyId}/public-link
  revokePublicLink: async (
    surveyId: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest(`/api/surveys/${surveyId}/public-link`, {
      method: "DELETE",
    });
  },
};

// Response Management APIs
export const responseApi = {
  // POST /api/responses/submit
  submitResponse: async (responseData: {
    surveyId: string;
    user_metadata?: {
      name?: string;
      email?: string;
      phone?: string;
      [key: string]: any;
    };
    answers: Array<{
      questionId: string;
      answer_value:
        | string
        | string[]
        | Array<{
            rowOptionId: string;
            selectedColumns: string[];
          }>;
      media?: Array<{
        type: string;
        url: string;
      }>;
    }>;
  }): Promise<ApiResponse<SurveyResponse>> => {
    return apiRequest("/api/responses", {
      method: "POST",
      body: JSON.stringify(responseData),
    });
  },

  // POST /api/responses/submit-with-token
  submitResponseWithToken: async (responseData: {
    token: string;
    user_metadata?: {
      name?: string;
      email?: string;
      phone?: string;
      [key: string]: any;
    };
    answers: Array<{
      questionId: string;
      answer_value:
        | string
        | string[]
        | Array<{
            rowOptionId: string;
            selectedColumns: string[];
          }>;
      media?: Array<{
        type: string;
        url: string;
      }>;
    }>;
  }): Promise<ApiResponse<SurveyResponse>> => {
    return apiRequest("/api/responses/submit-token", {
      method: "POST",
      body: JSON.stringify(responseData),
    });
  },

  // GET /api/responses/survey/{surveyId}
  getResponsesBySurvey: async (
    surveyId: string
  ): Promise<ApiResponse<SurveyResponse[]>> => {
    return apiRequest(`/api/responses/survey/${surveyId}`);
  },

  // GET /api/responses/{responseId}
  getSurveyResults: async (
    surveyId: string
  ): Promise<ApiResponse<SurveyResponseResult>> => {
    return apiRequest(`/api/responses/surveys/${surveyId}/results`);
  },
};

// Sharing APIs
export const shareApi = {
  // POST /api/share
  shareSurvey: async (shareData: {
    surveyId: string;
    type: "NONE" | "AGENT" | "WHATSAPP" | "EMAIL" | "BOTH";
    recipients?: Array<{
      email?: string;
      mobile_no?: string;
    }>;
    agentUserUniqueIds?: string[];
  }): Promise<
    ApiResponse<{
      shareLink?: string;
      shareCode?: string;
      tokens?: ShareToken[];
    }>
  > => {
    return apiRequest("/api/share", {
      method: "POST",
      body: JSON.stringify(shareData),
    });
  },

  // GET /api/share/validate/{token}
  validateShareToken: async (
    token: string
  ): Promise<ApiResponse<{ surveyId: string; survey: Survey }>> => {
    return apiRequest(`/api/share/validate/${token}`);
  },
};

// Analytics APIs
export const analyticsApi = {
  // GET /api/analytics/survey/{surveyId}
  getSurveyAnalytics: async (
    surveyId: string
  ): Promise<
    ApiResponse<{
      surveyId: string;
      totalResponses: number;
      totalQuestions: number;
      avgCompletionRate: number;
    }>
  > => {
    return apiRequest(`/api/analytics/survey/${surveyId}`);
  },

  // GET /api/analytics/survey/{surveyId}/questions/{questionId?}
  getQuestionAnalytics: async (
    surveyId: string,
    questionId?: string
  ): Promise<
    ApiResponse<{
      surveyId: string;
      analytics: Array<{
        questionId: string;
        question_text: string;
        totalAnswers: number;
        answerDistribution: any;
      }>;
    }>
  > => {
    const endpoint = questionId
      ? `/api/analytics/survey/${surveyId}/questions/${questionId}`
      : `/api/analytics/survey/${surveyId}/questions`;
    return apiRequest(endpoint);
  },

  // GET /api/analytics/survey/{surveyId}/audience
  getAudienceAnalytics: async (
    surveyId: string
  ): Promise<
    ApiResponse<{
      surveyId: string;
      totalAudience: number;
      respondedAudience: number;
      responseRate: number;
    }>
  > => {
    return apiRequest(`/api/analytics/survey/${surveyId}/audience`);
  },

  // Create HTML

  // Post /api/surveys/:id/create-html

  htmlCreate: async (
    id: string,
    data: {
      campaignName?: string;
      selectedAudience?: string[];
    }
  ): Promise<
    ApiResponse<{
      survey: {
        surveyId: string;
        publicUrl: string;
        htmlContent: string;
        updatedAt: string;
      };
      email: {
        sent: number;
        failed: number;
        errors: string[];
        campaignId: string;
      };
    }>
  > => {
    return apiRequest(`/api/surveys/${id}/create-html`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // PUT /api/surveys/:id
  updateSurvey: async (
    id: string,
    updates: {
      title?: string;
      description?: string;
      status?: "active" | "completed" | "draft";
      questions?: Array<{
        id?: string;
        type: "single_choice" | "checkbox" | "text" | "rating";
        question: string;
        options?: string[];
        required: boolean;
      }>;
    }
  ): Promise<ApiResponse<{ id: string; updatedAt: string }>> => {
    return apiRequest(`/api/surveys/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  // DELETE /api/surveys/:id
  deleteSurvey: async (
    id: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest(`/api/surveys/${id}`, {
      method: "DELETE",
    });
  },

  // POST /api/surveys/:id/duplicate
  duplicateSurvey: async (
    id: string
  ): Promise<
    ApiResponse<{
      id: string;
      title: string;
      createdAt: string;
    }>
  > => {
    return apiRequest(`/api/surveys/${id}/duplicate`, {
      method: "POST",
    });
  },

  // POST /api/surveys/:id/send
  sendSurvey: async (
    id: string
  ): Promise<
    ApiResponse<{
      sentCount: number;
      message: string;
    }>
  > => {
    return apiRequest(`/api/surveys/${id}/send`, {
      method: "POST",
    });
  },
};

// Survey Results APIs (Based on SURVEY_RESULTS_FRONTEND_IMPLEMENTATION.md)
export const surveyResultsApi = {
  // GET /api/survey-results/:surveyId - Get Survey Results with Pagination & Filters
  getSurveyResults: async (
    surveyId: string,
    params?: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      questionId?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ): Promise<
    ApiResponse<{
      surveyId: string;
      surveyTitle: string;
      totalResponses: number;
      currentPage: number;
      totalPages: number;
      responses: Array<{
        id: string;
        surveyId: string;
        user_metadata: {
          name?: string;
          email?: string;
          phone?: string;
          [key: string]: any;
        };
        created_at: string;
        response_answers: Array<{
          id: string;
          questionId: string;
          answer_value: string | null;
          selected_option_ids: string[] | null;
          scaleRatingValue: number | null;
          question: {
            id: string;
            question_text: string;
            question_type: string;
            options: any[];
          };
          grid_answers: any[];
        }>;
      }>;
    }>
  > => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.questionId) queryParams.append("questionId", params.questionId);
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const endpoint = `/api/survey-results/${surveyId}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiRequest(endpoint);
  },

  // GET /api/survey-results/:surveyId/summary - Get Survey Results Summary
  getSummary: async (
    surveyId: string
  ): Promise<
    ApiResponse<{
      surveyId: string;
      surveyTitle: string;
      totalQuestions: number;
      totalResponses: number;
      completionRate: string;
      responseTimeline: Record<string, number>;
      avgResponsesPerDay: string;
    }>
  > => {
    return apiRequest(`/api/survey-results/${surveyId}/summary`);
  },

  // GET /api/survey-results/:surveyId/questions/:questionId - Get Question-wise Results
  getQuestionResults: async (
    surveyId: string,
    questionId: string
  ): Promise<
    ApiResponse<{
      surveyId: string;
      questionId: string;
      questionText: string;
      questionType: string;
      totalAnswers: number;
      answerDistribution: Record<string, number> | null;
      gridDistribution: any | null;
      options: Array<{
        id: string;
        text: string;
        rangeFrom: number | null;
        rangeTo: number | null;
      }>;
    }>
  > => {
    return apiRequest(
      `/api/survey-results/${surveyId}/questions/${questionId}`
    );
  },

  exportResults: async (
    surveyId: string
  ): Promise<ApiResponse<SurveyResponseResult>> => {
    return apiRequest(`/api/responses/surveys/${surveyId}/export`);
  },

  // GET /api/survey-results/:surveyId/export - Export Survey Results
  // exportResults: async (
  //   surveyId: string,
  //   format: "json" | "csv" = "json"
  // ): Promise<
  //   ApiResponse<{
  //     surveyId: string;
  //     surveyTitle: string;
  //     exportedAt: string;
  //     totalResponses: number;
  //     responses: any[];
  //   }>
  // > => {
  //   const queryParams = new URLSearchParams();
  //   queryParams.append("format", format);
  //   return apiRequest(
  //     `/api/survey-results/${surveyId}/export?${queryParams.toString()}`
  //   );
  // },

  // GET /api/survey-results/:surveyId/responses/:responseId - Get Response Details
  getResponseDetails: async (
    surveyId: string,
    responseId: string
  ): Promise<
    ApiResponse<{
      id: string;
      surveyId: string;
      user_metadata: {
        name?: string;
        email?: string;
        phone?: string;
        company?: string;
        [key: string]: any;
      };
      created_at: string;
      survey: {
        id: string;
        title: string;
        description: string;
      };
      response_answers: Array<{
        id: string;
        questionId: string;
        answer_value: string | null;
        selected_option_ids: string[] | null;
        scaleRatingValue: number | null;
        question: {
          id: string;
          question_text: string;
          question_type: string;
        };
        grid_answers: any[];
      }>;
    }>
  > => {
    return apiRequest(
      `/api/survey-results/${surveyId}/responses/${responseId}`
    );
  },

  // GET /api/survey-results/:surveyId/filtered - Get Filtered Responses
  getFilteredResponses: async (
    surveyId: string,
    params: {
      questionId: string;
      answerValue: string;
      page?: number;
      limit?: number;
    }
  ): Promise<
    ApiResponse<{
      surveyId: string;
      questionId: string;
      filterValue: string;
      totalMatches: number;
      currentPage: number;
      totalPages: number;
      responses: Array<{
        id: string;
        surveyId: string;
        user_metadata: {
          name?: string;
          email?: string;
          [key: string]: any;
        };
        created_at: string;
        response_answers: any[];
      }>;
    }>
  > => {
    const queryParams = new URLSearchParams();
    queryParams.append("questionId", params.questionId);
    queryParams.append("answerValue", params.answerValue);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());

    return apiRequest(
      `/api/survey-results/${surveyId}/filtered?${queryParams.toString()}`
    );
  },

  // Legacy endpoints for backward compatibility
  // GET /api/surveys/:id/responses
  getIndividualResponses: async (
    id: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<
    PaginatedResponse<{
      id: string;
      submittedAt: string;
      completionTime: number;
      answers: Array<{
        questionId: string;
        question: string;
        answer: string;
      }>;
    }>
  > => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const endpoint = `/api/surveys/${id}/responses${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiRequest(endpoint);
  },

  // GET /api/surveys/:id/export
  exportSurveyData: async (
    id: string,
    format: "csv" | "excel" | "pdf" | "json"
  ): Promise<Blob> => {
    const token = getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/surveys/${id}/export?format=${format}`,
      {
        headers,
      }
    );

    if (!response.ok) {
      throw new Error("Export failed");
    }

    return response.blob();
  },
};

// Audience APIs
export const audienceApi = {
  // GET /api/audience
  getAudience: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    ageGroup?: string;
    gender?: string;
    country?: string;
    industry?: string;
  }): Promise<
    PaginatedResponse<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      ageGroup: string;
      gender: string;
      city: string;
      state: string;
      country: string;
      industry: string;
      jobTitle: string;
      education: string;
      income: string;
      joinedDate: string;
      isActive: boolean;
      lastActivity: string;
      tags: string[];
    }>
  > => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.ageGroup) queryParams.append("ageGroup", params.ageGroup);
    if (params?.gender) queryParams.append("gender", params.gender);
    if (params?.country) queryParams.append("country", params.country);
    if (params?.industry) queryParams.append("industry", params.industry);

    const endpoint = `/api/audience${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiRequest(endpoint);
  },

  // GET /api/audience/stats
  getAudienceStats: async (): Promise<
    ApiResponse<{
      total: number;
      active: number;
      byAgeGroup: Record<string, number>;
      byGender: Record<string, number>;
      byCountry: Record<string, number>;
      byState: Record<string, number>;
      byIndustry: Record<string, number>;
    }>
  > => {
    return apiRequest("/api/audience/stats");
  },

  // POST /api/audience/import
  importAudience: async (
    file: File
  ): Promise<
    ApiResponse<{
      imported: number;
      skipped: number;
      errors: string[];
    }>
  > => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("file", file);

    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return apiRequest("/api/audience/import", {
      method: "POST",
      body: formData,
      headers,
    });
  },

  // GET /api/audience/export
  exportAudience: async (params?: {
    format?: "csv" | "excel";
    ageGroup?: string;
    gender?: string;
    country?: string;
    industry?: string;
  }): Promise<Blob> => {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();
    if (params?.format) queryParams.append("format", params.format);
    if (params?.ageGroup) queryParams.append("ageGroup", params.ageGroup);
    if (params?.gender) queryParams.append("gender", params.gender);
    if (params?.country) queryParams.append("country", params.country);
    if (params?.industry) queryParams.append("industry", params.industry);

    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const endpoint = `/api/audience/export${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

    if (!response.ok) {
      throw new Error("Export failed");
    }

    return response.blob();
  },

  // POST /api/audience/segments
  createSegment: async (segmentData: {
    name: string;
    description: string;
    criteria: {
      ageGroups?: string[];
      genders?: string[];
      countries?: string[];
      industries?: string[];
    };
  }): Promise<
    ApiResponse<{
      id: string;
      name: string;
      memberCount: number;
    }>
  > => {
    return apiRequest("/api/audience/segments", {
      method: "POST",
      body: JSON.stringify(segmentData),
    });
  },

  // GET /api/audience/segments
  getSegments: async (): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        description: string;
        memberCount: number;
        createdAt: string;
      }>
    >
  > => {
    return apiRequest("/api/audience/segments");
  },
};

// Categories API
export const categoriesApi = {
  // GET /api/categories
  getCategories: async (): Promise<
    ApiResponse<Array<{ id: string; name: string }>>
  > => {
    try {
      // Try external API first
      const result = await apiRequest("/api/categories/getSurveyCategory");
      // Handle the new API response format: { categories: [{ id: "uuid", name: "string" }] }
      if (result.data && (result.data as any).categories) {
        return { data: (result.data as any).categories };
      }

      // If external API fails, try local API route
      console.log("External API failed, trying local API route...");
      const localResult = await fetch("/api/categories");
      if (localResult.ok) {
        const localData = await localResult.json();
        if (localData.categories) {
          return { data: localData.categories };
        }
      }

      return { data: [] };
    } catch (error) {
      console.error("Categories API error:", error);
      return { data: [] };
    }
  },

  // GET /api/categories
  getQuestionCategories: async (): Promise<
    ApiResponse<Array<{ id: string; type_name: string }>>
  > => {
    const result = await apiRequest("/api/categories/getQuestionCategory");
    // Handle the new API response format: { categories: [{ id: "uuid", type_name: "string" }] }
    if (result.data && (result.data as any).categories) {
      return { data: (result.data as any).categories };
    }
    return { data: [] };
  },
};

// Demo data for testing (fallback when API is not available)
export const demoData = {
  dashboardStats: {
    totalSurveys: 24,
    surveyGrowth: 12,
    totalResponses: 1842,
    responseGrowth: 8,
    completionRate: 76,
    completionRateGrowth: 3,
    avgResponseTime: 4.2,
    responseTimeImprovement: 12,
  },

  dashboardCharts: {
    barChart: [
      { category: "IT Sector", responses: 320 },
      { category: "Automotive", responses: 240 },
      { category: "Healthcare", responses: 280 },
      { category: "Education", responses: 180 },
      { category: "Retail", responses: 220 },
    ],
    lineChart: [
      { month: "Jan", surveys: 10, responses: 320 },
      { month: "Feb", surveys: 12, responses: 380 },
      { month: "Mar", surveys: 14, responses: 420 },
      { month: "Apr", surveys: 18, responses: 550 },
      { month: "May", surveys: 20, responses: 620 },
      { month: "Jun", surveys: 24, responses: 700 },
    ],
    pieChart: [
      { category: "IT Sector", value: 32 },
      { category: "Automotive", value: 24 },
      { category: "Healthcare", value: 18 },
      { category: "Education", value: 14 },
      { category: "Retail", value: 12 },
    ],
  },

  surveys: [
    {
      id: "survey-1",
      title: "IT Professional Work Satisfaction",
      category: "IT Sector",
      status: "active" as const,
      responses: 320,
      target: 500,
      completionRate: 76,
      createdAt: "2023-06-15",
      updatedAt: "2023-06-20",
    },
    {
      id: "survey-2",
      title: "Automotive Customer Experience",
      category: "Automotive",
      status: "completed" as const,
      responses: 240,
      target: 250,
      completionRate: 96,
      createdAt: "2023-06-10",
      updatedAt: "2023-06-18",
    },
  ],

  categories: [
    { id: "9c3523f5-0c5b-412e-a158-99e07b888bd3", name: "IT Sector" },
    { id: "e543505d-6a79-48a5-ba47-8c83e79e4e5b", name: "Automotive" },
    { id: "f1234567-1234-1234-1234-123456789abc", name: "Healthcare" },
    { id: "f2345678-2345-2345-2345-23456789abcd", name: "Education" },
    { id: "f3456789-3456-3456-3456-3456789abcde", name: "Retail" },
    { id: "f4567890-4567-4567-4567-456789abcdef", name: "Finance" },
    { id: "f5678901-5678-5678-5678-56789abcdef0", name: "Manufacturing" },
    { id: "f6789012-6789-6789-6789-6789abcdef01", name: "Entertainment" },
    { id: "f7890123-7890-7890-7890-789abcdef012", name: "Food & Beverage" },
    { id: "f8901234-8901-8901-8901-89abcdef0123", name: "Travel & Tourism" },
    { id: "f9012345-9012-9012-9012-9abcdef01234", name: "Real Estate" },
    { id: "fa123456-a123-a123-a123-abcdef012345", name: "Media" },
    { id: "fb234567-b234-b234-b234-bcdef0123456", name: "Sports" },
    { id: "fc345678-c345-c345-c345-cdef01234567", name: "Technology" },
    { id: "fd456789-d456-d456-d456-def012345678", name: "Energy" },
  ],

  question_categories: [
    { id: "e690972c-0956-442e-a0b4-3c109c3d42f7", type_name: "short answer" },
    { id: "4234edbe-bb13-4acd-918b-ea83e3107eb4", type_name: "paragraph" },
    {
      id: "ad17eee6-d97e-4bdc-9870-2881ea2b391f",
      type_name: "multiple choice",
    },
    { id: "86e2d9dc-2f36-47ff-b502-cc24532091d9", type_name: "checkboxes" },
    { id: "516210a8-16c5-465c-aa84-7a02b3c032a4", type_name: "dropdown" },
    { id: "56abdae6-9b0d-4313-9187-8330ae8121e5", type_name: "file upload" },
    { id: "97140e9a-acf8-4293-93b6-022a6962bce1", type_name: "linear scale" },
    { id: "b0a418b1-f832-4b02-a44a-683008e6761b", type_name: "rating" },
    {
      id: "d6c6b58e-0037-4295-a9ec-4a1b6ff03429",
      type_name: "multi-choice grid",
    },
    { id: "60516591-f744-4efd-ae56-58d8e1ca911c", type_name: "checkbox grid" },
    { id: "276364c5-1b96-4b4e-a362-833973532241", type_name: "date" },
    { id: "d16778d4-85bc-4fac-8815-2bb2f1346fd9", type_name: "time" },
  ],

  audienceStats: {
    total: 10000,
    active: 9000,
    byAgeGroup: {
      "18-24": 1500,
      "25-34": 3000,
      "35-44": 2500,
      "45-54": 2000,
      "55-64": 800,
      "65+": 200,
    },
    byGender: {
      Male: 5200,
      Female: 4500,
      "Non-binary": 200,
      "Prefer not to say": 100,
    },
    byCountry: {
      "United States": 6000,
      Canada: 1500,
      "United Kingdom": 1200,
      Germany: 800,
      Australia: 500,
    },
    byIndustry: {
      "IT Sector": 2000,
      Healthcare: 1500,
      Finance: 1200,
      Education: 1000,
      Retail: 800,
    },
  },

  generatedQuestions: {
    category: "IT Sector",
    description:
      "Survey about remote work satisfaction and productivity in tech companies",
    questionCount: 5,
    questions: [
      {
        id: "demo_q1",
        type: "single_choice" as const,
        question: "How satisfied are you with your current remote work setup?",
        options: [
          "Very Satisfied",
          "Satisfied",
          "Neutral",
          "Dissatisfied",
          "Very Dissatisfied",
        ],
        required: true,
      },
      {
        id: "demo_q2",
        type: "rating" as const,
        question: "Rate your productivity while working remotely (1-5)",
        options: ["1", "2", "3", "4", "5"],
        required: true,
      },
      {
        id: "demo_q3",
        type: "text" as const,
        question:
          "What tools or resources would improve your remote work experience?",
        options: [],
        required: false,
      },
    ],
    generatedWith: "static" as const,
  },
};

// Missing APIs that need backend implementation
export const missingApis = {
  // These APIs are referenced in the frontend but not yet implemented in the new backend
  // categories: "GET /api/categories - needs implementation",
  dashboard: "Dashboard APIs - need implementation",
  audience: "Audience management APIs - need implementation",
  questionGeneration: "AI question generation - needs implementation",
  surveyResults:
    "Survey results and analytics - partially covered by analytics APIs",
};
