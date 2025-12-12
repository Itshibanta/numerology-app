// web/src/api.ts

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:3001";

type Json = Record<string, any>;

async function readJsonSafe(res: Response): Promise<Json> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Json;
  } catch {
    return { raw: text };
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    // Ton backend renvoie parfois { msg }, parfois { error }, parfois du texte
    const message =
      (data && (data.error || data.msg || data.message)) ||
      `Erreur serveur (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export type ThemeFormData = {
  prenom: string;
  secondPrenom: string;
  nomFamille: string;
  nomMarital: string;
  dateNaissance: string;
  lieuNaissance: string;
  heureNaissance: string;
  email?: string;
};

export async function generateTheme(formData: ThemeFormData): Promise<string> {
  const data = await request<{ success: boolean; summary?: string; theme?: string; error?: string }>(
    "/generate-theme",
    { method: "POST", body: JSON.stringify(formData) }
  );

  if (!data.success) throw new Error(data.error || "Impossible de générer.");

  return (data.summary || data.theme || "") as string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function registerUser(payload: RegisterPayload) {
  return request<{ msg: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: LoginPayload) {
  return request<{ msg: string; user?: { firstName: string; lastName: string; email: string; plan: string } }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export type MeResponse = {
  success: true;
  user: { firstName: string; lastName: string; email: string; plan: string };
  history: { date: string; type: "summary" | "theme"; label: string }[];
};

export function getMe(email: string): Promise<MeResponse> {
  return request<MeResponse>(`/me?email=${encodeURIComponent(email)}`);
}

export { API_BASE_URL };
