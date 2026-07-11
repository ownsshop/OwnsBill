import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { firebaseConfig } from "./src/lib/firebase";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  console.log("Registering temporary user to authenticate with Firestore...");
  const tempEmail = `temp-${Date.now()}@test.com`;
  const tempPassword = "TempPassword123!";
  const userCred = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
  console.log("Successfully authenticated as:", userCred.user.uid);

  try {
    console.log("Updating 'settings/company' document...");
    const settingsRef = doc(db, "settings", "company");
    await setDoc(settingsRef, {
      companyName: "OwnsLink ব্রডব্যান্ড",
      logoUrl: "/logo.svg",
      smsApiKey: "OwnsLink-SMS-Secret-Key-XXXXXX",
    });
    console.log("Company settings updated successfully in Firestore!");
  } finally {
    console.log("Cleaning up temporary user...");
    await deleteUser(userCred.user);
    console.log("Cleanup successful!");
  }
}

main().catch((err) => {
  console.error("Error during execution:", err);
  process.exit(1);
});
