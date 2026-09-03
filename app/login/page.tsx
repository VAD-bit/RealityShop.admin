'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Aquí conectas tu autenticación con Supabase
    // const { error } = await supabase.auth.signInWithPassword({ email, password })

    setTimeout(() => {
      setIsLoading(false)
      router.push('/dashboard')
    }, 1000)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060608] p-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-[#0c0c0e] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-black uppercase tracking-wider text-white">
            Reality Shop Admin
          </h1>
          <p className="mt-2 text-xs font-semibold uppercase text-neutral-400">
            Ingresa tus credenciales de acceso
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 size-4 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@realityshop.com"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 py-3 pl-11 pr-4 text-sm text-white focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 size-4 text-neutral-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 py-3 pl-11 pr-4 text-sm text-white focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full rounded-full bg-red-600 py-4 font-heading text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Iniciando sesión...
              </span>
            ) : (
              'Ingresar al Panel'
            )}
          </button>
        </form>
      </div>
    </main>
  )
}