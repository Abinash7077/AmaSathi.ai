"use client";

import { useState } from "react";
import FileDropzone from "@/components/FileDropzone";
import ResultView from "@/components/ResultView";
import { callTranslate } from "@/lib/api";

export default function TranslatePage() {
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
      const text = await callTranslate(file);
      setResult(text);
    } catch (e: any) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Translate to Odia 🌐</h2>
      <p className="text-sm text-slate-600 mb-4">
        Capture or upload a textbook page, notes, or diagram. We&apos;ll translate it
        line by line into Odia, keeping medical/technical terms clear.
      </p>

      <FileDropzone onFileSelected={setFile} />

      <button
        disabled={!file || loading}
        onClick={handleSubmit}
        className="mt-4 px-5 py-2.5 rounded-lg bg-brand-600 text-white font-medium disabled:opacity-40"
      >
        {loading ? "Translating..." : "Translate to Odia"}
      </button>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      {result && <ResultView content={result} />}
    </div>
  );
}
