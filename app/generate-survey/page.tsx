"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Eye,
  Code,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Share2,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Mail,
  BarChart3,
  FileText,
} from "lucide-react";
import SurveyPreview from "@/components/survey-preview";
import EnhancedQuestionEditor from "@/components/enhanced-question-editor";
import AudienceSelector from "@/components/audience-selector";
import Link from "next/link";
import CodeView from "@/components/code-view";
import { generateSurveyHtml } from "@/lib/survey-generator";
import {
  categoriesApi,
  surveyApi,
  questionApi,
  questionGenerationApi,
  surveyShareApi,
  apiWithFallback,
  demoData,
} from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { syncSurveyQuestions } from "@/lib/question-sync";
import { toast } from "react-toastify";

export default function GenerateSurvey() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editSurveyId = searchParams.get("edit");
  const isEditMode = !!editSurveyId;

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [surveyCategoryId, setSurveyCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [autoGenerateQuestions, setAutoGenerateQuestions] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<any[]>([]);
  const [questionsGenerated, setQuestionsGenerated] = useState(false);
  const [generationMethod, setGenerationMethod] = useState<
    "openai" | "static" | null
  >(null);
  const [surveySettings, setSurveySettings] = useState({
    flow_type: "STATIC" as const,
    survey_send_by: "NONE" as const,
    isAnonymous: false,
    showProgressBar: true,
    shuffleQuestions: false,
    allowMultipleSubmissions: false,
  });
  const [audience, setAudience] = useState({
    ageGroups: [],
    genders: ["Male"],
    locations: ["India"],
    state: [""],
    industries: ["IT Sector"],
    targetCount: 1,
    dataSource: "default",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [surveyHtml, setSurveyHtml] = useState("");
  const [createdSurvey, setCreatedSurvey] = useState<any>(null);
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);

  // Store original survey data for comparison
  const [originalSurveyData, setOriginalSurveyData] = useState<any>(null);

  // API calls
  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useApi(() => {
    return apiWithFallback(
      () => categoriesApi.getCategories(),
      demoData.categories
    );
  }, []); // Add empty dependency array to prevent infinite re-renders

  const {
    mutate: createQuestion,
    loading: createQuestionLoading,
    error: createQuestionError,
  } = useMutation(questionApi.createQuestion);

  // const {
  //   data: questionConfig,
  //   loading: configLoading,
  //   error: configError,
  // } = useApi(() =>
  //   apiWithFallback(() => questionGenerationApi.getConfig(), {
  //     mode: "static" as const,
  //     openaiConnected: false,
  //     availableCategories: demoData.categories.map((cat) => cat.name),
  //     settings: {
  //       openai: {
  //         model: "gpt-4o",
  //         maxQuestions: 10,
  //         temperature: 0.7,
  //         questionTypes: [],
  //       },
  //       static: { defaultQuestionsPerCategory: 5 },
  //     },
  //   })
  // );

  const {
    mutate: createSurvey,
    loading: createSurveyLoading,
    error: createError,
  } = useMutation(surveyApi.createSurvey);

  const {
    mutate: updateSurvey,
    loading: updateLoading,
    error: updateError,
  } = useMutation((updateData: any) =>
    surveyApi.updateSurvey(editSurveyId!, updateData)
  );

  // const {
  //   mutate: htmlCreate,
  //   loading: htmlCreateLoading,
  //   error: htmlCreateError,
  // } = useMutation(surveyApi.htmlCreate);

  const {
    mutate: generateQuestions,
    loading: generatingQuestions,
    error: generationError,
  } = useMutation(questionGenerationApi.generateQuestions);

  const displayCategories = categories || demoData.categories;
  const filteredCategories = displayCategories.filter((cat: any) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to get category name from ID
  const getCategoryName = (categoryId: string) => {
    const category = displayCategories.find(
      (cat: any) => cat.id === categoryId
    );
    return category ? category.name : categoryId;
  };

  // Load existing survey data when in edit mode
  useEffect(() => {
    const loadSurveyData = async () => {
      if (!isEditMode || !editSurveyId) return;

      setLoadingSurvey(true);
      setLoadError(null);

      try {
        const response = await surveyApi.getSurvey(editSurveyId);
        const survey = response.survey;

        // Populate form fields with existing survey data
        setTitle(survey.title || "");
        setDescription(survey.description || "");
        setSurveyCategoryId((survey as any).surveyCategoryId || "");

        // Update survey settings
        setSurveySettings({
          flow_type: (survey.flow_type as any) || "STATIC",
          survey_send_by: (survey.survey_send_by as any) || "NONE",
          isAnonymous: false,
          showProgressBar: true,
          shuffleQuestions: false,
          allowMultipleSubmissions: false,
        });

        // Load questions for the survey
        try {
          const questionsResponse = await questionApi.getQuestionsBySurvey(
            editSurveyId
          );
          console.log("Questions response:", questionsResponse);

          if (
            questionsResponse.data &&
            Array.isArray(questionsResponse.data) &&
            questionsResponse.data.length > 0
          ) {
            // Map API questions to component format
            const mappedQuestions = questionsResponse.data.map(
              (q: any, index: number) => ({
                id: q.id || `q${Date.now()}_${index}`,
                question_type: q.question_type || q.type || "TEXT",
                question_text: q.question_text || q.question || "",
                options: q.options || [],
                required: q.required || false,
                categoryId: q.categoryId || "",
                order_index: q.order_index || index,
                // description: q.description || "",
                // placeholder: q.placeholder || "",
              })
            );

            console.log("Setting questions:", mappedQuestions);
            setQuestions(mappedQuestions);
            setOriginalQuestions(mappedQuestions);
            setQuestionsGenerated(true);
            console.log("Loaded questions successfully:", mappedQuestions);
          } else {
            console.log(
              "No questions found for survey or invalid response format"
            );
            setQuestions([]);
            setOriginalQuestions([]);
            setQuestionsGenerated(false);
          }
        } catch (questionError) {
          console.warn("Could not load questions:", questionError);
          // Continue without questions - user can add them manually
          setQuestions([]);
          setOriginalQuestions([]);
          setQuestionsGenerated(false);
        }

        setCreatedSurvey(survey);

        // Store original data for comparison
        setOriginalSurveyData({
          title: survey.title,
          description: survey.description,
          flow_type: survey.flow_type,
          survey_send_by: survey.survey_send_by,
          surveyCategoryId: survey.surveyCategoryId,
        });
      } catch (error) {
        console.error("Error loading survey:", error);
        setLoadError("Failed to load survey data. Please try again.");
      } finally {
        setLoadingSurvey(false);
      }
    };

    loadSurveyData();
  }, [isEditMode, editSurveyId]);

  // Generate questions when category and description are set
  // useEffect(() => {
  //   if (surveyCategoryId && description && !questionsGenerated) {
  //     handleGenerateQuestions();
  //   }
  // }, [surveyCategoryId, description]);

  const handleGenerateQuestions = async () => {
    if (!surveyCategoryId || !description) return;

    try {
      const result = await generateQuestions({
        category: getCategoryName(surveyCategoryId),
        description: description,
        questionCount: 5,
      });

      if (result && result.questions) {
        setQuestions(result.questions);
        setGenerationMethod(result.generatedWith);
        setQuestionsGenerated(true);
      } else {
        // Fallback to demo questions
        setQuestions(demoData.generatedQuestions.questions);
        setGenerationMethod("static");
        setQuestionsGenerated(true);
      }
    } catch (error) {
      console.error("Failed to generate questions:", error);
      // Use demo questions as fallback
      setQuestions(demoData.generatedQuestions.questions);
      setGenerationMethod("static");
      setQuestionsGenerated(true);
    }
  };

  const nextStep = () => {
    if (step === 3) {
      if (surveySettings.survey_send_by == "NONE") {
        // Skip audience step and go directly to preview
        setStep(5);
        return;
      }
    }
    if (step === 4) {
      // Generate HTML when moving to the preview step
      const html = generateSurveyHtml({
        title: `${getCategoryName(surveyCategoryId)} Survey - (${title})`,
        description: description,
        questions,
      });
      setSurveyHtml(html);
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    // Handle back navigation properly
    if (step === 5 && surveySettings.survey_send_by === "NONE") {
      // If on preview and survey_sent_by is NONE, go back to settings (step 3)
      setStep(3);
      return;
    }
    setStep(step - 1);
  };

  const handleQuestionUpdate = (updatedQuestions: any) => {
    setQuestions(updatedQuestions);
  };

  const handleAudienceUpdate = (updatedAudience: any) => {
    setAudience(updatedAudience);
  };

  const generatePublicLink = async () => {
    if (!createdSurvey?.id) return;

    try {
      const result = await surveyShareApi.generatePublicLink(createdSurvey.id, {
        maxResponses: 1000, // Default limit
        requireAuth: false,
      });

      if (result.data) {
        setPublicLink(result.data.publicUrl);
        setShareCode(result.data.shareCode);
      } else {
        // Fallback: Generate local URL if API doesn't return one
        const baseUrl = window.location.origin;
        const localPublicLink = `${baseUrl}/survey/${createdSurvey.id}`;
        setPublicLink(localPublicLink);
        setShareCode(createdSurvey.id);
        toast.info("Using local survey link");
      }
    } catch (error) {
      console.error("Failed to generate public link:", error);
      // Fallback: Generate local URL
      const baseUrl = window.location.origin;
      const localPublicLink = `${baseUrl}/survey/${createdSurvey.id}`;
      setPublicLink(localPublicLink);
      setShareCode(createdSurvey.id);
      toast.warning("API unavailable, using local survey link");
    }
  };

  const createQuestionsForSurvey = async (surveyId: string) => {
    try {
      console.log("^^^^Creating questions for survey:", surveyId);
      console.log("^^^^^The value of the questions is : ", questions);

      const questionPromises = questions.map(async (q: any, index: number) => {
        const questionData: any = {
          surveyId,
          // question_type: mapQuestionType(q.type),
          question_type: q.question_type,
          question_text: q.question_text,
          options: q.options || [],
          categoryId: q.categoryId || surveyCategoryId || "default-category",
          // subCategoryId: "default-subcategory",
          order_index: index,
          required: q.required || false,
        };
        if (q.mediaId) {
          questionData.mediaId = q.mediaId;
        }
        console.log("^^^^^ questionData is", questionData);

        return await questionApi.createQuestion(questionData);
      });

      const results = await Promise.all(questionPromises);
      console.log("^^^^^ results is", results);
      const createdQuestions = results
        .filter((r) => r.data)
        .map((r) => r.data!);

      console.log(`Created ${createdQuestions.length} questions for survey`);
      return createdQuestions;
    } catch (error) {
      console.error("Failed to create questions:", error);
      return [];
    }
  };

  // const handleHTMLCreateApi = async (id: string) => {
  //   // /api/surveys/:id/create-html

  //   let htmlData = {
  //     selectedAudience: ["ayushbirla71@gmail.com", "birlaaaaaa706@gmail.com"],
  //     campaignName: `${getCategoryName(surveyCategoryId)} Survey - (${title})`,
  //   };

  //   try {
  //     const result = await htmlCreate(id, htmlData);
  //     if (result && result.survey) {
  //       console.log("send Data is", result.survey);
  //       return result;
  //     }
  //   } catch (error) {}
  // };

  // Map question types to supported backend types (TEXT, IMAGE, VIDEO, AUDIO)
  const mapQuestionType = (
    questionType: string
  ): "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" => {
    const typeMap: Record<string, "TEXT" | "IMAGE" | "VIDEO" | "AUDIO"> = {
      TEXT: "TEXT",
      IMAGE: "IMAGE",
      VIDEO: "VIDEO",
      AUDIO: "AUDIO",
      // Legacy mappings
      single_choice: "TEXT",
      checkbox: "TEXT",
      text: "TEXT",
      rating: "TEXT",
      yes_no: "TEXT",
      MCQ: "TEXT",
      CHECKBOX: "TEXT",
      DROPDOWN: "TEXT",
      RATING: "TEXT",
      DATE: "TEXT",
      TIME: "TEXT",
      EMAIL: "TEXT",
      PHONE: "TEXT",
      URL: "TEXT",
      NUMBER: "TEXT",
    };
    return typeMap[questionType] || "TEXT";
  };

  const handlePublishSurvey = async () => {
    try {
      if (!createdSurvey?.id) {
        toast.error("Survey not found. Please go back to Step 1.");
        return;
      }

      setPublishLoading(true);

      // Update the survey status to PUBLISHED
      const updateData = {
        status: "PUBLISHED" as const,
        scheduled_type: "IMMEDIATE" as const,
        // settings: {
        //   isAnonymous: surveySettings.isAnonymous,
        //   showProgressBar: surveySettings.showProgressBar,
        //   shuffleQuestions: surveySettings.shuffleQuestions,
        //   allowMultipleSubmissions: surveySettings.allowMultipleSubmissions,
        // },
      };

      const result = await updateSurvey(updateData);
      console.log("Update result:", result);

      if (result) {
        console.log("Survey updated successfully:", result);
        // Update local survey state
        setCreatedSurvey({
          ...createdSurvey,
          status: "PUBLISHED",
          scheduled_type: "IMMEDIATE",
          // settings: updateData.settings,
        });

        // Store survey data for later use
        const html = generateSurveyHtml({
          id: createdSurvey.id,
          title: title,
          description: description,
          questions,
        });
        // console.log("HTML generated:", html);
        setSurveyHtml(html);

        localStorage.setItem("lastSurveyHtml", html);
        localStorage.setItem(
          "lastSurveyTitle",
          `${getCategoryName(surveyCategoryId)
            .toLowerCase()
            .replace(/\s+/g, "-")}_survey`
        );
        localStorage.setItem(
          "lastSurveyAudience",
          audience.targetCount.toString()
        );
        localStorage.setItem(
          "lastSurveyData",
          JSON.stringify({
            ...createdSurvey,
            status: "PUBLISHED",
            // settings: updateData.settings,
          })
        );

        toast.success("Survey published successfully!");

        // Navigate to share step
        setStep(6);
      } else {
        console.log("Failed to publish survey. Please try again.");
        toast.error("Failed to publish survey. Please try again.");
      }
    } catch (error: any) {
      console.error("Error publishing survey:", error);
      toast.error(error.message || "Failed to publish survey");
    } finally {
      setPublishLoading(false);
    }
  };

  // Fallback method for local survey creation (kept for backward compatibility)
  const handleLocalSurveyCreation = (surveyData: any) => {
    // Save to localStorage for thank you page
    const surveyId = `survey-${Date.now()}`;
    const html = generateSurveyHtml({
      id: surveyId,
      title: `${getCategoryName(surveyCategoryId)} Survey - (${title})`,
      description: description,
      questions,
    });
    setSurveyHtml(html);
    localStorage.setItem("lastSurveyHtml", html);
    localStorage.setItem(
      "lastSurveyTitle",
      `${getCategoryName(surveyCategoryId)
        .toLowerCase()
        .replace(/\s+/g, "-")}_survey`
    );
    localStorage.setItem("lastSurveyAudience", audience.targetCount.toString());
    localStorage.setItem("lastSurveyData", JSON.stringify(surveyData));

    // Add to sent surveys (localStorage fallback)
    const newSurvey = {
      id: surveyId,
      title: `${getCategoryName(surveyCategoryId)} Survey - (${title})`,
      category: getCategoryName(surveyCategoryId),
      status: "active" as const,
      responses: 0,
      target: audience.targetCount,
      completionRate: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };

    // Save to localStorage to persist across page reloads
    const existingSurveys = JSON.parse(
      localStorage.getItem("sentSurveys") || "[]"
    );
    existingSurveys.unshift(newSurvey);
    localStorage.setItem("sentSurveys", JSON.stringify(existingSurveys));

    // Navigate to share step
    setStep(6);
  };

  // Function to check if survey data has changed
  const hasSurveyDataChanged = () => {
    if (!originalSurveyData) return true; // If no original data, consider it changed

    const hasChanged =
      originalSurveyData.title !== title ||
      originalSurveyData.description !== description ||
      // originalSurveyData.flow_type !== surveySettings.flow_type ||
      // originalSurveyData.survey_send_by !== surveySettings.survey_send_by ||
      originalSurveyData.surveyCategoryId !== surveyCategoryId;

    console.log("Survey data changed:", hasChanged, {
      original: originalSurveyData,
      current: {
        title,
        description,
        flow_type: surveySettings.flow_type,
        survey_send_by: surveySettings.survey_send_by,
        surveyCategoryId: surveyCategoryId,
      },
    });

    return hasChanged;
  };

  const handleStep1Continue = async () => {
    if (!surveyCategoryId || !description || !title) return;

    const surveyData = {
      title: title,
      description: description,
      flow_type: surveySettings.flow_type,
      survey_send_by: surveySettings.survey_send_by,
      surveyCategoryId: surveyCategoryId,
      autoGenerateQuestions: autoGenerateQuestions,
    };

    try {
      if (isEditMode && editSurveyId) {
        // Check if data has changed before making API call
        if (hasSurveyDataChanged()) {
          console.log("Changes detected, calling update API");
          // Update existing survey
          const updateData = {
            title: title,
            description: description,
            flow_type: surveySettings.flow_type,
            survey_send_by: surveySettings.survey_send_by,
          };

          const result = await updateSurvey(updateData);
          console.log("Update result:", result);
          if (result && (result as any).data) {
            // Keep the existing survey data but update the fields
            setCreatedSurvey({
              ...createdSurvey,
              title: title,
              description: description,
              flow_type: surveySettings.flow_type,
              survey_send_by: surveySettings.survey_send_by,
            });

            // Update original data to reflect changes
            setOriginalSurveyData({
              ...originalSurveyData,
              title: title,
              description: description,
              flow_type: surveySettings.flow_type,
              survey_send_by: surveySettings.survey_send_by,
              surveyCategoryId: surveyCategoryId,
            });
          }
        } else {
          console.log("No changes detected, skipping update API call");
        }
        // Move to next step regardless of whether update was made
        nextStep();
      } else {
        // Create new survey
        const result = await createSurvey(surveyData);
        console.log("Create result:", result);
        if (result && (result as any)?.survey && (result as any)?.survey?.id) {
          setCreatedSurvey((result as any).survey);
          nextStep();
        }
      }
    } catch (error) {
      console.error("Error saving survey:", error);
    }
  };

  const handleStep2Continue = async () => {
    try {
      console.log(">>>>> the value of the QUESTIONS is : ", questions);
      if (questions.length === 0) {
        alert("Please add at least one question");
        // toast.error("Please add at least one question");
        return;
      }

      if (!createdSurvey?.id) {
        // If for some reason survey isn't created yet, create first
        // or preserve your existing flow that ensures createdSurvey is set in step 1
        console.warn(
          "No survey id found. Make sure Step 1 creates/sets survey."
        );
        return;
      }

      // Persist only on continue: create/update/delete in a single pass
      const updated = await syncSurveyQuestions(
        createdSurvey.id,
        originalQuestions,
        questions
      );

      // Update local questions with real ids for newly created items
      setQuestions(updated);

      // Original becomes current baseline for any further edits
      setOriginalQuestions(updated);

      nextStep();
    } catch (error: any) {
      console.log(">>> the error in the HANDLE STEP 2 function is : ", error);
    }
  };

  const fetchKinds = async (ids: string[]) => {
    // Example using a typed API client; shape this to your backend
    // Expected response: { data: Array<{ id: string; kind: string }> }
    const resp = await categoriesApi.getQuestionCategories();
    const data = Array.isArray(resp?.data) ? resp.data : [];
    const rows = data.filter((r: any) => ids.includes(r.id));
    console.log("****** Rows is", rows);
    const map = rows.reduce((acc: Record<string, string>, r: any) => {
      // Normalize to the supported set inside preview
      acc[r.id] = r.type_name; // preview will normalize via normKindStr
      return acc;
    }, {});
    return map as Record<string, any>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-6xl py-6 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {isEditMode ? "Edit Survey" : "Generate Survey"}
              </h1>
              <p className="text-slate-500 mt-1">
                {isEditMode
                  ? "Update your survey details and questions"
                  : "Create and customize your survey with AI-powered questions"}
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="flex justify-between items-center">
              <div
                className={`flex flex-col items-center ${
                  step >= 1 ? "text-violet-600" : "text-slate-400"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    step >= 1
                      ? "bg-violet-100 text-violet-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  1
                </div>
                <span className="mt-2 text-sm font-medium">
                  Category & Description
                </span>
              </div>
              <div className="flex-1 h-px bg-slate-200 mx-4" />
              <div
                className={`flex flex-col items-center ${
                  step >= 2 ? "text-violet-600" : "text-slate-400"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    step >= 2
                      ? "bg-violet-100 text-violet-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  2
                </div>
                <span className="mt-2 text-sm font-medium">Edit Questions</span>
              </div>
              <div className="flex-1 h-px bg-slate-200 mx-4" />
              <div
                className={`flex flex-col items-center ${
                  step >= 3 ? "text-violet-600" : "text-slate-400"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    step >= 3
                      ? "bg-violet-100 text-violet-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  3
                </div>
                <span className="mt-2 text-sm font-medium">
                  Survey Settings
                </span>
              </div>
              <div className="flex-1 h-px bg-slate-200 mx-4" />
              <div
                className={`flex flex-col items-center ${
                  step >= 4 ? "text-violet-600" : "text-slate-400"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    step >= 4
                      ? "bg-violet-100 text-violet-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  4
                </div>
                <span className="mt-2 text-sm font-medium">
                  Target Audience
                </span>
              </div>
              <div className="flex-1 h-px bg-slate-200 mx-4" />
              <div
                className={`flex flex-col items-center ${
                  step >= 5 ? "text-violet-600" : "text-slate-400"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    step >= 5
                      ? "bg-violet-100 text-violet-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  5
                </div>
                <span className="mt-2 text-sm font-medium">
                  Preview & Publish
                </span>
              </div>
              <div className="flex-1 h-px bg-slate-200 mx-4" />
              <div
                className={`flex flex-col items-center ${
                  step >= 6 ? "text-violet-600" : "text-slate-400"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    step >= 6
                      ? "bg-violet-100 text-violet-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  6
                </div>
                <span className="mt-2 text-sm font-medium">Share Survey</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State for Edit Mode */}
        {loadingSurvey && (
          <div className="mb-6 p-6 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-violet-600 mr-2" />
              <span className="text-slate-600">Loading survey data...</span>
            </div>
          </div>
        )}

        {/* Error State for Edit Mode */}
        {loadError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-red-800 text-sm">{loadError}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => router.push("/")}
            >
              Back to Dashboard
            </Button>
          </div>
        )}

        {/* Error Display */}
        {(categoriesError || createError || generationError) && (
          //  || configError
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-yellow-800 text-sm">
                ⚠️{" "}
                {categoriesError &&
                  `Categories API failed: ${categoriesError}. `}
                {createError && `Survey creation failed: ${createError}. `}
                {generationError &&
                  `Question generation failed: ${generationError}. `}
                {/* {configError && `Configuration failed: ${configError}. `} */}
                Using fallback data where needed.
              </p>
            </div>
          </div>
        )}

        {/* Question Generation Status */}
        {/* {questionConfig && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <p className="text-blue-800 text-sm">
                Question Generation:{" "}
                {questionConfig.mode === "openai"
                  ? "AI-Powered"
                  : "Template-Based"}
                {questionConfig.mode === "openai" &&
                  !questionConfig.openaiConnected &&
                  " (Fallback to templates)"}
              </p>
            </div>
          </div>
        )} */}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Step 1: Category Selection & Description */}
          {step === 1 && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                  Choose Category & Describe Your Survey
                </h2>
                <p className="text-slate-500">
                  Select a category and describe what kind of survey you want to
                  create. Questions will be generated automatically based on
                  your input.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <Label
                    htmlFor="surveyCategoryId"
                    className="text-sm font-medium mb-3 block"
                  >
                    Select Category Of Survey
                  </Label>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="search-category of survey"
                      placeholder="Search categories..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {categoriesLoading && (
                      <RefreshCw className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                    {filteredCategories.map((cat: any) => (
                      <Button
                        key={cat.id}
                        variant={
                          surveyCategoryId === cat.id ? "default" : "outline"
                        }
                        className="justify-start h-auto p-3 text-left text-sm"
                        onClick={() => {
                          setSurveyCategoryId(cat.id);
                          setQuestionsGenerated(false); // Reset questions when category changes
                        }}
                        disabled={categoriesLoading}
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="title"
                    className="text-sm font-medium mb-3 block"
                  >
                    Survey Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="title....."
                    className="h-10 resize-none"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setQuestionsGenerated(false); // Reset questions when description changes
                    }}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium mb-3 block"
                  >
                    Describe Your Survey
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what kind of survey you want to generate. Be specific about what you want to learn from your audience..."
                    className="h-32 resize-none"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setQuestionsGenerated(false); // Reset questions when description changes
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Example: "I want to understand customer satisfaction with
                    our mobile app, focusing on usability and feature
                    preferences."
                  </p>
                </div>

                <div className="flex items-center mt-4 space-x-2">
                  <Checkbox
                    id="auto-generate"
                    checked={autoGenerateQuestions}
                    onCheckedChange={(checked) =>
                      setAutoGenerateQuestions(!!checked)
                    }
                  />
                  <Label htmlFor="auto-generate" className="text-sm">
                    Auto-generate questions
                  </Label>
                </div>

                {/* Question Generation Preview */}
                {generatingQuestions && (
                  <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-violet-600" />
                      <p className="text-violet-800 text-sm">
                        Generating questions based on your category and
                        description...
                      </p>
                    </div>
                  </div>
                )}

                {questionsGenerated && questions.length > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      <p className="text-green-800 text-sm font-medium">
                        {questions.length} questions generated using{" "}
                        {generationMethod === "openai" ? "AI" : "templates"}
                      </p>
                    </div>
                    <p className="text-green-700 text-xs">
                      You can customize these questions in the next step.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-8 border-t border-slate-200 mt-8">
                <Button variant="outline" disabled>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleStep1Continue}
                  disabled={
                    !surveyCategoryId ||
                    !description ||
                    categoriesLoading ||
                    !title
                  }
                >
                  {generatingQuestions ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Question Editor */}
          {step === 2 && (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                  Customize Your Questions
                </h2>
                <p className="text-slate-500">
                  Edit, reorder, and customize the questions generated for your{" "}
                  {getCategoryName(surveyCategoryId)} survey
                  {generationMethod && (
                    <span className="ml-2 text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded">
                      Generated with{" "}
                      {generationMethod === "openai" ? "AI" : "Templates"}
                    </span>
                  )}
                </p>
              </div>

              <EnhancedQuestionEditor
                questions={questions}
                onQuestionsUpdate={handleQuestionUpdate}
                survey={createdSurvey}
              />

              <div className="flex justify-between pt-8 border-t border-slate-200 mt-8">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleStep2Continue}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Survey Settings */}
          {step === 3 && (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                  Survey Settings
                </h2>
                <p className="text-slate-500">
                  Configure how your survey will work
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="flow_type">Survey Flow Type</Label>
                    <Select
                      value={surveySettings.flow_type}
                      onValueChange={(
                        value: "STATIC" | "INTERACTIVE" | "GAME"
                      ) =>
                        setSurveySettings((prev: any) => ({
                          ...prev,
                          flow_type: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STATIC">Static</SelectItem>
                        <SelectItem value="INTERACTIVE">Interactive</SelectItem>
                        <SelectItem value="GAME">Game</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="survey_send_by">Distribution Method</Label>
                    <Select
                      value={surveySettings.survey_send_by}
                      onValueChange={(
                        value: "WHATSAPP" | "EMAIL" | "BOTH" | "NONE"
                      ) =>
                        setSurveySettings((prev: any) => ({
                          ...prev,
                          survey_send_by: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="BOTH">Both</SelectItem> */}
                        <SelectItem value="NONE">Public (Link Only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isAnonymous"
                      checked={surveySettings.isAnonymous}
                      onCheckedChange={(checked) =>
                        setSurveySettings((prev) => ({
                          ...prev,
                          isAnonymous: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="isAnonymous">Anonymous responses</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showProgressBar"
                      checked={surveySettings.showProgressBar}
                      onCheckedChange={(checked) =>
                        setSurveySettings((prev) => ({
                          ...prev,
                          showProgressBar: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="showProgressBar">Show progress bar</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="shuffleQuestions"
                      checked={surveySettings.shuffleQuestions}
                      onCheckedChange={(checked) =>
                        setSurveySettings((prev) => ({
                          ...prev,
                          shuffleQuestions: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="shuffleQuestions">Shuffle questions</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowMultipleSubmissions"
                      checked={surveySettings.allowMultipleSubmissions}
                      onCheckedChange={(checked) =>
                        setSurveySettings((prev) => ({
                          ...prev,
                          allowMultipleSubmissions: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="allowMultipleSubmissions">
                      Allow multiple submissions
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-8 border-t border-slate-200 mt-8">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={nextStep}>
                  {surveySettings.survey_send_by == "NONE" ? (
                    <>Continue to Preview & Publish</>
                  ) : (
                    <>Continue to Audience</>
                  )}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Target Audience */}
          {step === 4 && (
            <div className="p-8">
              <AudienceSelector
                audience={audience}
                onAudienceUpdate={handleAudienceUpdate}
              />

              <div className="flex justify-between pt-8 border-t border-slate-200 mt-8">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={nextStep}>
                  Continue to Preview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Preview & Publish */}
          {step === 5 && (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                  Preview & Publish Survey
                </h2>
                <p className="text-slate-500">
                  Review your survey before publishing it to{" "}
                  {audience.targetCount.toLocaleString()} respondents.
                </p>
              </div>

              <Tabs defaultValue="preview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger
                    value="preview"
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview Survey
                  </TabsTrigger>
                  {/* <TabsTrigger value="code" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    HTML Code
                  </TabsTrigger> */}
                </TabsList>

                <TabsContent value="preview" className="space-y-4">
                  <SurveyPreview
                    title={`${getCategoryName(
                      surveyCategoryId
                    )} Survey - (${title})`}
                    description={description}
                    questions={questions}
                    fetchKinds={fetchKinds}
                  />
                </TabsContent>

                <TabsContent value="code" className="space-y-4">
                  <Card>
                    <CardContent className="p-0">
                      <CodeView code={surveyHtml} language="html" />
                    </CardContent>
                  </Card>
                  {/* <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">
                      This multi-page HTML survey includes API integration,
                      progress tracking, and keyboard navigation.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Download the HTML file
                        const blob = new Blob([surveyHtml], {
                          type: "text/html",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${surveyCategoryId
                          .toLowerCase()
                          .replace(/\s+/g, "-")}_survey.html`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Download HTML File
                    </Button>
                  </div> */}
                </TabsContent>
              </Tabs>

              <div className="flex justify-between pt-8 border-t border-slate-200 mt-8">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handlePublishSurvey}
                  size="lg"
                  disabled={publishLoading}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {publishLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      Publish Survey
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 6: Share Survey */}
          {step === 6 && (
            <div className="p-8">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                  🎉 Survey Published Successfully!
                </h2>
                <p className="text-slate-500">
                  Your survey is now live and ready to collect responses
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-6">
                {/* Survey Details */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800">{title}</h3>
                      <p className="text-sm text-green-600">
                        {questions.length} questions • Published just now
                      </p>
                    </div>
                  </div>
                </div>

                {/* Public Link Generation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      Share Your Survey
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!publicLink ? (
                      <div className="text-center py-6">
                        <Button
                          onClick={generatePublicLink}
                          size="lg"
                          className="bg-violet-600 hover:bg-violet-700"
                        >
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Generate Public Link
                        </Button>
                        <p className="text-sm text-slate-500 mt-2">
                          Create a shareable link that anyone can use to access
                          your survey
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">
                            Public Survey Link
                          </Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              value={publicLink}
                              readOnly
                              className="flex-1 bg-slate-50"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(publicLink);
                                // You could add a toast notification here
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {shareCode && (
                          <div>
                            <Label className="text-sm font-medium">
                              Share Code
                            </Label>
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                value={shareCode}
                                readOnly
                                className="flex-1 bg-slate-50 font-mono"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(shareCode);
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Users can enter this code at your survey portal
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => window.open(publicLink, "_blank")}
                            className="flex-1"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Preview Survey
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const subject = encodeURIComponent(
                                `Survey: ${title}`
                              );
                              const body = encodeURIComponent(
                                `Hi,\n\nI'd like to invite you to participate in my survey: "${title}"\n\nPlease click the link below to get started:\n${publicLink}\n\nThank you!`
                              );
                              window.open(
                                `mailto:?subject=${subject}&body=${body}`
                              );
                            }}
                            className="flex-1"
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Share via Email
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Next Steps */}
                <Card>
                  <CardHeader>
                    <CardTitle>What's Next?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" asChild>
                        <Link href="/">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Dashboard
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/survey-results/${createdSurvey?.id}`}>
                          <FileText className="mr-2 h-4 w-4" />
                          View Responses
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
