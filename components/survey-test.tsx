"use client";

import { shareApi } from "@/lib/api";
import { useEffect, useState } from "react";

interface SurveyData {
  surveyTestUrl: string;
}

interface SurveyTestProps {
  surveyId: string;
}

const SurveyTest = ({ surveyId }: SurveyTestProps) => {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch survey URL on component mount
  useEffect(() => {
    const fetchSurveyUrl = async () => {
      try {
        setLoading(true);
        console.log(">>>>> the value of the SURVEY ID is : ", surveyId);
        const generateTestUrlResponse = await shareApi.testToken(surveyId);
        console.log(
          ">>>>> the value of the Generate TEST URL Response is : ",
          generateTestUrlResponse.data,
        );
        const testUrl =
          generateTestUrlResponse.data?.data || "http://localhost:3000/test";
        console.log(">>>>>> the value of the TEST URL is : ", testUrl);

        setUrl(testUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyUrl();
  }, []);

  // Copy URL to clipboard
  const copyToClipboard = async () => {
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Redirect to survey URL
  const redirectToSurvey = () => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Survey Test URL</h2>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
          <p>Error: {error}</p>
        </div>
      ) : url ? (
        <div className="space-y-4">
          {/* URL Display */}
          <div className="relative">
            <input
              type="text"
              readOnly
              value={url}
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onFocus={(e) => e.target.select()}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
              disabled={!url}
            >
              {copied ? "Copied!" : "Copy URL"}
            </button>
            <button
              onClick={redirectToSurvey}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors font-medium"
              disabled={!url}
            >
              Open Test Survey
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center">No survey URL available</p>
      )}
    </div>
  );
};

export default SurveyTest;
