import { SignOutButton } from '@/components/auth/sign-out-button'

export default function Home() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Kühl HVAC Editor</h1>
        <SignOutButton className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900" />
      </header>
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">プロジェクトを選択してください</p>
      </main>
    </div>
  )
}
