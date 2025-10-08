export interface AuditLogProps {
  tenant_id: string | null  ;
  user_id?: string | null;
  action: "CREATE" | "UPDATE" | "REGISTER" | "DELETE";
  resource: string; // ej: 'users', 'appointments', 'roles', etc.
  resource_id?: string;
  payload?: {
    [key: string]: any;
  };
}
