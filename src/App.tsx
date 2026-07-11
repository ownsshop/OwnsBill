import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, query, collection, where, getDocs, setDoc, deleteDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { seedInitialData } from "./lib/seed";
import LoginScreen from "./components/LoginScreen";
import AdminPanel from "./components/AdminPanel";
import StaffPanel from "./components/StaffPanel";
import CustomerPanel from "./components/CustomerPanel";
import { Shield, LogOut, Sun, Moon, Sparkles, Wifi } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [companySettings, setCompanySettings] = useState({
    companyName: "OwnsLink ব্রডব্যান্ড",
    logoUrl: "/logo.svg",
  });

  // Load and apply theme from LocalStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      localStorage.setItem("theme", "light");
    }
  }, []);

  // Load company settings
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "company"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data) {
          setCompanySettings({
            companyName: data.companyName || "OwnsLink ব্রডব্যান্ড",
            logoUrl: data.logoUrl || "/logo.svg",
          });
        }
      }
    });
    return unsubSettings;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Seed default data on first load
  useEffect(() => {
    seedInitialData();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const email = currentUser.email?.toLowerCase().trim() || "";
          const isAdminEmail = email === "ownslink@gmail.com" || email === "admin@owns.com";

          console.log("Auth User:", email, "UID:", currentUser.uid, "isAdminEmail:", isAdminEmail);

          // Fetch user profile from Firestore to determine panel role
          const docRef = doc(db, "users", currentUser.uid);
          let docSnap = await getDoc(docRef);

          // Robust Self-Healing for UID mismatch (e.g. if Auth was cleared/recreated but Firestore has correct role under old UID)
          if (!docSnap.exists()) {
            console.log("User doc does not exist for UID:", currentUser.uid, "Searching by email...");
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnap = await getDocs(q);
            
            if (!querySnap.empty) {
              const existingDoc = querySnap.docs[0];
              const existingData = existingDoc.data();
              console.log("Found existing user document with UID:", existingDoc.id, "Data:", existingData);
              
              // Copy data to new UID doc
              const newProfile = {
                ...existingData,
                uid: currentUser.uid,
              };
              await setDoc(docRef, newProfile);
              
              // Delete old document if the ID is different
              if (existingDoc.id !== currentUser.uid) {
                await deleteDoc(doc(db, "users", existingDoc.id));
                console.log("Deleted old user document:", existingDoc.id);
              }
              
              // Check and self-heal customer collection too if they are a customer
              const custRef = doc(db, "customers", currentUser.uid);
              const custSnap = await getDoc(custRef);
              if (!custSnap.exists()) {
                const qCust = query(collection(db, "customers"), where("email", "==", email));
                const querySnapCust = await getDocs(qCust);
                if (!querySnapCust.empty) {
                  const existingCustDoc = querySnapCust.docs[0];
                  const existingCustData = existingCustDoc.data();
                  console.log("Found and migrating customer doc with ID:", existingCustDoc.id);
                  
                  await setDoc(custRef, {
                    ...existingCustData,
                    id: currentUser.uid,
                  });
                  
                  if (existingCustDoc.id !== currentUser.uid) {
                    await deleteDoc(doc(db, "customers", existingCustDoc.id));
                  }
                }
              }
              
              // Refetch docSnap
              docSnap = await getDoc(docRef);
            } else {
              console.log("No existing user document found with email:", email);
            }
          }

          if (docSnap.exists()) {
            const data = docSnap.data();
            let currentRole = data.role;
            console.log("Resolved user role:", currentRole, "from doc:", docSnap.id);

            // Auto-upgrade to admin if using an administrative email but saved as customer
            if (isAdminEmail && currentRole !== "admin") {
              console.log("Upgrading to admin...");
              await updateDoc(docRef, { role: "admin" });
              currentRole = "admin";
            }

            setRole(currentRole);
          } else {
            // Fallback role assignment
            const fallbackRole = isAdminEmail ? "admin" : "customer";
            console.log("No profile found. Assigning fallback role:", fallbackRole);

            // Create user profile document automatically if it doesn't exist
            await setDoc(docRef, {
              uid: currentUser.uid,
              name: currentUser.displayName || email.split("@")[0] || "ব্যবহারকারী",
              email: email,
              phone: "017XXXXXXXX",
              role: fallbackRole,
              balance: 0,
              createdAt: new Date().toISOString(),
            });

            setRole(fallbackRole);
          }
        } catch (error) {
          console.error("Error retrieving user role in App.tsx:", error);
          const email = currentUser.email?.toLowerCase().trim() || "";
          const fallbackRole = (email === "ownslink@gmail.com" || email === "admin@owns.com") ? "admin" : "customer";
          setRole(fallbackRole);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (loggedInUser: any, userRole: string) => {
    setUser(loggedInUser);
    setRole(userRole);
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
      setShowLogoutModal(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-zinc-200">
        <div className="flex flex-col items-center space-y-4">
          {companySettings.logoUrl ? (
            <div className="relative">
              <img
                src={companySettings.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="h-20 w-20 object-cover rounded-full border-2 border-emerald-500 p-0.5 bg-white shadow-lg animate-pulse"
              />
              <span className="absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              </span>
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 animate-bounce">
              <Shield className="h-10 w-10" />
            </div>
          )}
          <h2 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {companySettings.companyName}
          </h2>
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 px-4 py-2 rounded-full shadow-sm">
            <svg
              className="animate-spin h-4 w-4 text-emerald-600 dark:text-emerald-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="font-semibold text-xs text-gray-600 dark:text-zinc-300">লোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
      
      {/* Custom Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-gray-950 dark:text-white flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-500" />
              লগআউট নিশ্চিত করুন
            </h3>
            <p className="mt-2.5 text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
              আপনি কি নিশ্চিতভাবে আপনার অ্যাকাউন্ট থেকে লগআউট করতে চান?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/15 transition"
              >
                লগআউট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Core Router Panels */}
      <div className="flex-1 flex flex-col">
        {!user ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : role === null ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-850 dark:text-gray-150">
            <svg
              className="animate-spin h-8 w-8 text-emerald-600 mb-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="font-semibold text-sm">প্যানেল লোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন</span>
          </div>
        ) : role === "admin" ? (
          <AdminPanel currentUser={user} />
        ) : role === "staff" ? (
          <StaffPanel currentUser={user} />
        ) : (
          <CustomerPanel currentUser={user} />
        )}
      </div>

      {/* Strict Footer as mandated by guidelines */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 text-center py-4 text-xs text-gray-500 dark:text-zinc-400">
        Copyright © 2026 {companySettings.companyName}. All rights reserved | Website Developed by: P.M.Monir
      </footer>
    </div>
  );
}
