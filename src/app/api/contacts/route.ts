import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import type { Contact } from '@/types/firebase'

// Utility function to remove undefined values from objects
const removeUndefinedValues = (obj: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  );
};

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || !email) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const contactsRef = collection(db, "contacts");
    const newContact = removeUndefinedValues({
      userId,
      name,
      email,
      phone,
      createdAt: new Date().toISOString(),
    });

    const docRef = await addDoc(contactsRef, newContact);
    return NextResponse.json({ id: docRef.id, ...newContact });
  } catch (error) {
    console.error("Error creating contact:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const contactsRef = collection(db, "contacts");
    const q = query(contactsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const contacts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { id, name, email, phone } = body;

    if (!id || !name || !email) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const contactRef = doc(db, "contacts", id);
    await updateDoc(contactRef, {
      name,
      email,
      phone: phone || "",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ id, name, email, phone });
  } catch (error) {
    console.error("Error updating contact:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing contact ID", { status: 400 });
    }

    const contactRef = doc(db, "contacts", id);
    await deleteDoc(contactRef);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 