// scratch/inspect-devices.ts
import { db } from "../lib/ConfigFirebase";
import { collection, getDocs } from "firebase/firestore";

async function checkDevices() {
  try {
    const snap = await getDocs(collection(db, "devices"));
    console.log("Total devices found in Firestore:", snap.size);
    snap.forEach(doc => {
      console.log(`Device ID: ${doc.id}, Name: ${doc.data().name}, authToken: ${doc.data().authToken}, lat: ${doc.data().coordinates?.lat || doc.data().lat}, lng: ${doc.data().coordinates?.lng || doc.data().lng}`);
    });
  } catch (err) {
    console.error("Error reading devices:", err);
  }
}

checkDevices().then(() => process.exit(0));
