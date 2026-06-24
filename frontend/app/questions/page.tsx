"use client";

import { useState } from "react";
import FileDropzone from "@/components/FileDropzone";
import ResultView from "@/components/ResultView";
import { callQuestions } from "@/lib/api";

export default function QuestionsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const text = await callQuestions(file, difficulty);
      setResult(text);
    } catch (e: any) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Generate Practice Questions 📝</h2>
      <p className="text-sm text-slate-600 mb-4">
        Upload your topic material and get MCQs, short answers, and a long
        question — exam style — based only on that content.
      </p>

      <FileDropzone onFileSelected={setFile} />

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm text-slate-600">Difficulty:</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard (Exam level)</option>
        </select>
      </div>

      <button
        disabled={!file || loading}
        onClick={handleSubmit}
        className="mt-4 px-5 py-2.5 rounded-lg bg-brand-600 text-white font-medium disabled:opacity-40"
      >
        {loading ? "Generating..." : "Generate Questions"}
      </button>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      {result && <ResultView content={result} />}
    </div>
  );
}
