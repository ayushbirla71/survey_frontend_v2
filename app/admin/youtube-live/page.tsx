// app/live-stream/page.tsx (App Router) or pages/live-stream.tsx (Pages Router)
"use client";

import YouTubeLiveEmbed from "@/components/YouTubeLiveEmbed";
import React, { useState } from "react";

export default function LiveStreamPage() {
  const [videoId, setVideoId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const handleStartStream = () => {
    if (videoId.trim()) {
      setIsPlaying(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoId(e.target.value);
    // Reset player if input changes while playing
    if (isPlaying) {
      setIsPlaying(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        YouTube Live Stream Player
      </h1>

      {/* Input Controls */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/50 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-center">
          <div className="flex-1 max-w-md">
            <label
              htmlFor="videoId"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              YouTube Video ID
            </label>
            <input
              id="videoId"
              type="text"
              value={videoId}
              onChange={handleInputChange}
              placeholder="e.g., dQw4w9WgXcQ"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 shadow-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Extract from URL: youtube.com/watch?v=
              <span className="font-mono text-blue-600">VIDEO_ID</span>
            </p>
          </div>

          <button
            onClick={handleStartStream}
            disabled={!videoId.trim()}
            className={`px-8 py-3 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 ${
              videoId.trim()
                ? "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:shadow-xl hover:from-red-600 hover:to-pink-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isPlaying ? "🟢 Streaming" : "▶️ Start Stream"}
          </button>
        </div>
      </div>

      {/* Video Player */}
      {isPlaying && videoId ? (
        <div className="relative">
          <YouTubeLiveEmbed videoId={videoId} />
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setIsPlaying(false)}
              className="bg-black/70 hover:bg-black/90 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 backdrop-blur-sm"
            >
              ⏹️ Stop
            </button>
          </div>
        </div>
      ) : (
        videoId && (
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
            <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Ready to Play
            </h3>
            <p className="text-gray-500">
              Click "Start Stream" to load the video
            </p>
          </div>
        )
      )}
    </div>
  );
}
