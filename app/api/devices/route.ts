import { NextResponse } from 'next/server';
import { db } from '@/lib/ConfigFirebase';
import { collection, getDocs, query, Timestamp } from 'firebase/firestore';

export const revalidate = 60; // Cache for 1 minute

const formatDate = (date: Date) => {
  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const devicesRef = collection(db, "devices");
    const q = query(devicesRef);
    const querySnapshot = await getDocs(q);

    const devices = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      const registrationDateTimestamp = data.registrationDate || data.createdAt;
      const registrationDate =
        registrationDateTimestamp instanceof Timestamp
          ? formatDate(registrationDateTimestamp.toDate())
          : formatDate(new Date());

      return {
        id: doc.id,
        name: data.name,
        location: data.location,
        registrationDate: registrationDate,
        coordinates: data.coordinates || { lat: 0.0, lng: 0.0 },
        userId: data.userId,
        authToken: data.authToken,
      };
    });

    return NextResponse.json(devices);
  } catch (error: any) {
    console.error("Error in GET /api/devices:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
