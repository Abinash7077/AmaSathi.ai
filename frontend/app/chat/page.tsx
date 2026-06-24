"use client";

import { useState } from "react";
import FileDropzone from "@/components/FileDropzone";
import ReactMarkdown from "react-markdown";
import { callChat, ChatTurn } from "@/lib/api";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim() && !file) return;
    const userMsg: ChatTurn = { role: "user", text: input || "(attached a file)" };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    try {
      const reply = await callChat(input || "Please help me with this.", messages, file);
      setMessages([...newHistory, { role: "model", text: reply }]);
      setFile(null);
    } catch (e) {
      setMessages([...newHistory, { role: "model", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[70vh]">
      <h2 className="text-lg font-semibold mb-1">Ask Sahayak 💬</h2>
      <p className="text-sm text-slate-600 mb-3">
        Ask any nursing/physics doubt in English or Odia. You can also attach an
        image, PDF, or video for context.
      </p>

      <div className="flex-1 overflow-y-auto bg-white border rounded-xl p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            e.g. &quot;Explain the stages of labour in simple terms&quot; or
            &quot;ରକ୍ତଚାପ କଣ?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
              m.role === "user"
                ? "bg-brand-600 text-white ml-auto"
                : "bg-slate-100 text-slate-800"
            }`}
          >
            <ReactMarkdown>{m.text}</ReactMarkdown>
          </div>
        ))}
        {loading && <p className="text-sm text-slate-400">Sahayak is thinking...</p>}
      </div>

      {file && (
        <p className="text-xs text-slate-500 mt-2">
          📎 {file.name} attached —{" "}
          <button className="underline" onClick={() => setFile(null)}>
            remove
          </button>
        </p>
      )}

      <div className="mt-3">
        <FileDropzone onFileSelected={setFile} label="Attach a file (optional)" />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your question..."
          className="flex-1 border rounded-lg px-4 py-2.5 text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-brand-600 text-white font-medium disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
