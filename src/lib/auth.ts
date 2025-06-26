import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export function requireAuth() {
  const { userId } = auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  return userId;
} 