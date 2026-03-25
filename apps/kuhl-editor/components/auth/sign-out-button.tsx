'use client'

import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

interface SignOutButtonProps {
  className?: string
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={className}
    >
      ログアウト
    </button>
  )
}
