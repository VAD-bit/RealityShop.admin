'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Package, 
  Tag, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react'

const navItems = [
  { name: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventario', href: '/dashboard/inventario', icon: Package },
  { name: 'Ofertas / Eventos', href: '/dashboard/ofertas', icon: Tag },
  { name: 'Finanzas', href: '/dashboard/finanzas', icon: BarChart3 },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="relative min-h-screen bg-[#060608] text-white flex flex-col md:flex-row overflow-x-hidden selection:bg-red-600 selection:text-white">
      
      {/* GLOWS DE FONDO */}
      <div className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 bg-red-600/15 rounded-full blur-[125px] z-0" />
      <div className="pointer-events-none fixed top-1/2 -right-24 w-96 h-96 bg-red-900/10 rounded-full blur-[140px] z-0" />
      <div className="pointer-events-none fixed -bottom-24 left-1/3 w-96 h-96 bg-slate-400/5 rounded-full blur-[130px] z-0" />

      {/* HEADER MÓVIL */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-[#0a0a0e]/80 backdrop-blur-md border-b border-neutral-800/80 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="font-black text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-neutral-200 to-white">
            REALITY<span className="text-red-600">SHOP</span>
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-xl transition border border-neutral-800"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* BACKDROP PARA MÓVIL */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* BARRA LATERAL (SIDEBAR) */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a0a0d]/90 backdrop-blur-xl border-r border-neutral-800/80 p-5 flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="relative z-10">
          {/* LOGO & CERRAR EN MÓVIL */}
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center font-black text-white shadow-lg shadow-red-900/40 border border-red-500/30">
                R
              </div>
              <span className="font-black text-lg tracking-wider text-white">
                REALITY<span className="text-red-600">SHOP</span>
              </span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 text-neutral-400 hover:text-white rounded-lg border border-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MENÚ DE NAVEGACIÓN DINÁMICO */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600/20 to-transparent border border-red-600/40 text-white shadow-sm shadow-red-950/50'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40 border border-transparent hover:border-neutral-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-red-500' : ''}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* PARTE INFERIOR DE LA BARRA */}
        <div className="relative z-10 pt-4 border-t border-neutral-800/80 space-y-1.5">
          <Link
            href="/dashboard/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/40 font-medium transition border border-transparent hover:border-neutral-800"
          >
            <Settings className="w-5 h-5" />
            Ajustes
          </Link>
          <Link 
            href="/login"
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-red-400 hover:bg-red-500/10 font-medium transition border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </Link>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="relative z-10 flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>

    </div>
  )
}