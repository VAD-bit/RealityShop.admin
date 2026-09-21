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
  Award,
  Clock,
  X
} from 'lucide-react'
import { ADVISORS as DEFAULT_ADVISORS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface SaleRecord {
  id: string
  product_id?: string
  advisor_name?: string
  total_price: number
  quantity: number
  payment_status?: 'pagado' | 'por_cobrar'
  created_at: string
  products?: {
    name: string
    category: string
    price?: number
    cost_price?: number
    profit_margin?: number
  }
}

interface PaymentRecord {
  id: string
  type: 'mantenimiento' | 'comision'
  advisor_name: string
  amount: number
  reference: string
  created_at: string
}

export default function FinancePage() {
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [advisors, setAdvisors] = useState<{ id: string; name: string }[]>(DEFAULT_ADVISORS)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'receivables'>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Modales
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [advisorName, setAdvisorName] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState<boolean>(false)
  const [maintenanceAmount, setMaintenanceAmount] = useState<string>('')
  const [maintenanceRef, setMaintenanceRef] = useState<string>('')
  const [isSubmittingMaintenance, setIsSubmittingMaintenance] = useState<boolean>(false)

  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState<boolean>(false)
  const [selectedCommissionAdvisor, setSelectedCommissionAdvisor] = useState<string>(DEFAULT_ADVISORS[0]?.name || '')
  const [commissionAmount, setCommissionAmount] = useState<string>('')
  const [commissionRef, setCommissionRef] = useState<string>('')
  const [isSubmittingCommission, setIsSubmittingCommission] = useState<boolean>(false)

  // Cargar datos desde Supabase
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*, products(name, category, price, cost_price, profit_margin)')
        .order('created_at', { ascending: false })

      if (salesError) throw salesError
      if (salesData) setSales(salesData as SaleRecord[])

      const { data: payData, error: payError } = await supabase
        .from('payment_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (!payError && payData) {
        setPaymentRecords(payData)
      }

      const { data: advData, error: advError } = await supabase
        .from('advisors')
        .select('*')

      if (!advError && advData && advData.length > 0) {
        setAdvisors(advData)
      }
    } catch (error) {
      console.error('Error cargando datos financieros:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Cambiar estado de cobro de una venta (pagado <-> por_cobrar)
  const handleTogglePaymentStatus = async (saleId: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'por_cobrar' ? 'pagado' : 'por_cobrar'

    try {
      const { error } = await supabase
        .from('sales')
        .update({ 
          payment_status: newStatus
        })
        .eq('id', saleId)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error actualizando estado de pago:', error)
      alert('Error al actualizar estado de cobro.')
    }
  }

  // Filtrado por fecha, pestañas y búsqueda
  const filteredSales = useMemo(() => {
    const now = new Date()

    return sales.filter((sale) => {
      const isPending = sale.payment_status === 'por_cobrar'
      if (activeTab === 'receivables' && !isPending) {
        return false
      }

      const saleDate = new Date(sale.created_at)

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

      const matchesSearch =
        (sale.advisor_name &&
          sale.advisor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.products?.name &&
          sale.products.name.toLowerCase().includes(searchTerm.toLowerCase()))

      return matchesTime && matchesSearch
    })
  }, [sales, timeRange, activeTab, searchTerm])

  // Cálculo de comisiones por asesor
  const advisorCommissionsOwed = useMemo(() => {
    const map: Record<string, { totalSales: number; totalPaid: number; pending: number }> = {}

    advisors.forEach((adv) => {
      map[adv.name] = { totalSales: 0, totalPaid: 0, pending: 0 }
    })

    sales.forEach((s) => {
      const adv = s.advisor_name || 'General'
      if (!map[adv]) map[adv] = { totalSales: 0, totalPaid: 0, pending: 0 }
      map[adv].totalSales += Number(s.total_price) || 0
    })

    paymentRecords
      .filter((p) => p.type === 'comision')
      .forEach((p) => {
        const adv = p.advisor_name
        if (!map[adv]) map[adv] = { totalSales: 0, totalPaid: 0, pending: 0 }
        map[adv].totalPaid += Number(p.amount) || 0
      })

    Object.keys(map).forEach((adv) => {
      const earned = map[adv].totalSales * 0.10
      map[adv].pending = Math.max(0, earned - map[adv].totalPaid)
    })

    return map
  }, [advisors, sales, paymentRecords])

  // Cálculo de métricas financieras según las reglas del usuario
  const financialMetrics = useMemo(() => {
    let totalRevenue = 0
    let totalReceivables = 0
    let totalUnits = 0
    let baseRealProfit = 0

    sales.forEach((sale) => {
      const totalPrice = Number(sale.total_price) || 0
      const qty = Number(sale.quantity) || 1

      totalRevenue += totalPrice

      if (sale.payment_status === 'por_cobrar') {
        totalReceivables += totalPrice
      }

      totalUnits += qty

      if (sale.products) {
        const unitCost = Number(sale.products.cost_price) || 0
        const unitPrice = Number(sale.products.price) || (totalPrice / qty)
        const profitPerUnit = unitPrice - unitCost
        baseRealProfit += profitPerUnit * qty
      } else {
        baseRealProfit += totalPrice
      }
    })

    const totalPaidMaintenance = paymentRecords
      .filter((p) => p.type === 'mantenimiento')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const totalPaidCommissions = paymentRecords
      .filter((p) => p.type === 'comision')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // El mantenimiento se calcula sobre los ingresos totales
    const totalAppMaintenanceFee = totalRevenue * 0.03
    const phantomMaintenancePending = Math.max(0, totalAppMaintenanceFee - totalPaidMaintenance)

    // Ganancia Real Neta = Ganancia Base - Mantenimiento pagado - Comisiones pagadas - Cuentas por cobrar
    const netRealProfit = baseRealProfit - totalPaidMaintenance - totalPaidCommissions - totalReceivables

    let filteredRevenue = 0
    filteredSales.forEach((s) => {
      filteredRevenue += Number(s.total_price) || 0
    })

    const totalTransactions = filteredSales.length
    const averageTicket = totalTransactions > 0 ? filteredRevenue / totalTransactions : 0
    const profitMarginPercentage = totalRevenue > 0 ? (netRealProfit / totalRevenue) * 100 : 0

    return {
      totalRevenue: filteredRevenue,
      globalRevenue: totalRevenue,
      totalReceivables,
      totalUnits,
      totalTransactions,
      averageTicket,
      netRealProfit,
      profitMarginPercentage,
      appMaintenanceFee: totalAppMaintenanceFee,
      totalPaidMaintenance,
      totalPaidCommissions,
      phantomMaintenancePending,
    }
  }, [sales, filteredSales, paymentRecords])

  // Registrar Ingreso Directo
  const handleCreateDirectSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('sales').insert({
        advisor_name: advisorName || 'General',
        total_price: Number(amount),
        quantity: 1,
        payment_status: 'pagado',
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      setAmount('')
      setAdvisorName('')
      setIsModalOpen(false)
      await fetchData()
    } catch (error) {
      console.error('Error al registrar la transacción:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Registrar Pago de Mantenimiento
  const handleRegisterMaintenancePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!maintenanceAmount || Number(maintenanceAmount) <= 0) return

    setIsSubmittingMaintenance(true)
    try {
      const { error } = await supabase.from('payment_records').insert({
        type: 'mantenimiento',
        advisor_name: 'Victor Diaz',
        amount: Number(maintenanceAmount),
        reference: maintenanceRef || 'N/A',
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      setMaintenanceAmount('')
      setMaintenanceRef('')
      setIsMaintenanceModalOpen(false)
      await fetchData()
    } catch (error) {
      console.error('Error registrando pago de mantenimiento:', error)
      alert('Error al registrar pago de mantenimiento')
    } finally {
      setIsSubmittingMaintenance(false)
    }
  }

  // Registrar Pago de Comisión
  const handleRegisterCommissionPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commissionAmount || Number(commissionAmount) <= 0) return

    setIsSubmittingCommission(true)
    try {
      const { error } = await supabase.from('payment_records').insert({
        type: 'comision',
        advisor_name: selectedCommissionAdvisor,
        amount: Number(commissionAmount),
        reference: commissionRef || 'N/A',
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      setCommissionAmount('')
      setCommissionRef('')
      setIsCommissionModalOpen(false)
      await fetchData()
    } catch (error) {
      console.error('Error registrando pago de comisión:', error)
      alert('Error al registrar pago de comisión')
    } finally {
      setIsSubmittingCommission(false)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* CABECERA */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-black uppercase tracking-wider text-white">
            FINANZAS Y CUENTAS POR COBRAR
          </h1>
          <p className="text-xs font-semibold uppercase text-neutral-400">
            Control contable, cuentas pendientes y pagos de comisiones / mantenimiento
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCommissionModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-heading text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/35 transition-all hover:bg-amber-700 active:scale-95"
          >
            <Award className="size-4" />
            Pago Comisión
          </button>

          <button
            onClick={() => setIsMaintenanceModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-3 font-heading text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-rose-600/35 transition-all hover:bg-rose-700 active:scale-95"
          >
            <Wrench className="size-4" />
            Pago Mantenimiento
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-heading text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/35 transition-all hover:bg-emerald-700 active:scale-95"
          >
            <Plus className="size-4" />
            Registrar Ingreso
          </button>
        </div>
      </div>

      {/* MÉTRICAS CLAVE */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* INGRESOS TOTALES (NO CAMBIAN AL MARCAR POR COBRAR) */}
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
            <ArrowUpRight className="size-3 text-emerald-400" /> {financialMetrics.totalTransactions} transacciones
          </span>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Cuentas por Cobrar
            </span>
            <Clock className="size-5 text-amber-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-amber-400">
            ${financialMetrics.totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <button
            onClick={() => setActiveTab(activeTab === 'receivables' ? 'all' : 'receivables')}
            className="mt-1 text-[10px] font-bold uppercase text-amber-500 hover:underline block"
          >
            {activeTab === 'receivables' ? 'Ver todas' : 'Ver pendientes →'}
          </button>
        </div>

        {/* GANANCIA REAL NETA (ÚNICO MONTO AL QUE SE LE RESTAN LAS CUENTAS POR COBRAR) */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Ganancia Real Neta
            </span>
            <TrendingUp className="size-5 text-blue-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-blue-400">
            ${financialMetrics.netRealProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="mt-1 block text-[10px] font-bold text-neutral-500">
            Menos mant., comisiones y por cobrar
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Mantenimiento Pendiente
            </span>
            <Wrench className="size-5 text-rose-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-rose-400">
            ${financialMetrics.phantomMaintenancePending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="mt-1 block text-[10px] font-bold text-neutral-500">
            Pagado: ${financialMetrics.totalPaidMaintenance.toFixed(2)}
          </span>
        </div>

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
            Promedio por venta
          </span>
        </div>
      </div>

      {/* PESTAÑAS Y FILTROS */}
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-lg px-4 py-2 text-xs font-bold uppercase transition ${
              activeTab === 'all'
                ? 'bg-red-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Todas las Ventas
          </button>
          <button
            onClick={() => setActiveTab('receivables')}
            className={`rounded-lg px-4 py-2 text-xs font-bold uppercase transition flex items-center gap-1.5 ${
              activeTab === 'receivables'
                ? 'bg-amber-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Clock className="size-3.5" /> Cuentas por Cobrar
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por asesor o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition focus:border-emerald-500"
          />
        </div>
      </div>

      {/* HISTORIAL DE TRANSACCIONES */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-neutral-800 p-4">
          <h2 className="font-heading text-sm font-black uppercase tracking-widest text-neutral-200">
            {activeTab === 'receivables' ? 'CUENTAS PENDIENTES POR COBRAR' : 'HISTORIAL DE TRANSACCIONES'} ({filteredSales.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-bold uppercase text-neutral-500">
            Cargando registros financieros...
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold uppercase text-neutral-500">
            No se encontraron transacciones en esta sección.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-800 bg-neutral-950/60 text-[10px] uppercase tracking-widest text-neutral-400">
                <tr>
                  <th className="p-4">Fecha & Hora</th>
                  <th className="p-4">Detalle / Producto</th>
                  <th className="p-4">Asesor</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Cantidad</th>
                  <th className="p-4 text-right">Monto Total</th>
                  <th className="p-4 text-center">Acción Cobro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredSales.map((sale) => {
                  const isPending = sale.payment_status === 'por_cobrar'

                  return (
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
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                            isPending
                              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {isPending ? 'Por Cobrar' : 'Cobrada'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-neutral-300">
                        {sale.quantity || 1}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-emerald-400">
                        ${(Number(sale.total_price) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleTogglePaymentStatus(sale.id, sale.payment_status)}
                          className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                            isPending
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          }`}
                          title="Cambiar estado de cobro"
                        >
                          {isPending ? 'Marcar Cobrada' : 'Marcar Pendiente'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL INGRESO DIRECTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-heading text-lg font-black uppercase tracking-wider text-white">
                Registrar Ingreso Manual
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDirectSale} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                  Monto ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                  Nombre del Asesor / Responsable
                </label>
                <input
                  type="text"
                  placeholder="Ej: Angel Serrano"
                  value={advisorName}
                  onChange={(e) => setAdvisorName(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 rounded-xl border border-neutral-800 py-3 font-heading text-xs font-bold uppercase text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 rounded-xl bg-emerald-600 py-3 font-heading text-xs font-black uppercase text-white hover:bg-emerald-500 transition disabled:opacity-50 shadow-lg shadow-emerald-600/35"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PAGO DE MANTENIMIENTO */}
      {isMaintenanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-heading text-lg font-black uppercase tracking-wider text-white">
                Registrar Pago de Mantenimiento
              </h3>
              <button onClick={() => setIsMaintenanceModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="size-5" />
              </button>
            </div>

            <div className="text-xs text-neutral-400 space-y-1">
              <p>
                Mantenimiento pendiente:{' '}
                <strong className="text-rose-400 font-mono">${financialMetrics.phantomMaintenancePending.toFixed(2)}</strong>
              </p>
              <p className="text-[10px] text-neutral-500 uppercase font-bold">
                Responsable asignado: Victor Diaz
              </p>
            </div>

            <form onSubmit={handleRegisterMaintenancePayment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                  Monto Pagado ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={maintenanceAmount}
                  onChange={(e) => setMaintenanceAmount(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-sm font-bold text-rose-400 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                  Número de Referencia / Comprobante
                </label>
                <input
                  type="text"
                  placeholder="Ej: REF-12345678"
                  value={maintenanceRef}
                  onChange={(e) => setMaintenanceRef(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="w-1/2 rounded-xl border border-neutral-800 py-3 font-heading text-xs font-bold uppercase text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMaintenance}
                  className="w-1/2 rounded-xl bg-rose-600 py-3 font-heading text-xs font-black uppercase text-white hover:bg-rose-700 transition disabled:opacity-50 shadow-lg shadow-rose-600/35"
                >
                  {isSubmittingMaintenance ? 'Registrando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PAGO DE COMISIÓN */}
      {isCommissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-heading text-lg font-black uppercase tracking-wider text-white">
                Registrar Pago de Comisión
              </h3>
              <button onClick={() => setIsCommissionModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                  Seleccionar Asesor
                </label>
                <select
                  value={selectedCommissionAdvisor}
                  onChange={(e) => setSelectedCommissionAdvisor(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs font-bold uppercase text-white outline-none focus:border-amber-500"
                >
                  {advisors.map((adv) => (
                    <option key={adv.id || adv.name} value={adv.name}>
                      {adv.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-xs space-y-1">
                <span className="text-neutral-400 uppercase font-bold text-[10px]">Comisión Pendiente por Pagar:</span>
                <p className="font-mono text-lg font-black text-amber-400">
                  ${(advisorCommissionsOwed[selectedCommissionAdvisor]?.pending || 0).toFixed(2)}
                </p>
              </div>

              <form onSubmit={handleRegisterCommissionPayment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                    Monto a Pagar ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={commissionAmount}
                    onChange={(e) => setCommissionAmount(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-sm font-black text-amber-400 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                    Número de Referencia / Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: REF-98765432"
                    value={commissionRef}
                    onChange={(e) => setCommissionRef(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCommissionModalOpen(false)}
                    className="w-1/2 rounded-xl border border-neutral-800 py-3 font-heading text-xs font-bold uppercase text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCommission}
                    className="w-1/2 rounded-xl bg-amber-600 py-3 font-heading text-xs font-black uppercase text-white hover:bg-amber-700 transition disabled:opacity-50 shadow-lg shadow-amber-600/35"
                  >
                    {isSubmittingCommission ? 'Registrando...' : 'Confirmar Pago'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
