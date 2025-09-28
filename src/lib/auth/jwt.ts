import { JWTPayload as JWTProps } from "@/types/auth";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// En lugar de "7d", pasar 7 * 24 * 60 * 60 (604800 segundos)
export function signToken(payload: JWTProps, expiresIn: number = 604800) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken<T = JWTProps>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch {
    return null; // token inválido o expirado
  }
}
