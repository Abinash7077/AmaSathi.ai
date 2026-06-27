"use client";

import ReactMarkdown from "react-markdown";

export default function ResultView({ content }: { content: string }) {
  return (
    <div className="prose-amasathi bg-white border rounded-xl p-5 mt-4 max-h-[600px] overflow-y-auto">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
