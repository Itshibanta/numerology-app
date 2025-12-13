// web/src/api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("auth_token");

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  // Ajoute Content-Type si body JSON
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Ajoute Bearer token si dispo
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    window.location.href = "/signin";
    throw new Error("Session expirée. Reconnecte-toi.");
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Erreur serveur (${res.status})`);
  }
  
  // Certaines routes peuvent renvoyer du texte brut
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export type ThemeFormData = {
  prenom: string;
  secondPrenom: string;
  nomFamille: string;
  nomMarital: string;
  dateNaissance: string;
  lieuNaissance: string;
  heureNaissance: string;
};

export async function generateTheme(formData: ThemeFormData): Promise<string> {
  const data = await request<{
    success: boolean;
    summary?: string;
    theme?: string;
    error?: string;
  }>("/generate-theme", {
    method: "POST",
    body: JSON.stringify(formData),
  });

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

export async function registerUser(payload: RegisterPayload) {
  return request<{ msg: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: LoginPayload) {
  return request<{
    msg: string;
    token: string;
    user: { firstName: string; lastName: string; email: string; plan: string };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type MeResponse = {
  success: true;
  user: { firstName: string; lastName: string; email: string; plan: string };
  history: { date: string; type: "summary" | "theme"; label: string }[];
};

export async function getMe(): Promise<MeResponse> {
  return request<MeResponse>("/me");
}

// petit helper optionnel
export function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
}
