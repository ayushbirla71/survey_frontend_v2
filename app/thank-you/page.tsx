"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  Download,
  ArrowRight,
  Share,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";

export default function ThankYou() {
  const [surveyTitle, setSurveyTitle] = useState("");
  const [audienceCount, setAudienceCount] = useState(0);
  const [surveyHtml, setSurveyHtml] = useState("");
  const [surveyData, setSurveyData] = useState(null);

  useEffect(() => {
    // Get the survey details from localStorage
    const title = localStorage.getItem("lastSurveyTitle") || "survey";
    const audience = localStorage.getItem("lastSurveyAudience") || "500";
    const html = localStorage.getItem("lastSurveyHtml") || "";
    const data = localStorage.getItem("lastSurveyData");

    setSurveyTitle(title);
    setAudienceCount(Number.parseInt(audience, 10));
    setSurveyHtml(html);

    if (data) {
      setSurveyData(JSON.parse(data));
    }
  }, []);

  const downloadSurveyHtml = () => {
    if (!surveyHtml) return;

    const blob = new Blob([surveyHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${surveyTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareSurvey = () => {
    // const surveyUrl = `${window.location.origin}/survey/preview`
    const surveyUrl = localStorage.getItem("surveyUrl");

    if (navigator.share) {
      navigator.share({
        title: surveyData?.title || "Survey",
        text: `Check out this survey: ${surveyData?.title || "Survey"}`,
        url: surveyUrl,
      });
    } else {
      navigator.clipboard.writeText(surveyUrl);
      toast.success("Survey link copied to clipboard!");
    }
  };

  const viewSurveyPreview = () => {
    // Open the HTML file in a new tab
    if (surveyHtml) {
      const blob = new Blob([surveyHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="h-20 w-20 text-green-500" />
        </div>
        <h1 className="mb-3 text-3xl font-bold text-slate-800">
          Survey Sent Successfully!
        </h1>
        <p className="mb-8 text-slate-600">
          Your survey has been sent to {audienceCount.toLocaleString()}{" "}
          respondents. You'll receive notifications as responses come in.
        </p>

        <Card className="mb-8 bg-violet-50 border-violet-200">
          <CardContent className="p-6 text-left">
            <h2 className="text-lg font-semibold text-violet-900 mb-2">
              Survey Actions
            </h2>
            <p className="text-violet-700 mb-4">
              Your survey is now live and ready to collect responses. Use the
              actions below to manage your survey.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                onClick={downloadSurveyHtml}
                className="bg-white justify-start"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Survey HTML
              </Button>
              <Button
                variant="outline"
                onClick={viewSurveyPreview}
                className="bg-white justify-start"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview Survey
              </Button>
              <Button
                variant="outline"
                onClick={shareSurvey}
                className="bg-white justify-start"
              >
                <Share className="mr-2 h-4 w-4" />
                Share Survey Link
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button className="w-full" asChild>
            <Link href="/">
              Return to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" className="w-full bg-white" asChild>
            <Link href="/sent-surveys">View All Surveys</Link>
          </Button>
          <Button variant="outline" className="w-full bg-white" asChild>
            <Link href="/generate-survey">Create Another Survey</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
