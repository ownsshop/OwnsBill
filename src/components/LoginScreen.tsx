import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, query, collection, where, getDocs, deleteDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Shield, Mail, Lock, User, Phone, CheckCircle, ArrowRight } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: any, role: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "staff" | "customer">("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [companySettings, setCompanySettings] = useState({
    companyName: "OwnsLink ব্রডব্যান্ড",
    logoUrl: "/logo.svg",
    smsApiKey: "",
  });

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "company"), (docSnap) => {
      if (docSnap.exists()) {
        setCompanySettings(docSnap.data() as any);
      }
    });
    return unsubSettings;
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isSignUp) {
        // Enforce role = admin automatically if administrative emails are registered
        const trimmedEmail = email.toLowerCase().trim();
        const assignedRole = (trimmedEmail === "admin@owns.com" || trimmedEmail === "ownslink@gmail.com") ? "admin" : role;

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user profile in Firestore
        const userProfile = {
          uid: user.uid,
          name: fullName,
          email: email.toLowerCase().trim(),
          phone: phone,
          role: assignedRole,
          balance: 0,
          salary: assignedRole === "staff" ? 15000 : 0,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", user.uid), userProfile);

        // If registered customer, also create a customer record to keep sync
        if (assignedRole === "customer") {
          await setDoc(doc(db, "customers", user.uid), {
            id: user.uid,
            name: fullName,
            phone: phone,
            email: email.toLowerCase().trim(),
            address: "মিরপুর, ঢাকা",
            nid: "N/A",
            zone: "মিরপুর জোন",
            area: "মিরপুর-১০, ব্লক-এ",
            packageId: "pkg-1",
            onuMac: "ONU-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
            status: "active",
            dueAmount: 0,
            promiseDate: "",
            staffId: "",
          });
        }

        setMessage("নিবন্ধন সফল হয়েছে! অনুগ্রহ করে লগইন করুন।");
        setIsSignUp(false);
      } else {
        // Log in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch user profile from Firestore
        const docRef = doc(db, "users", user.uid);
        let docSnap = await getDoc(docRef);

        const trimmedEmail = email.toLowerCase().trim();
        const isAdminEmail = trimmedEmail === "admin@owns.com" || trimmedEmail === "ownslink@gmail.com";

        // Self-Healing for UID mismatch on login button action
        if (!docSnap.exists()) {
          console.log("Login user doc does not exist for UID:", user.uid, "Searching by email:", trimmedEmail);
          const q = query(collection(db, "users"), where("email", "==", trimmedEmail));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            const existingDoc = querySnap.docs[0];
            const existingData = existingDoc.data();
            console.log("Migrating profile for", trimmedEmail, "to new UID:", user.uid);
            
            const newProfile = {
              ...existingData,
              uid: user.uid,
            };
            await setDoc(docRef, newProfile);
            
            if (existingDoc.id !== user.uid) {
              await deleteDoc(doc(db, "users", existingDoc.id));
              console.log("Deleted old user document during login:", existingDoc.id);
            }
            
            // Self-heal customer if applicable
            const custRef = doc(db, "customers", user.uid);
            const custSnap = await getDoc(custRef);
            if (!custSnap.exists()) {
              const qCust = query(collection(db, "customers"), where("email", "==", trimmedEmail));
              const querySnapCust = await getDocs(qCust);
              if (!querySnapCust.empty) {
                const existingCustDoc = querySnapCust.docs[0];
                const existingCustData = existingCustDoc.data();
                
                await setDoc(custRef, {
                  ...existingCustData,
                  id: user.uid,
                });
                
                if (existingCustDoc.id !== user.uid) {
                  await deleteDoc(doc(db, "customers", existingCustDoc.id));
                }
              }
            }
            
            docSnap = await getDoc(docRef);
          }
        }

        if (docSnap.exists()) {
          const profile = docSnap.data();
          let currentRole = profile.role;
          console.log("Login authenticated successfully. Role:", currentRole);
          
          if (isAdminEmail && currentRole !== "admin") {
            await updateDoc(docRef, { role: "admin" });
            currentRole = "admin";
          }
          
          onLoginSuccess(user, currentRole);
        } else {
          // Fallback if profile doesn't exist, auto create as customer or admin if using administrative email
          const trimmedEmail = email.toLowerCase().trim();
          const fallbackRole = (trimmedEmail === "admin@owns.com" || trimmedEmail === "ownslink@gmail.com") ? "admin" : "customer";
          const fallbackProfile = {
            uid: user.uid,
            name: user.email?.split("@")[0] || "গ্রাহক",
            email: user.email || email,
            phone: "017XXXXXXXX",
            role: fallbackRole,
            balance: 0,
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, fallbackProfile);
          onLoginSuccess(user, fallbackRole);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let errMsg = "লগইন বা নিবন্ধন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।";
      if (err.code === "auth/email-already-in-use") {
        errMsg = "এই ইমেইলটি ইতিপূর্বে ব্যবহার করা হয়েছে!";
      } else if (err.code === "auth/wrong-password") {
        errMsg = "ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।";
      } else if (err.code === "auth/user-not-found") {
        errMsg = "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি!";
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          {companySettings.logoUrl ? (
            <div className="mx-auto flex justify-center mb-4">
              <img
                src={companySettings.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="h-24 w-24 object-cover rounded-full border border-gray-150 dark:border-zinc-800 p-1 bg-white shadow-md"
              />
            </div>
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Shield className="h-8 w-8" />
            </div>
          )}
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white">
            {companySettings.companyName || "OwnsLink"}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            আইএসপি রিসেলার বিলিং এবং কাস্টমার কেয়ার পোর্টাল
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
            {message}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4 rounded-md">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    পূর্ণ নাম
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <User className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="যেমন: মনিকা রহমান"
                      className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-gray-950 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    মোবাইল নম্বর
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Phone className="h-5 w-5" />
                    </span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-gray-950 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    অ্যাকাউন্ট টাইপ
                  </label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-gray-950 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="customer">গ্রাহক (Customer)</option>
                    <option value="staff">স্টাফ (Staff)</option>
                    <option value="admin">অ্যাডমিন (Admin)</option>
                  </select>
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    * admin@owns.com মেইল দিয়ে রেজিস্টার করলে অটো অ্যাডমিন এক্সেস পাবেন।
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                ইমেইল এড্রেস
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@owns.com অথবা আপনার ইমেইল"
                  className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-gray-950 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="৬+ অক্ষরের পাসওয়ার্ড দিন"
                  minLength={6}
                  className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-gray-950 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  লোডিং...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isSignUp ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "লগইন করুন"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setMessage("");
            }}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
          >
            {isSignUp
              ? "ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন"
              : "নতুন অ্যাকাউন্ট? এখানে নিবন্ধন করুন"}
          </button>
        </div>


      </div>
    </div>
  );
}
