import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfigDefault from "../../firebase-applet-config.json";

// Read from environment variables if present (for custom user-deployed projects like owns-billing)
// Otherwise fallback to the AI Studio auto-generated config.
const metaEnv = (import.meta as any).env || {};

export const firebaseConfig = {
  apiKey: (metaEnv.VITE_FIREBASE_API_KEY as string) || firebaseConfigDefault.apiKey,
  authDomain: (metaEnv.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfigDefault.authDomain,
  projectId: (metaEnv.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfigDefault.projectId,
  storageBucket: (metaEnv.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfigDefault.storageBucket,
  messagingSenderId: (metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfigDefault.messagingSenderId,
  appId: (metaEnv.VITE_FIREBASE_APP_ID as string) || firebaseConfigDefault.appId,
  firestoreDatabaseId: (metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || firebaseConfigDefault.firestoreDatabaseId || "(default)",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Authentication & Firestore Database
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Firestore database connectivity on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Firestore is offline. Please check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();

// Structured Firestore error logger as mandated by Firebase integration guidelines
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error("Firestore Error Detailed info: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
