'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ContactList } from "@/components/ContactList";
import { MessageList } from "@/components/MessageList";
import { StreakDisplay } from "@/components/StreakDisplay";
import { ContractList } from "@/components/ContractList";
import { ContractForm } from "@/components/ContractForm";
import { MessageAssistant } from "@/components/MessageAssistant";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900">Welcome to PingChain</h2>
            <p className="mt-2 text-gray-600">
              Your smart communication assistant is ready to help you maintain meaningful connections.
            </p>
          </div>
          <div className="col-span-1">
            <ContactList userId={user.id} onContactSelect={setSelectedContactId} />
          </div>
          {selectedContactId && (
            <>
              <div className="col-span-1">
                <MessageList contactId={selectedContactId} />
                <MessageAssistant contactId={selectedContactId} />
              </div>
              <div className="col-span-1">
                <StreakDisplay userId={user.id} contactId={selectedContactId} />
                <ContractList contactId={selectedContactId} />
                <ContractForm contactId={selectedContactId} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 