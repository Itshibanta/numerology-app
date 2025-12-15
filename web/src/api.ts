// web/src/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  code?: string;
  meta?: any;

  constructor(message: string, code?: string, meta?: any) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.meta = meta;
  }
}

async function parseApiError(res: Response): Promise<ApiError> {
  const text = await res.text();

  try {
    const json = JSON.parse(text);
    const message =
      json?.message || json?.msg || json?.error || `Erreur serveur (${res.status})`;
    const code = json?.error; // ex: QUOTA_EXCEEDED / AUTH_REQUIRED
    const meta = json?.meta;
    return new ApiError(message, code, meta);
  } catch {
    return new ApiError(text || `Erreur serveur (${res.status})`);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("auth_token");

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // 401 => logout
  if (res.status === 401) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    window.location.href = "/signin";
    throw new ApiError("Session expirée. Reconnecte-toi.", "UNAUTHORIZED");
  }

  if (!res.ok) {
    throw await parseApiError(res);
  }

  // Certaines routes peuvent renvoyer texte brut
  const text = await res.text();
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
  const data = await request<any>("/generate-theme", {
    method: "POST",
    body: JSON.stringify(formData),
  });

  if (!data?.success) {
    throw new ApiError(data?.message || "Impossible de générer.", data?.error, data?.meta);
  }

  return (data.summary || data.theme) as string;
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

export function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
  window.location.href = "/signin";
}

export type Plan = {
  plan_key: string;
  display_name: string;
  price_cents: number;
  currency: string;
  monthly_limit: number;
};

export async function fetchPlans(): Promise<Plan[]> {
  const data = await request<{ success: boolean; plans: Plan[] }>("/plans");
  if (!data?.success) throw new ApiError("Impossible de charger les plans", "PLANS_FAILED");
  return data.plans || [];
}

export async function createCheckoutSession(plan_key: string): Promise<string> {
  const data = await request<{ success: boolean; url: string }>("/stripe/create-checkout-session", {
    method: "POST",
    body: JSON.stringify({ plan_key }),
  });

  if (!data?.success || !data?.url) {
    throw new ApiError("Impossible de démarrer le paiement", "CHECKOUT_FAILED");
  }

  return data.url;
}