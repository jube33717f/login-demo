const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '',
  },
  app: {
    baseUrl: import.meta.env.VITE_APP_BASE_URL || 'http://localhost:4200',
  },
  e2e: {
    enabled: import.meta.env.VITE_E2E === 'true',
  },
} as const;

export default config;
