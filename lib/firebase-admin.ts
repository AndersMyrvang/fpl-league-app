import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!key) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY env var is not set");

const serviceAccount = JSON.parse(key);

const adminApp =
  getApps().find((a) => a.name === "admin") ??
  initializeApp({ credential: cert(serviceAccount) }, "admin");

export const adminDb = getFirestore(adminApp);
