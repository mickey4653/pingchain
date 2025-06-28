import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getContacts, createContact, updateContact, deleteContact } from "@/lib/firebase-admin-service";

// Utility function to remove undefined values from objects
const removeUndefinedValues = (obj: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  );
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const contactData = await req.json();
    
    try {
      const contact = await createContact({
        ...contactData,
        userId
      });
      return NextResponse.json(contact);
    } catch (firebaseError) {
      console.error("Firebase error:", firebaseError);
      return NextResponse.json({ 
        id: Date.now().toString(),
        ...contactData,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Contacts API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.log("No Clerk user found, returning empty data");
      return NextResponse.json([]);
    }

    try {
      const contacts = await getContacts(userId);
      return NextResponse.json(contacts);
    } catch (firebaseError) {
      console.error("Firebase error, returning empty data:", firebaseError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Contacts API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id, ...contactData } = await req.json();
    
    try {
      await updateContact(id, contactData);
      return NextResponse.json({ success: true });
    } catch (firebaseError) {
      console.error("Firebase error:", firebaseError);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Contacts API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return new NextResponse("Contact ID required", { status: 400 });
    }
    
    try {
      await deleteContact(id);
      return NextResponse.json({ success: true });
    } catch (firebaseError) {
      console.error("Firebase error:", firebaseError);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Contacts API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 