// Environment configuration for AutoWash Mobile

export type Environment = 'development' | 'staging' | 'production';

const CURRENT_ENV: Environment = 'development';

export const ENV_CONFIG = {
  development: {
    apiBaseUrl: 'http://192.168.0.103:3000/api/v1', // thay đổi theo IP trên máy
    // For Android Emulator: 'http://10.0.2.2:3000/api/v1'
    // For iOS Simulator: 'http://localhost:3000/api/v1'
    // For Expo Go: Use your machine IP address
    apiTimeout: 15000,
    enableLogging: true,
    enableNetworkDebugger: true,
  },
  staging: {
    apiBaseUrl: 'https://staging-api.autowash.com/api/v1',
    apiTimeout: 10000,
    enableLogging: true,
    enableNetworkDebugger: false,
  },
  production: {
    apiBaseUrl: 'https://api.autowash.com/api/v1',
    apiTimeout: 10000,
    enableLogging: false,
    enableNetworkDebugger: false,
  },
};

export function getConfig() {
  return ENV_CONFIG[CURRENT_ENV];
}

export function getCurrentEnvironment() {
  return CURRENT_ENV;
}

// Development environment notes:
// ==============================
// 
// For Expo Go (local machine testing):
//   - Replace 192.168.1.1 with your actual machine IP
//   - Get IP: Windows: ipconfig | Mac/Linux: ifconfig
//   - Test connectivity: ping <your-ip>
//
// For Android Emulator:
//   - Use: http://10.0.2.2:3000/api/v1
//   - This is the special IP to access host machine from emulator
//
// For iOS Simulator:
//   - Use: http://localhost:3000/api/v1
//   - Can directly access localhost
//
// Troubleshooting connection:
// 1. Ensure backend is running: npm run dev (in BE folder)
// 2. Check firewall settings - allow port 3000
// 3. Test with curl: curl http://your-ip:3000/api/v1/auth/health
// 4. Check device is on same network as backend
