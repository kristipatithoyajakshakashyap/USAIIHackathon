import { BASE_URL } from "./prevail";

export type Role = "admin" | "operator" | "viewer";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  username: string;
}

export interface CurrentUser {
  username: string;
  role: Role;
  permissions: string[];
}

const TOKEN_KEY = "prevail_token";

export function saveToken(token: string): void {
  if (typeof window === "undefined") return;
  document.cookie = `prevail_token=${token}; path=/; max-age=3600`;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  document.cookie = "prevail_token=; path=/; max-age=0";
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return getToken() !== null;
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    throw new Error("Invalid username or password");
  }
  const data = (await response.json()) as LoginResponse;
  saveToken(data.access_token);
  return data;
}

export function logout(): void {
  removeToken();
  window.location.href = "/login";
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
