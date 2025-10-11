// AUTO-GENERATED FROM schema.sql — DO NOT EDIT MANUALLY
// This file provides TypeScript types for your Supabase schema

export interface Database {
    public: {
      Tables: {
        appointment_assignments: {
          Row: {
            id: string;
            appointment_id: string;
            employee_id: string | null;
            status: string | null;
            started_at: string | null;
            completed_at: string | null;
          };
        };
        appointment_statuses: {
          Row: {
            id: string;
            tenant_id: string | null;
            code: string;
            label: string;
            is_default: boolean | null;
          };
        };
        appointments: {
          Row: {
            id: string;
            tenant_id: string;
            service_id: string | null;
            client_id: string | null;
            booked_by: string | null;
            scheduled_at: string;
            duration_minutes: number | null;
            status_id: string | null;
            notes: string | null;
            created_at: string | null;
            updated_at: string | null;
            cancelled_at: string | null;
          };
        };
        audit_logs: {
          Row: {
            id: string;
            tenant_id: string | null;
            user_id: string | null;
            action: string;
            resource: string | null;
            resource_id: string | null;
            payload: Record<string, any> | null;
            created_at: string | null;
          };
        };
        clients: {
          Row: {
            id: string;
            tenant_id: string;
            user_id: string | null;
            name: string;
            email: string | null;
            phone: string | null;
            document_id: string | null;
            birth_date: string | null;
            notes: string | null;
            is_active: boolean;
            created_at: string | null;
            updated_at: string | null;
          };
        };
        payment_statuses: {
          Row: {
            id: string;
            tenant_id: string | null;
            code: string;
            label: string;
            is_default: boolean | null;
          };
        };
        payments: {
          Row: {
            id: string;
            tenant_id: string | null;
            appointment_id: string | null;
            amount: number;
            currency: string | null;
            provider: string | null;
            provider_payment_id: string | null;
            status_id: string | null;
            metadata: Record<string, any> | null;
            created_at: string | null;
          };
        };
        reminders: {
          Row: {
            id: string;
            tenant_id: string | null;
            appointment_id: string | null;
            channel: string;
            send_at: string;
            status: string | null;
            payload: Record<string, any> | null;
            created_at: string | null;
          };
        };
        services: {
          Row: {
            id: string;
            tenant_id: string;
            name: string;
            description: string | null;
            price: number;
            duration_minutes: number;
            active: boolean | null;
            created_at: string | null;
            updated_at: string | null;
          };
        };
        tenants: {
          Row: {
            id: string;
            name: string;
            subdomain: string | null;
            domain: string | null;
            description: string | null;
            plan: string | null;
            stripe_customer_id: string | null;
            stripe_subscription_id: string | null;
            is_active: boolean | null;
            created_at: string | null;
            updated_at: string | null;
            deleted_at: string | null;
          };
        };
        user_roles: {
          Row: {
            id: string;
            tenant_id: string | null;
            code: string;
            label: string;
            is_default: boolean | null;
          };
        };
        users: {
          Row: {
            id: string;
            tenant_id: string | null;
            email: string;
            name: string | null;
            role_id: string | null;
            phone: string | null;
            is_active: boolean | null;
            created_at: string | null;
            updated_at: string | null;
          };
        };
      };
    };
  }
  