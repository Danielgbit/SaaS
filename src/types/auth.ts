export interface JWTPayload {
  sub: string;        // userId
  email: string;
  tenant_id: string;
  role_id?: string;
}