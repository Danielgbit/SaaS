// src/lib/auth/jwt.ts
import { AuthUserProps, LoginResponseProps } from "@/types/auth";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

//Created Token with expiration of 7 days
// En lugar de "7d", pasar 7 * 24 * 60 * 60 (604800 segundos)
export function signToken(payload: LoginResponseProps, expiresIn: number = 604800) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// Verify Token and return the payload or null if invalid
export function verifyToken<T = AuthUserProps>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch {
    return null; // token inválido o expirado
  }
}
