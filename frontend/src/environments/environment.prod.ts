export const environment = {
  production: true,
  apiUrl: 'https://api.feastfrenzy.com/api/v1',
  appName: 'FeastFrenzy',
  appVersion: '1.0.0',

  
  enableLogging: false,
  enableAnalytics: true,
  enablePWA: true,
  enableOfflineMode: true,

  
  authTokenKey: 'feastfrenzy_auth_token',
  refreshTokenKey: 'feastfrenzy_refresh_token',
  tokenExpiryBuffer: 300, 

  
  pageSize: 20,
  maxFileUploadSize: 10485760, 
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],

  
  cacheTtl: 300000, 
  enableServiceWorker: true,

  
  googleAnalyticsId: 'GA_MEASUREMENT_ID',
  sentryDsn: 'SENTRY_DSN_URL',

  
  apiTimeout: 30000, 
  retryAttempts: 3,
  retryDelay: 1000, 

  
  logLevel: 'error',
  enableRemoteLogging: true,

  
  enableCSP: true,
  enableXSRFProtection: true,

  
  enablePreloading: true,
  enableLazyLoading: true
};
