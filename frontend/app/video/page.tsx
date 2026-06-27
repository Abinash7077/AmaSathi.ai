"use client";

import { useState } from "react";
import FileDropzone from "@/components/FileDropzone";
import ResultView from "@/components/ResultView";
//import { callVideoSummary } from "@/lib/api";

export default function VideoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      //const text = await callVideoSummary(file);
      //setResult(text);
    } catch (e: any) {
      setError("Something went wrong. Try a shorter video or check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Video Lecture Summary 🎬</h2>
      <p className="text-sm text-slate-600 mb-4">
        Upload a recorded lecture or topic video. Get a timestamped, bilingual
        (English + Odia) breakdown of every topic covered.
      </p>

      <FileDropzone onFileSelected={setFile} accept="video/*" label="Upload a lecture video" />

      <button
        disabled={!file || loading}
        onClick={handleSubmit}
        className="mt-4 px-5 py-2.5 rounded-lg bg-brand-600 text-white font-medium disabled:opacity-40"
      >
        {loading ? "Processing video (this can take a minute)..." : "Summarize Video"}
      </button>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      {result && <ResultView content={result} />}
    </div>
  );
}
