import { getProviders } from 'next-auth/react'
import SignInButton from '@/components/SignInButton'

export default async function SignIn() {
  const providers = await getProviders()

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="space-y-6">
          {providers &&
            Object.values(providers).map((provider) => (
              <SignInButton key={provider.id} provider={provider} />
            ))}
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Not a member?{' '}
          <a href="/auth/signup" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
            Sign up now
          </a>
        </p>
      </div>
    </div>
  )
} 