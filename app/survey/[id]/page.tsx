"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { questionApi, responseApi } from "@/lib/api";
import { toast } from "react-toastify";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any[];
  required: boolean;
  order_index: number;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  settings?: {
    showProgressBar?: boolean;
    shuffleQuestions?: boolean;
    isAnonymous?: boolean;
  };
}

export default function PublicSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    loadSurvey();
  }, [surveyId]);

  const loadSurvey = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch survey details
      const surveyResponse = await fetch(
        `http://localhost:5000/api/surveys/${surveyId}`
      );

      if (!surveyResponse.ok) {
        throw new Error("Survey not found");
      }

      const surveyData = await surveyResponse.json();

      // Fetch questions for the survey
      const questionsResponse = await questionApi.getQuestionsBySurvey(
        surveyId
      );

      if (questionsResponse.data && Array.isArray(questionsResponse.data)) {
        const sortedQuestions = questionsResponse.data.sort(
          (a, b) => (a.order_index || 0) - (b.order_index || 0)
        );

        setSurvey({
          id: surveyData.survey.id,
          title: surveyData.survey.title,
          description: surveyData.survey.description,
          questions: sortedQuestions,
          settings: surveyData.survey.settings || {},
        });
      } else {
        throw new Error("No questions found for this survey");
      }
    } catch (err: any) {
      console.error("Error loading survey:", err);
      setError(err.message || "Failed to load survey");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    const currentQuestion = survey?.questions[currentQuestionIndex];
    if (
      currentQuestion?.required &&
      !answers[currentQuestion.id]
    ) {
      toast.error("This question is required");
      return;
    }

    if (survey && currentQuestionIndex < survey.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Validate all required questions are answered
    const unansweredRequired = survey.questions.filter(
      (q) => q.required && !answers[q.id]
    );

    if (unansweredRequired.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }

    try {
      setSubmitting(true);

      // Format answers for API
      const formattedAnswers = Object.entries(answers).map(
        ([questionId, answer]) => {
          const question = survey.questions.find((q) => q.id === questionId);
          let answerValue = answer;

          // Handle array answers (checkboxes)
          if (Array.isArray(answer)) {
            answerValue = JSON.stringify(answer);
          }

          return {
            questionId,
            answer_type: question?.question_type || "TEXT",
            answer_value: answerValue,
          };
        }
      );

      const responseData = {
        surveyId: survey.id,
        user_metadata: {},
        answers: formattedAnswers,
      };

      const result = await responseApi.submitResponse(responseData);

      if (result.data) {
        setSubmitted(true);
        toast.success("Survey submitted successfully!");
      } else {
        throw new Error("Failed to submit survey");
      }
    } catch (err: any) {
      console.error("Error submitting survey:", err);
      toast.error(err.message || "Failed to submit survey");
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question: Question) => {
    const answer = answers[question.id];

    // Parse options if they're stored as JSON string
    let options = question.options;
    if (typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch (e) {
        options = [];
      }
    }

    // Handle different question types
    const questionType = question.question_type?.toUpperCase();

    switch (questionType) {
      case "TEXT":
        // Check if options exist to determine if it's MCQ, checkbox, etc.
        if (options && options.length > 0) {
          // Check if it's a checkbox type (multiple selection)
          const isCheckbox = options.some((opt: any) => opt.type === "checkbox");

          if (isCheckbox) {
            // Checkbox - multiple selection
            return (
              <div className="space-y-3">
                {options.map((option: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${question.id}-${idx}`}
                      checked={(answer || []).includes(option.text)}
                      onCheckedChange={(checked) => {
                        const currentAnswers = answer || [];
                        if (checked) {
                          handleAnswerChange(question.id, [
                            ...currentAnswers,
                            option.text,
                          ]);
                        } else {
                          handleAnswerChange(
                            question.id,
                            currentAnswers.filter((a: string) => a !== option.text)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={`${question.id}-${idx}`}>
                      {option.text}
                    </Label>
                  </div>
                ))}
              </div>
            );
          } else {
            // Radio - single selection (MCQ)
            return (
              <RadioGroup
                value={answer || ""}
                onValueChange={(value) => handleAnswerChange(question.id, value)}
              >
                {options.map((option: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={option.text}
                      id={`${question.id}-${idx}`}
                    />
                    <Label htmlFor={`${question.id}-${idx}`}>
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            );
          }
        } else {
          // Short text input
          return (
            <Input
              value={answer || ""}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Your answer"
              className="max-w-md"
            />
          );
        }

      case "IMAGE":
      case "VIDEO":
      case "AUDIO":
        // For media types, show as text input for now
        return (
          <Textarea
            value={answer || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Your answer"
            className="max-w-md"
            rows={4}
          />
        );

      default:
        return (
          <Input
            value={answer || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Your answer"
            className="max-w-md"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Survey Not Found
              </h2>
              <p className="text-slate-600 mb-4">
                {error || "The survey you're looking for doesn't exist or has been removed."}
              </p>
              <Button onClick={() => router.push("/")}>Go to Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                Thank You!
              </h2>
              <p className="text-slate-600 mb-6">
                Your response has been submitted successfully. We appreciate you
                taking the time to complete this survey.
              </p>
              <Button onClick={() => router.push("/")}>Close</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = survey.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / survey.questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Survey Header */}
        <Card className="mb-6">
          <CardHeader className="border-b border-slate-200 bg-violet-50">
            <CardTitle className="text-2xl text-violet-900">
              {survey.title}
            </CardTitle>
            {survey.description && (
              <p className="text-slate-600 mt-2">{survey.description}</p>
            )}
          </CardHeader>
        </Card>

        {/* Progress Bar */}
        {survey.settings?.showProgressBar !== false && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>
                Question {currentQuestionIndex + 1} of {survey.questions.length}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {currentQuestion.question_text}
              {currentQuestion.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderQuestionInput(currentQuestion)}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0 || submitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={submitting}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : currentQuestionIndex === survey.questions.length - 1 ? (
                  <>
                    Submit
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

