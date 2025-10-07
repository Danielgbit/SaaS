export interface AuthUserProps {
  sub: string;
  email: string;
  tenant_id: string;
  role_id: string;
  iat: number;
  exp: number;
}

export interface LoginResponseProps {
  sub: string;
  email: string;
  tenant_id: string;
  role_id: string;
}

export type ExistingUserProps = {
  password_hash: string;
  id: string;
  email: string;
  tenant_id: string;
  role_id: string;
};    

export type RoleCodeProps = "admin" | "employee" | "client";
