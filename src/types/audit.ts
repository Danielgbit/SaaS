export interface AuditLogProps {
  tenant_id: string;
  user_id?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT";
  resource: string; // ej: 'users', 'appointments', 'roles', etc.
  resource_id?: string;
  payload?: {
    email: string;
    role_id: string;
    name: string;
    phone: number;
  };
}
