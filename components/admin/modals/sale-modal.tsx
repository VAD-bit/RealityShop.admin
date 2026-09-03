'use client'

import { X, UserCheck, Loader2 } from 'lucide-react'
import { ProductItem } from '@/lib/types'
import { ADVISORS } from '@/lib/constants'

interface SaleModalProps {
  isOpen: boolean
  onClose: () => void
  product: ProductItem | null
  selectedAdvisor: string
  setSelectedAdvisor: (advisor: string) => void
  saleItems: Record<string, number>
  onQuantityChange: (key: string, qty: number, maxStock: number) => void
  onConfirmSale: () => void
  isProcessing: boolean
}

export function SaleModal({
  isOpen,
  onClose,
  product,
  selectedAdvisor,
  setSelectedAdvisor,
  saleItems,
  onQuantityChange,
  onConfirmSale,
  isProcessing,
}: SaleModalProps) {
  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-[540px] rounded-[32px] border border-neutral-800 bg-[#0c0c0e] p-6 shadow-2xl sm:p-8">
        <button onClick={onClose} className="absolute right-6 top-6 text-neutral-400 hover:text-white">
          <X className="size-5" />
        </button>

        <div className="space-y-6">
          <div>
            <h3 className="font-heading text-lg font-black uppercase tracking-wider text-white">
              Registrar Venta
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase text-neutral-400">
              Producto: <span className="text-white">{product.name}</span> (${product.price})
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-400">
              <UserCheck className="size-3.5 text-red-500" /> Selecciona el Asesor
            </label>
            <select
              value={selectedAdvisor}
              onChange={(e) => setSelectedAdvisor(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 font-heading text-xs font-black uppercase tracking-widest text-white shadow-md focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              {ADVISORS.map((advisor) => (
                <option key={advisor.id} value={advisor.name}>
                  {advisor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Selecciona Tallas / Variantes y Cantidad Vendida
            </label>

            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {product.inventory.filter((i) => i.stock > 0).length === 0 ? (
                <p className="p-2 text-xs italic text-neutral-500">
                  No hay stock disponible para vender.
                </p>
              ) : (
                product.inventory
                  .filter((inv) => inv.stock > 0)
                  .map((inv) => {
                    const key = inv.id || inv.size_or_detail
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-3"
                      >
                        <div>
                          <span className="block font-mono text-xs font-bold uppercase text-white">
                            Talla: {inv.size_or_detail}
                          </span>
                          <span className="block font-mono text-[10px] text-neutral-500">
                            Stock disponible: <strong className="text-red-400">{inv.stock}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-400">Cant:</span>
                          <input
                            type="number"
                            min="0"
                            max={inv.stock}
                            value={saleItems[key] || 0}
                            onChange={(e) =>
                              onQuantityChange(key, parseInt(e.target.value) || 0, inv.stock)
                            }
                            className="w-16 rounded-xl border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-center font-mono text-xs font-black text-emerald-400 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onConfirmSale}
            disabled={isProcessing}
            className="w-full rounded-full bg-emerald-600 py-4 font-heading text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> PROCESANDO VENTA...
              </span>
            ) : (
              'CONFIRMAR Y RESTAR DEL STOCK'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}