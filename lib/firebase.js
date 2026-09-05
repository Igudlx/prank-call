'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const fbAuth = getAuth(app);

let readyPromise = null;

// The site uses its own email/password auth (Neon + JWT) for accounts, but
// Realtime Database security rules still need *some* notion of "signed in"
// to keep the presence/call data from being wide open to the entire
// internet. Firebase Anonymous Auth gives us that for free, with zero extra
// UI - it just silently attaches an auth token in the background.
export function ensureFirebaseSignedIn() {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      fbAuth,
      (user) => {
        if (user) {
          unsub();
          resolve(user);
        } else {
          signInAnonymously(fbAuth).catch((err) => {
            unsub();
            reject(err);
          });
        }
      },
      reject
    );
  });
  return readyPromise;
}
