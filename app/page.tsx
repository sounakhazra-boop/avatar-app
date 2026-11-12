"use client";

import { useState } from "react";
import HeyGenVideo from "@/components/HeyGenVideo";
import { useHeyGenAvatar } from "@/hook/useHeyGenAvatar";

export default function AvatarPOC() {
  // Pass manualReply: true so voice transcriptions automatically trigger session.message()
  const {
    videoRef,
    isReady,
    isLoading,
    isMuted,
    lines,
    startSession,
    stopSession,
    sendText,
    toggleMic,
  } = useHeyGenAvatar({ manualReply: true });

  const [text, setText] = useState("");

  const handleSend = () => {
    if (text.trim()) {
      sendText(text);
      setText("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 font-sans">
      <div className="w-full max-w-3xl flex flex-col gap-4">

        <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
          <h1 className="text-white font-semibold">HeyGen Avatar POC</h1>
          {!isReady ? (
            <button
              onClick={() => startSession()}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Connecting..." : "Start Session"}
            </button>
          ) : (
            <button
              onClick={stopSession}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              End Session
            </button>
          )}
        </div>

        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-gray-700 shadow-lg">
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              {isLoading ? "Initializing WebRTC stream..." : "Click Start Session to boot avatar"}
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${!isReady ? "hidden" : "block"}`}
          />
        </div>

        <button
          onClick={toggleMic}
          disabled={!isReady}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 hover:bg-gray-700 disabled:opacity-50"
        >
          {isMuted ? "🎤 Unmute" : "🔇 Mute"}
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message for the avatar..."
            disabled={!isReady}
            className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!isReady || !text.trim()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            Send
          </button>
        </div>

        {lines.length > 0 && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 max-h-48 overflow-y-auto flex flex-col gap-2 text-sm">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className={line.who === "you" ? "text-blue-400" : "text-green-400"}
              >
                <span className="font-bold uppercase">{line.who}: </span>
                <span className="text-gray-200">{line.text}</span>
              </div>
            ))}
          </div>
        )}

      </div>
      {/* <HeyGenVideo /> */}
    </div>
  );
}