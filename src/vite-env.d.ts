/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_TRANSFER_ALIAS?: string;
  readonly VITE_KITCHEN_PIN?: string;
  readonly VITE_MP_PUBLIC_KEY?: string;
  readonly VITE_MP_ENVIRONMENT?: 'sandbox' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
