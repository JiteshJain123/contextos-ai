import type { LoginInput, SignupInput } from "@contextos-ai/validators/auth";

import { api } from "@/lib/api-client";

/**
 * Thin HTTP layer for auth endpoints.
 *
 * Pure functions over the api-client. No state, no hooks. The mutation hooks
 * in ../hooks/ wrap these to add loading state, error mapping, and side
 * effects like router navigation.
 */

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
};

type AuthSuccess = { user: AuthUser };
type MeSuccess = { user: { id: string; role: "USER" | "ADMIN" } };

export const authApi = {
  signup: (input: SignupInput) => api.post<AuthSuccess>("/auth/signup", input),
  login: (input: LoginInput) => api.post<AuthSuccess>("/auth/login", input),
  logout: () => api.post<{ ok: true }>("/auth/logout"),
  refresh: () => api.post<{ ok: true }>("/auth/refresh"),
  me: () => api.get<MeSuccess>("/auth/me"),
};
