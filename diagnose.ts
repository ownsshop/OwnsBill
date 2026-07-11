import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { firebaseConfig } from "./src/lib/firebase";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  console.log("Registering temporary user to authenticate...");
  const tempEmail = `temp-${Date.now()}@test.com`;
  const tempPassword = "TempPassword123!";
  const userCred = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
  console.log("Successfully authenticated as:", userCred.user.uid);

  try {
    console.log("\n--- Users list ---");
    const snap = await getDocs(collection(db, "users"));
    snap.forEach((doc) => {
      const data = doc.data();
      console.log(`UID: ${doc.id}, Name: ${data.name}, Email: ${data.email}, Role: ${data.role}`);
    });

    console.log("\n--- Customers list ---");
    const snapCust = await getDocs(collection(db, "customers"));
    snapCust.forEach((doc) => {
      const data = doc.data();
      console.log(`ID: ${doc.id}, Name: ${data.name}, Email: ${data.email}, Status: ${data.status}`);
    });
  } finally {
    console.log("\nCleaning up temporary user...");
    await deleteUser(userCred.user);
    console.log("Cleanup successful!");
  }
}

main().catch((err) => {
  console.error("Error during execution:", err);
  process.exit(1);
});
