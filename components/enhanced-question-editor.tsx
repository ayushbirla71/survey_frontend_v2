"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  Plus,
  GripVertical,
  Copy,
  MoreVertical,
  Image,
  Video,
  Mic,
  FileText,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApi } from "@/hooks/useApi";
import { apiWithFallback, categoriesApi, demoData } from "@/lib/api";

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  required: boolean;
  description?: string;
  placeholder?: string;
  categoryId?: string;
  order_index?: number;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface QuestionEditorProps {
  questions: Question[];
  onQuestionsUpdate: (questions: Question[]) => void;
}

// Only support the 4 question types allowed by backend
const questionTypes = [
  { value: "TEXT", label: "Text Input", icon: FileText },
  { value: "IMAGE", label: "Image Upload", icon: Image },
  { value: "VIDEO", label: "Video Upload", icon: Video },
  { value: "AUDIO", label: "Audio Upload", icon: Mic },
];

export default function EnhancedQuestionEditor({
  questions,
  onQuestionsUpdate,
}: QuestionEditorProps) {
  const [focusedQuestion, setFocusedQuestion] = useState<string | null>(null);

  // API calls
  const {
    data: questionCategories,
    loading: questionCategoriesLoading,
    error: questionCategoriesError,
  } = useApi(() =>
    apiWithFallback(
      () => categoriesApi.getQuestionCategories(),
      demoData.question_categories
    )
  );

  const categories = questionCategories || demoData.question_categories;
  // console.log("categories is", categories);

  const questionCategoryOptions = categories?.map((cat: any) => ({
    value: cat.id,
    label: cat.type_name,
  }));
  // console.log("questionCategoryOptions is", questionCategoryOptions);

  const handleQuestionChange = (id: string, field: string, value: any) => {
    const updatedQuestions = questions.map((q) => {
      if (q.id === id) {
        return { ...q, [field]: value };
      }
      return q;
    });
    onQuestionsUpdate(updatedQuestions);
  };

  // Option handling functions removed since we only support TEXT, IMAGE, VIDEO, AUDIO

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q${Date.now()}`,
      type: "short answer",
      question: "Untitled Question",
      options: [],
      required: false,
      order_index: questions.length,
    };
    const updatedQuestions = [...questions, newQuestion];
    onQuestionsUpdate(updatedQuestions);
    setFocusedQuestion(newQuestion.id);
  };

  const duplicateQuestion = (questionId: string) => {
    const questionToDuplicate = questions.find((q) => q.id === questionId);
    if (questionToDuplicate) {
      const newQuestion: Question = {
        ...questionToDuplicate,
        id: `q${Date.now()}`,
        question: `${questionToDuplicate.question} (Copy)`,
        order_index: questions.length,
      };
      const updatedQuestions = [...questions, newQuestion];
      onQuestionsUpdate(updatedQuestions);
    }
  };

  const removeQuestion = (id: string) => {
    const updatedQuestions = questions.filter((q) => q.id !== id);
    onQuestionsUpdate(updatedQuestions);
    if (focusedQuestion === id) {
      setFocusedQuestion(null);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order_index for all questions
    const updatedQuestions = items.map((question, index) => ({
      ...question,
      order_index: index,
    }));

    onQuestionsUpdate(updatedQuestions);
  };

  // needsOptions function removed since we only support TEXT, IMAGE, VIDEO, AUDIO

  // const getQuestionTypeIcon = (type: string) => {
  //   const questionType = questionTypes.find((qt) => qt.value === type);
  //   return questionType ? questionType.icon : FileText;
  // };

  return (
    <div className="space-y-6">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="questions">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {questions.map((question, index) => (
                <Draggable
                  key={question.id}
                  draggableId={question.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`transition-all duration-200 ${
                        snapshot.isDragging ? "rotate-2 scale-105" : ""
                      }`}
                    >
                      <QuestionCard
                        question={question}
                        index={index}
                        isFocused={focusedQuestion === question.id}
                        onFocus={() => setFocusedQuestion(question.id)}
                        onQuestionChange={handleQuestionChange}
                        onDuplicate={duplicateQuestion}
                        onRemove={removeQuestion}
                        dragHandleProps={provided.dragHandleProps}
                        questionTypes={questionTypes}
                        questionCategories={questionCategoryOptions}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Question Button */}
      <div className="flex justify-center">
        <Button
          onClick={addQuestion}
          variant="outline"
          className="border-dashed border-2 hover:border-violet-300 hover:bg-violet-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>
    </div>
  );
}

// Question Card Component
function QuestionCard({
  question,
  index,
  isFocused,
  onFocus,
  onQuestionChange,
  onDuplicate,
  onRemove,
  dragHandleProps,
  questionTypes,
  questionCategories,
}: any) {
  // const IconComponent = getQuestionTypeIcon(question.type);
  // Helper function to get category name from ID
  const getCategoryName = (categoryId: string) => {
    console.log(">>> the value of the QUESTION is : ", question);
    const category = questionCategories?.find(
      (cat: any) => cat.id === categoryId
    );
    return category ? category.type_name : categoryId;
  };

  return (
    <Card
      className={`transition-all duration-200 ${
        isFocused ? "ring-2 ring-violet-500 shadow-lg" : "hover:shadow-md"
      }`}
      onClick={onFocus}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              {...dragHandleProps}
              className="cursor-grab hover:cursor-grabbing"
            >
              <GripVertical className="h-5 w-5 text-slate-400" />
            </div>
            <span className="text-sm font-medium text-slate-500">
              {index + 1}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDuplicate(question.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onRemove(question.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question Text */}
        <div className="space-y-2">
          <Input
            value={question.question}
            onChange={(e) =>
              onQuestionChange(question.id, "question", e.target.value)
            }
            placeholder="Question"
            className="text-lg font-medium border-0 border-b-2 border-slate-200 rounded-none px-0 focus:border-violet-500"
          />

          {/* Question Description */}
          <Input
            value={question.description || ""}
            onChange={(e) =>
              onQuestionChange(question.id, "description", e.target.value)
            }
            placeholder="Description (optional)"
            className="text-sm text-slate-600 border-0 px-0"
          />
        </div>

        {/* Question Type Selector */}
        <div className="flex items-center gap-4">
          <Select
            value={question.type}
            onValueChange={(value) => {
              onQuestionChange(question.id, "type", value);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {questionTypes.find((qt: any) => qt.value === question.type)
                    ?.label || question.type}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {questionTypes.map((type: any) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Question Category Selector */}
          <Select
            value={question.categoryId || ""}
            onValueChange={(value) => {
              onQuestionChange(question.id, "categoryId", value);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select category">
                <div className="flex items-center gap-2">
                  {getCategoryName(question.categoryId) || "Select category"}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {questionCategories?.map((category: any) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    {category.type_name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              checked={question.required}
              onCheckedChange={(checked) =>
                onQuestionChange(question.id, "required", checked)
              }
            />
            <Label className="text-sm">Required</Label>
          </div>
        </div>

        {/* No options needed for our supported question types */}

        {/* Placeholder for text inputs */}
        {["short answer", "paragraph"].includes(
          getCategoryName(question.categoryId)
        ) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Placeholder Text</Label>
            <Input
              value={question.placeholder || ""}
              onChange={(e) =>
                onQuestionChange(question.id, "placeholder", e.target.value)
              }
              placeholder="Enter placeholder text..."
              className="text-sm"
            />
          </div>
        )}

        {/* No additional settings needed for our supported question types */}
      </CardContent>
    </Card>
  );
}

// Options Editor Component - Removed since we only support TEXT, IMAGE, VIDEO, AUDIO

// Rating Settings Component - Removed since we only support TEXT, IMAGE, VIDEO, AUDIO
