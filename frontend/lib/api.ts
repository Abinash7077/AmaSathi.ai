const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function callTranslate(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/translate`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.result;
}

export async function callQuestions(file: File, difficulty: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("difficulty", difficulty);
  const res = await fetch(`${API_BASE}/api/questions`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.result;
}

export async function callVideoSummary(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/video-summary`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.result;
}

export type ChatTurn = { role: "user" | "model"; text: string };

export async function callChat(
  message: string,
  history: ChatTurn[],
  file?: File | null
): Promise<string> {
  const form = new FormData();
  form.append("message", message);
  form.append("history", JSON.stringify(history));
  if (file) form.append("file", file);
  const res = await fetch(`${API_BASE}/api/chat`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.result;
}
