/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_MIN_PASSING_AVERAGE?: string;
  readonly VITE_DEV_ADMIN_EMAIL?: string;
  readonly VITE_DEV_TEACHER_EMAIL?: string;
  readonly VITE_DEV_STUDENT_EMAIL?: string;
  readonly VITE_DEV_SEED_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
