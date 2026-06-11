import * as admin from 'firebase-admin';
import { env } from './env';

let firebaseApp: admin.app.App | null = null;

if (env.AUTH_MODE === 'firebase') {
  try {
    const privateKey = env.FIREBASE_PRIVATE_KEY
      ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && privateKey) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('🔥 Firebase Admin SDK initialized successfully.');
    } else {
      // Fallback to ADC or environment variables (e.g. GOOGLE_APPLICATION_CREDENTIALS)
      firebaseApp = admin.initializeApp();
      console.log('🔥 Firebase Admin SDK initialized with default configuration.');
    }
  } catch (error) {
    console.warn('⚠️ Failed to initialize Firebase Admin SDK. Real Firebase Auth will fail.', error);
  }
} else {
  console.log('ℹ️ Auth mode set to mock. Firebase Admin SDK will not be initialized.');
}

export { firebaseApp };
