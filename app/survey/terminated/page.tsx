"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, XCircle, Clock, Users } from "lucide-react";
import { Suspense } from "react";

type TerminationReason = "not_qualified" | "quota_full" | "survey_closed" | "generic";

function TerminatedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const reason = (searchParams.get("reason") as TerminationReason) || "generic";
  const message = searchParams.get("message");
  const redirectUrl = searchParams.get("redirect");

  const getReasonContent = () => {
    switch (reason) {
      case "not_qualified":
        return {
          icon: <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />,
          title: "Thank You for Your Interest",
          description: message || "Unfortunately, you don't qualify for this survey based on the screening criteria. We appreciate your time and interest.",
          color: "amber",
        };
      case "quota_full":
        return {
          icon: <Users className="h-16 w-16 text-blue-500 mx-auto mb-4" />,
          title: "Survey Quota Reached",
          description: message || "We've already received enough responses for your demographic group. Thank you for your interest in participating.",
          color: "blue",
        };
      case "survey_closed":
        return {
          icon: <Clock className="h-16 w-16 text-slate-500 mx-auto mb-4" />,
          title: "Survey Closed",
          description: message || "This survey is no longer accepting responses. Thank you for your interest.",
          color: "slate",
        };
      default:
        return {
          icon: <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />,
          title: "Unable to Continue",
          description: message || "We're sorry, but you cannot continue with this survey at this time.",
          color: "red",
        };
    }
  };

  const content = getReasonContent();

  const handleClose = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8">
          <div className="text-center">
            {content.icon}
            <h2 className="text-2xl font-semibold text-slate-800 mb-3">
              {content.title}
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {content.description}
            </p>
            <Button 
              onClick={handleClose}
              className="min-w-[120px]"
            >
              {redirectUrl ? "Continue" : "Close"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TerminatedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <TerminatedContent />
    </Suspense>
  );
}

