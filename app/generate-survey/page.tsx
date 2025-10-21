"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import SurveyPreview from "@/components/survey-preview";
import QuestionEditor from "@/components/question-editor";
import AudienceSelector from "@/components/audience-selector";
import Link from "next/link";
import CodeView from "@/components/code-view";
import { generateSurveyHtml } from "@/lib/survey-generator";
import {
  categoriesApi,
  surveyApi,
  questionApi,
  questionGenerationApi,
  apiWithFallback,
  demoData,
} from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";

export default function GenerateSurvey() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [surveyCategoryId, setSurveyCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [autoGenerateQuestions, setAutoGenerateQuestions] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
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

  // API calls
  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useApi(() =>
    apiWithFallback(() => categoriesApi.getCategories(), demoData.categories)
  );

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
    loading: createLoading,
    error: createError,
  } = useMutation(surveyApi.createSurvey);

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

  const prevStep = () => setStep(step - 1);

  const handleQuestionUpdate = (updatedQuestions: any) => {
    setQuestions(updatedQuestions);
  };

  const handleAudienceUpdate = (updatedAudience: any) => {
    setAudience(updatedAudience);
  };

  const createQuestionsForSurvey = async (surveyId: string) => {
    try {
      const questionPromises = questions.map(async (q: any, index: number) => {
        const questionData = {
          surveyId,
          question_type: mapQuestionType(q.type),
          question_text: q.question,
          options: q.options || [],
          categoryId: "default-category", // Will be updated when categories API is available
          subCategoryId: "default-subcategory",
          order_index: index,
          required: q.required || false,
        };

        return await questionApi.createQuestion(questionData);
      });

      const results = await Promise.all(questionPromises);
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

  // Map old question types to new API types
  const mapQuestionType = (oldType: string) => {
    const typeMap: Record<string, string> = {
      single_choice: "MCQ",
      checkbox: "MCQ",
      text: "TEXT",
      rating: "RATING",
      yes_no: "MCQ",
    };
    return typeMap[oldType] || "TEXT";
  };

  const handlePublishSurvey = async () => {
    try {
      // Step 1: Create the survey with new API structure
      const surveyData = {
        title: `${getCategoryName(surveyCategoryId)} Survey - (${title})`,
        description: description,
        flow_type: surveySettings.flow_type,
        survey_send_by: surveySettings.survey_send_by,
        settings: {
          isAnonymous: surveySettings.isAnonymous,
          showProgressBar: surveySettings.showProgressBar,
          shuffleQuestions: surveySettings.shuffleQuestions,
          allowMultipleSubmissions: surveySettings.allowMultipleSubmissions,
        },
        status: "PUBLISHED" as const,
        scheduled_type: "IMMEDIATE" as const,
        surveyCategoryId,
        autoGenerateQuestions,
      };

      const result = await createSurvey(surveyData);

      if (result && result.id) {
        setCreatedSurvey(result);

        // Step 2: Create questions for the survey
        if (questions.length > 0) {
          await createQuestionsForSurvey(result.id);
        }

        // Step 3: Generate HTML for preview
        const html = generateSurveyHtml({
          id: result.id,
          title: `${getCategoryName(surveyCategoryId)} Survey - (${title})`,
          description: description,
          questions,
        });
        setSurveyHtml(html);

        // Store survey data for later use
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
          JSON.stringify({ ...surveyData, id: result.id })
        );

        // Navigate to thank you page
        window.location.href = "/thank-you";
      } else {
        // API failed, fall back to localStorage method
        handleLocalSurveyCreation({
          title: `${getCategoryName(surveyCategoryId)} Survey - (${title})`,
          description: description,
          category: surveyCategoryId,
          questions: questions,
          audience: audience,
        });
      }
    } catch (error) {
      console.error("Failed to create survey via API:", error);
      // Fall back to localStorage method
      // handleLocalSurveyCreation(surveyData);
    }
  };

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

    // Navigate to thank you page
    window.location.href = "/thank-you";
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

    const result = await createSurvey(surveyData);
    console.log("result is", result);
    if (result && result?.survey && result?.survey?.id) nextStep();
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
                Generate Survey
              </h1>
              <p className="text-slate-500 mt-1">
                Create and customize your survey with AI-powered questions
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
                  Target Audience
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
                  Preview & Publish
                </span>
              </div>
            </div>
          </div>
        </div>

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

              <QuestionEditor
                questions={questions}
                onQuestionsUpdate={handleQuestionUpdate}
              />

              <div className="flex justify-between pt-8 border-t border-slate-200 mt-8">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={nextStep}>
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
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="BOTH">Both</SelectItem>
                        <SelectItem value="NONE">None (Link Only)</SelectItem>
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
                  Continue to Audience
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
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="preview"
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview Survey
                  </TabsTrigger>
                  <TabsTrigger value="code" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    HTML Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-4">
                  <SurveyPreview
                    title={`${getCategoryName(
                      surveyCategoryId
                    )} Survey - (${title})`}
                    description={description}
                    questions={questions}
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
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      Publish Survey to {audience.targetCount.toLocaleString()}{" "}
                      People
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
