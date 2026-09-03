'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Calendar,
  ArrowUpRight,
  User,
  Search,
  Plus,
  Wrench,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface SaleRecord {
  id: string
  product_id?: string
  advisor_name?: string
  total_price: number
  quantity: number
  created_at: string
  products?: {
    name: string
    category: string
    price?: number
    cost_price?: number
    profit_margin?: number
  }
}

export default function FinancePage() {
  // 1. ESTADOS DE DATOS Y CARGA
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // 2. ESTADOS DE REGISTRO MANUAL DE INGRESOS
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [advisorName, setAdvisorName] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // 3. CARGAR VENTAS CON DATOS FINANCIEROS DEL PRODUCTO DESDE SUPABASE
  const fetchFinancialData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, products(name, category, price, cost_price, profit_margin)')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setSales(data as SaleRecord[])
    } catch (error) {
      console.error('Error cargando datos financieros:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFinancialData()
  }, [fetchFinancialData])

  // 4. FILTRADO POR FECHA Y BÚSQUEDA
  const filteredSales = useMemo(() => {
    const now = new Date()

    return sales.filter((sale) => {
      const saleDate = new Date(sale.created_at)

      // Filtro por fecha
      let matchesTime = true
      if (timeRange === 'today') {
        matchesTime = saleDate.toDateString() === now.toDateString()
      } else if (timeRange === 'week') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesTime = saleDate >= sevenDaysAgo
      } else if (timeRange === 'month') {
        matchesTime =
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
      }

      // Filtro por búsqueda (Asesor o Producto)
      const matchesSearch =
        (sale.advisor_name &&
          sale.advisor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.products?.name &&
          sale.products.name.toLowerCase().includes(searchTerm.toLowerCase()))

      return matchesTime && matchesSearch
    })
  }, [sales, timeRange, searchTerm])

  // 5. CÁLCULO DE MÉTRICAS FINANCIERAS REALES
  const financialMetrics = useMemo(() => {
    let totalRevenue = 0
    let totalUnits = 0
    let totalRealProfit = 0

    filteredSales.forEach((sale) => {
      const salePrice = Number(sale.total_price) || 0
      const qty = Number(sale.quantity) || 1

      totalRevenue += salePrice
      totalUnits += qty

      if (sale.products) {
        const unitCost = Number(sale.products.cost_price) || 0
        const unitPrice = Number(sale.products.price) || (salePrice / qty)
        const profitPerUnit = unitPrice - unitCost

        totalRealProfit += profitPerUnit * qty
      } else {
        // Ingresos directos manuales sin costo asignado
        totalRealProfit += salePrice
      }
    })

    const totalTransactions = filteredSales.length
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
    const profitMarginPercentage = totalRevenue > 0 ? (totalRealProfit / totalRevenue) * 100 : 0
    
    // Cálculo del 3% por costo de mantenimiento de la App
    const appMaintenanceFee = totalRevenue * 0.03

    return {
      totalRevenue,
      totalUnits,
      totalTransactions,
      averageTicket,
      totalRealProfit,
      profitMarginPercentage,
      appMaintenanceFee,
    }
  }, [filteredSales])

  // 6. REGISTRO MANUAL DE INGRESO DIRECTO
  const handleCreateDirectSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('sales').insert({
        advisor_name: advisorName || 'General',
        total_price: Number(amount),
        quantity: 1,
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      setAmount('')
      setAdvisorName('')
      setIsModalOpen(false)
      await fetchFinancialData()
    } catch (error) {
      console.error('Error al registrar la transacción:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* CABECERA */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-black uppercase tracking-wider text-white">
            FINANZAS Y CONTROL DE INGRESOS
          </h1>
          <p className="text-xs font-semibold uppercase text-neutral-400">
            Resumen contable, ingresos por ventas y rendimiento comercial
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-heading text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-95"
        >
          <Plus className="size-4" />
          Registrar Ingreso Directo
        </button>
      </div>

      {/* MÉTRICAS CLAVE */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* INGRESOS TOTALES */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Ingresos Totales
            </span>
            <DollarSign className="size-5 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-emerald-400">
            ${financialMetrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-neutral-500">
            <ArrowUpRight className="size-3 text-emerald-400" /> Basado en {financialMetrics.totalTransactions} transacciones
          </span>
        </div>

        {/* MANTENIMIENTO APP (3%) */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Mantenimiento App (3%)
            </span>
            <Wrench className="size-5 text-rose-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-rose-400">
            ${financialMetrics.appMaintenanceFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="mt-1 block text-[10px] font-bold text-neutral-500">
            Costo fijo del 3% s/ ventas
          </span>
        </div>

        {/* GANANCIA REAL */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Ganancia Real Net. ({financialMetrics.profitMarginPercentage.toFixed(1)}%)
            </span>
            <TrendingUp className="size-5 text-blue-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-blue-400">
            ${financialMetrics.totalRealProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="mt-1 block text-[10px] font-bold text-neutral-500">
            Utilidad neta real calculada
          </span>
        </div>

        {/* UNIDADES VENDIDAS */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Unidades Comercializadas
            </span>
            <ShoppingBag className="size-5 text-purple-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-white">
            {financialMetrics.totalUnits}
          </p>
          <span className="mt-1 block text-[10px] font-bold text-neutral-500">
            Artículos facturados en total
          </span>
        </div>

        {/* TICKET PROMEDIO */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Ticket Promedio
            </span>
            <CreditCard className="size-5 text-amber-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-amber-400">
            ${financialMetrics.averageTicket.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="mt-1 block text-[10px] font-bold text-neutral-500">
            Promedio por transacción
          </span>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por vendedor o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-1">
          {(['all', 'today', 'week', 'month'] as const).map((range) => {
            const labels = {
              all: 'Todo',
              today: 'Hoy',
              week: 'Últimos 7 Días',
              month: 'Este Mes',
            }
            return (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition ${
                  timeRange === range
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {labels[range]}
              </button>
            )
          })}
        </div>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md">
        <div className="border-b border-neutral-800 p-4">
          <h2 className="font-heading text-sm font-black uppercase tracking-widest text-neutral-200">
            HISTORIAL DE TRANSACCIONES Y VENTAS ({filteredSales.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-bold uppercase text-neutral-500">
            Cargando registros financieros...
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold uppercase text-neutral-500">
            No se encontraron transacciones registradas en este período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-800 bg-neutral-950/60 text-[10px] uppercase tracking-widest text-neutral-400">
                <tr>
                  <th className="p-4">Fecha & Hora</th>
                  <th className="p-4">Detalle / Producto</th>
                  <th className="p-4">Asesor / Vendedor</th>
                  <th className="p-4 text-center">Cantidad</th>
                  <th className="p-4 text-right">Monto Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="transition-colors hover:bg-neutral-800/30">
                    <td className="p-4 font-mono text-xs text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3 text-neutral-500" />
                        {new Date(sale.created_at).toLocaleString('es-ES', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-bold uppercase text-white">
                        {sale.products?.name || 'Ingreso Directo'}
                      </span>
                      {sale.products?.category && (
                        <span className="ml-2 rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] uppercase text-neutral-400">
                          {sale.products.category}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-semibold text-neutral-300">
                        <User className="size-3 text-emerald-400" />
                        {sale.advisor_name || 'General'}
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-neutral-300">
                      {sale.quantity || 1}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-emerald-400">
                      ${(Number(sale.total_price) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL INGRESO DIRECTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <h3 className="font-heading text-lg font-black uppercase tracking-wider text-white">
              Registrar Ingreso Manual
            </h3>
            <p className="mt-1 text-xs text-neutral-400">
              Añade un pago o venta realizada de manera directa.
            </p>

            <form onSubmit={handleCreateDirectSale} className="mt-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Monto ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 font-mono text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Nombre del Asesor / Responsable
                </label>
                <input
                  type="text"
                  placeholder="Ej: Carlos - Vendedor"
                  value={advisorName}
                  onChange={(e) => setAdvisorName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 rounded-xl border border-neutral-800 py-2.5 font-heading text-xs font-bold uppercase text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 rounded-xl bg-emerald-600 py-2.5 font-heading text-xs font-black uppercase text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}