"use client";
import FacebookLiveEmbed from "@/components/facebook-live-embed";
import { useState } from "react";

export default function FacebookLivePage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [showEmbed, setShowEmbed] = useState(false);

  const handleStartStream = () => {
    if (videoUrl.trim()) {
      setShowEmbed(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
      <div className="w-full bg-white rounded-lg shadow-xl p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-900">
          Facebook Live Stream
        </h1>

        <div className="space-y-4">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste Facebook Live video URL here (e.g., https://www.facebook.com/page/videos/1234567890/)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />

          <button
            onClick={handleStartStream}
            disabled={!videoUrl.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Start Streaming
          </button>
        </div>

        {showEmbed && videoUrl && (
          <div className="pt-6 border-t w-full">
            <FacebookLiveEmbed videoUrl={videoUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
