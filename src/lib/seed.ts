import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export async function seedInitialData() {
  try {
    // 1. Seed Packages
    const pkgSnap = await getDocs(collection(db, "packages"));
    if (pkgSnap.empty) {
      const samplePackages = [
        { id: "pkg-1", name: "১০ এমবিপিএস সাধারণ", speed: "10 Mbps", price: 500, oltProfile: "Profile_Starter" },
        { id: "pkg-2", name: "২০ এমবিপিএস স্ট্যান্ডার্ড", speed: "20 Mbps", price: 800, oltProfile: "Profile_Standard" },
        { id: "pkg-3", name: "৫০ এমবিপিএস সুপার ফাস্ট", speed: "50 Mbps", price: 1500, oltProfile: "Profile_Premium" },
      ];
      for (const p of samplePackages) {
        await setDoc(doc(db, "packages", p.id), p);
      }
      console.log("Packages seeded successfully!");
    }

    // 2. Seed Zones
    const zoneSnap = await getDocs(collection(db, "zones"));
    if (zoneSnap.empty) {
      const sampleZones = [
        { id: "zone-1", name: "মিরপুর জোন" },
        { id: "zone-2", name: "উত্তরা জোন" },
        { id: "zone-3", name: "ধানমন্ডি জোন" },
      ];
      for (const z of sampleZones) {
        await setDoc(doc(db, "zones", z.id), z);
      }
      console.log("Zones seeded successfully!");
    }

    // 3. Seed Areas
    const areaSnap = await getDocs(collection(db, "areas"));
    if (areaSnap.empty) {
      const sampleAreas = [
        { id: "area-1", name: "মিরপুর-১০, ব্লক-এ", zoneId: "zone-1" },
        { id: "area-2", name: "মিরপুর-১১, রোড-৫", zoneId: "zone-1" },
        { id: "area-3", name: "উত্তরা সেক্টর-৪", zoneId: "zone-2" },
        { id: "area-4", name: "উত্তরা সেক্টর-৭", zoneId: "zone-2" },
        { id: "area-5", name: "ধানমন্ডি ২৭ নম্বর", zoneId: "zone-3" },
      ];
      for (const a of sampleAreas) {
        await setDoc(doc(db, "areas", a.id), a);
      }
      console.log("Areas seeded successfully!");
    }

    // 4. Seed Company Settings
    const settingsRef = doc(db, "settings", "company");
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        companyName: "OwnsLink ব্রডব্যান্ড",
        logoUrl: "/logo.svg",
        smsApiKey: "OwnsLink-SMS-Secret-Key-XXXXXX",
      });
      console.log("Company settings seeded successfully!");
    }
  } catch (error) {
    console.error("Error seeding initial data:", error);
  }
}
