import { Package, DollarSign, ShoppingCart } from 'lucide-react'

interface MetricsCardsProps {
  totalRevenue: number
  potentialRevenue: number
  totalStockUnits: number
  salesCount: number
}

export function MetricsCards({
  totalRevenue,
  potentialRevenue,
  totalStockUnits,
  salesCount,
}: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Ingreso Generado / Potencial
          </p>
          <DollarSign className="size-5 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-500">${totalRevenue}</span>
          <span className="text-xs text-neutral-500">(Pot: ${potentialRevenue})</span>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Stock Total Disponible
          </p>
          <Package className="size-5 text-red-500" />
        </div>
        <p className="mt-2 text-2xl font-black text-white">
          {totalStockUnits} <span className="text-xs font-normal text-neutral-400">unidades</span>
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Unidades Vendidas
          </p>
          <ShoppingCart className="size-5 text-sky-500" />
        </div>
        <p className="mt-2 text-2xl font-black text-sky-500">{salesCount}</p>
      </div>
    </div>
  )
}