'use client'

import { signIn } from 'next-auth/react'
import { ClientSafeProvider } from 'next-auth/react'

interface SignInButtonProps {
  provider: ClientSafeProvider
}

export default function SignInButton({ provider }: SignInButtonProps) {
  return (
    <button
      onClick={() => signIn(provider.id)}
      className="flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      Sign in with {provider.name}
    </button>
  )
} 