import { jwtVerify } from "jose";
import { getAuthCookie } from "./cookies";
import { authTenant } from "./authTenant";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function getAuthUser() {
  const token = await getAuthCookie();
  if (!token) {
    throw new Error("No autorizado: falta el token");
  }
  const { payload } = await jwtVerify(token, secret);

  authTenant(payload.tenant_id as string);

  return payload;
}
