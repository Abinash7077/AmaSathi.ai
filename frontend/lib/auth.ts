// FILE: frontend/lib/auth.ts
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------
export function saveToken(token: string) {
  localStorage.setItem("amasathi_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("amasathi_token");
}

export function removeToken() {
  localStorage.removeItem("amasathi_token");
  localStorage.removeItem("amasathi_user");
}

export function saveUser(user: any) {
  localStorage.setItem("amasathi_user", JSON.stringify(user));
}

export function getUser(): any | null {
  const u = localStorage.getItem("amasathi_user");
  return u ? JSON.parse(u) : null;
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
export async function apiPost(path: string, body: object | FormData) {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: isForm ? authHeader() : { ...authHeader(), "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, { headers: authHeader() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export async function apiPut(path: string, body: object) {
  const res = await fetch(`${API}${path}`, {
    method: "PUT",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export async function apiPatch(path: string, body: object) {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------
export async function signUp(name: string, email: string, password: string) {
  const data = await apiPost("/api/auth/signup", { name, email, password });
  saveToken(data.token);
  saveUser(data.user);
  return data.user;
}

export async function signIn(email: string, password: string) {
  debugger
  const data = await apiPost("/api/auth/signin", { email, password });
  saveToken(data.token);
  saveUser(data.user);
  return data.user;
}

export async function fetchMe() {
  const data = await apiGet("/api/auth/me");
  saveUser(data);
  return data;
}

export function signOut() {
  removeToken();
}

export function googleLoginUrl(): string {
  return `${API}/api/auth/google`;
}