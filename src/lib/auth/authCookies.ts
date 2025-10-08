// src/lib/auth/authCookies.ts
import { cookies } from "next/headers";

const TOKEN_NAME = "token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

// Guarda el token en cookie httpOnly
export async function setAuthCookie(token: string) {
  (await cookies()).set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
}

// Obtiene el token desde la cookie
export async function getAuthCookie(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_NAME)?.value;
}

export async function clearAuthCookie(response: Response) {
  const cookieStore = await cookies();

  response.headers.set(
    "Set-Cookie",
    `${TOKEN_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; ${
      process.env.NODE_ENV === "production" ? "Secure;" : ""
    }`
  );
}