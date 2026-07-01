import { apiRequest } from "../apiClient";
import { adaptUser, knownUsersCache } from "../adapter";
import type { User } from "@/types";

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await apiRequest<any>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const rawUser = res.data?.user;
  if (!rawUser) throw new Error("Invalid login response");
  const user = adaptUser(rawUser);
  knownUsersCache.set(user.id, user);
  return { user, token: "" };
}

export async function register(payload: { name: string; email: string; password: string }): Promise<{ user: User; token: string }> {
  const nameParts = (payload.name || "").split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || firstName;
  const dateOfBirth = new Date(2000, 0, 1).toISOString().split("T")[0];
  await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
    }),
  });
  return login(payload.email, payload.password);
}

export async function forgotPassword(_email: string): Promise<{ ok: boolean }> {
  return { ok: true };
}

export async function me(): Promise<User> {
  const raw = await apiRequest<any>("/api/auth/me");
  const user = adaptUser(raw);
  knownUsersCache.set(user.id, user);
  return user;
}

export async function logout(): Promise<void> {
  await apiRequest("/api/auth/logout", { method: "POST" });
}
