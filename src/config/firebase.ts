import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB_DZvjAAVWzf1RD9FXJXUBG-Tn0PiCFss",
  authDomain: "scorewise-df5db.firebaseapp.com",
  projectId: "scorewise-df5db",
  storageBucket: "scorewise-df5db.firebasestorage.app",
  messagingSenderId: "765931483263",
  appId: "1:765931483263:web:2d3ad52cade5d03b298f4a"
  // Removed measurementId to disable Analytics
};

// Initialize Firebase with minimal services
const app = initializeApp(firebaseConfig, {
  // Disable analytics and other services that might cause errors
  automaticDataCollectionEnabled: false
});

// Initialize Firestore with better error handling and offline support
let db;

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    // Disable network requests that might cause issues
    experimentalForceLongPolling: true,
    useFetchStreams: false
  });
  
  console.log('✅ Firestore initialized successfully with persistent cache');
} catch (error) {
  console.warn('⚠️ Failed to initialize Firestore with persistent cache, falling back to default:', error);
  // Fallback to default Firestore initialization
  try {
    db = getFirestore(app);
    console.log('✅ Firestore initialized with default configuration');
  } catch (fallbackError) {
    console.error('❌ Failed to initialize Firestore completely:', fallbackError);
    // Create a mock db object to prevent app crashes
    db = {
      collection: () => ({ doc: () => ({ set: async () => {}, get: async () => ({ exists: false, data: () => null }) }) }),
      doc: () => ({ set: async () => {}, get: async () => ({ exists: false, data: () => null }) })
    };
  }
}

// Add global error handler for Firebase internal errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Filter out Firebase internal errors
    if (event.error && (
      event.error.message?.includes('sendBeacon') ||
      event.error.message?.includes('firebase') ||
      event.error.message?.includes('Firebase') ||
      event.filename?.includes('firebase')
    )) {
      console.warn('⚠️ Firebase internal error caught and ignored:', event.error);
      event.preventDefault();
      return false;
    }
  });

  // Also catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (
      event.reason.message?.includes('sendBeacon') ||
      event.reason.message?.includes('firebase') ||
      event.reason.message?.includes('Firebase')
    )) {
      console.warn('⚠️ Firebase promise rejection caught and ignored:', event.reason);
      event.preventDefault();
      return false;
    }
  });
}

export { db };