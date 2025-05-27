export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000/api/v1',
  appName: 'FeastFrenzy',
  appVersion: '1.0.0',

  
  enableLogging: true,
  enableAnalytics: false,
  enablePWA: false,
  enableOfflineMode: false,

  
  authTokenKey: 'feastfrenzy_auth_token',
  refreshTokenKey: 'feastfrenzy_refresh_token',
  tokenExpiryBuffer: 300, 

  
  pageSize: 20,
  maxFileUploadSize: 10485760, 
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],

  
  cacheTtl: 60000, 
  enableServiceWorker: false,

  
  googleAnalyticsId: '',
  sentryDsn: '',

  
  apiTimeout: 10000, 
  retryAttempts: 2,
  retryDelay: 500, 

  
  logLevel: 'debug',
  enableRemoteLogging: false,

  
  enableCSP: false,
  enableXSRFProtection: false,

  
  enablePreloading: false,
  enableLazyLoading: true
};
