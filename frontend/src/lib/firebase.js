import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const envFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let firebaseApp = null;
let firebaseAuth = null;
let firebaseInitPromise = null;

function hasRequiredConfig(config) {
  return Boolean(config) && Object.values(config).every(Boolean);
}

async function loadFirebaseConfig() {
  if (hasRequiredConfig(envFirebaseConfig)) {
    return envFirebaseConfig;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/v1/public/firebase-config`, {
      credentials: 'same-origin',
    });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const runtimeConfig = {
      apiKey: payload?.api_key || '',
      authDomain: payload?.auth_domain || '',
      projectId: payload?.project_id || '',
      appId: payload?.app_id || '',
    };
    return hasRequiredConfig(runtimeConfig) ? runtimeConfig : null;
  } catch {
    return null;
  }
}

export async function getFirebaseAuth() {
  if (firebaseAuth) {
    return firebaseAuth;
  }
  if (!firebaseInitPromise) {
    firebaseInitPromise = loadFirebaseConfig().then((firebaseConfig) => {
      if (!hasRequiredConfig(firebaseConfig)) {
        return null;
      }
      firebaseApp = initializeApp(firebaseConfig);
      firebaseAuth = getAuth(firebaseApp);
      return firebaseAuth;
    });
  }
  return firebaseInitPromise;
}

export const googleProvider = new GoogleAuthProvider();
