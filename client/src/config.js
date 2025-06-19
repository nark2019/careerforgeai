// API Configuration
const config = {
  API_URL: process.env.NODE_ENV === 'production' 
    ? 'http://localhost:5000'  // Update this to your actual deployed backend URL
    : 'http://localhost:5000',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  version: '1.0.0',
  detectServer: async () => {
    console.log('Server detection is disabled in this deployment');
    return 'http://localhost:5000';
  }
};

export default config; 