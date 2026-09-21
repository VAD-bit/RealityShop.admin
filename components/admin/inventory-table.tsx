'use client'

import Image from 'next/image'
import { Loader2, Pencil, CheckCircle, Trash2 } from 'lucide-react'
import { ProductItem } from '@/lib/types'

interface InventoryTableProps {
  products: ProductItem[]
  isLoading: boolean
  onEdit: (product: ProductItem) => void
  onSale: (product: ProductItem) => void
  onDelete: (id: string) => void
  showNewBadge?: boolean
}

export function InventoryTable({
  products,
  isLoading,
  onEdit,
  onSale,
  onDelete,
  showNewBadge = false,
}: InventoryTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-neutral-500">
        <Loader2 className="mr-2 size-6 animate-spin text-red-600" /> Cargando productos...
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-neutral-500">
        No hay productos registrados en el inventario.
      </div>
    )
  }

  // Validación para determinar si un producto tiene 30 días o menos de creado
  const isProductNew = (createdAt?: string) => {
    if (!createdAt) return false
    const createdDate = new Date(createdAt)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return createdDate >= thirtyDaysAgo
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-800 bg-neutral-950/60 text-[10px] uppercase tracking-widest text-neutral-400">
          <tr>
            <th className="p-4">Producto</th>
            <th className="p-4">Categoría / Marca</th>
            <th className="p-4">Género</th>
            <th className="p-4">Precio</th>
            <th className="p-4 text-center">Stock Total</th>
            <th className="p-4">Tallas / Variantes (Cantidad)</th>
            <th className="p-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {products.map((product) => {
            const totalProductStock = product.inventory.reduce(
              (sum, item) => sum + item.stock,
              0
            )

            const isNew = showNewBadge && isProductNew((product as any).created_at)

            return (
              <tr key={product.id} className="transition-colors hover:bg-neutral-800/30">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-visible">
                      <div className="relative size-12 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
                        <Image
                          src={product.image || '/hero-texture.png'}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* BADGE "NUEVO" SI APLICA */}
                      {isNew && (
                        <span className="absolute -right-1 -top-1.5 z-10 rounded-full border border-red-500/50 bg-red-600 px-1.5 py-0.5 font-heading text-[8px] font-black uppercase tracking-wider text-white shadow-md shadow-red-950/50">
                          NUEVO
                        </span>
                      )}
                    </div>

                    <span className="font-bold uppercase text-white">{product.name}</span>
                  </div>
                </td>
                <td className="p-4 capitalize">
                  <span className="inline-block rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-neutral-300">
                    {product.category} ({product.subcategory})
                  </span>
                </td>
                <td className="p-4 capitalize">
                  <span
                    className={`inline-block rounded-md border px-2.5 py-1 text-xs font-bold ${
                      product.gender === 'caballeros'
                        ? 'border-blue-900/50 bg-blue-950/30 text-blue-400'
                        : product.gender === 'damas'
                        ? 'border-pink-900/50 bg-pink-950/30 text-pink-400'
                        : product.gender === 'niños'
                        ? 'border-purple-900/50 bg-purple-950/30 text-purple-400'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-500'
                    }`}
                  >
                    {product.gender || 'N/A'}
                  </span>
                </td>
                <td className="p-4 font-black text-emerald-400">${product.price}</td>
                <td className="p-4 text-center">
                  <span
                    className={`inline-block rounded-md border px-3 py-1 font-mono text-xs font-extrabold ${
                      totalProductStock > 0
                        ? 'border-neutral-800 bg-neutral-950 text-white'
                        : 'border-red-900/50 bg-red-950/30 text-red-500'
                    }`}
                  >
                    {totalProductStock > 0 ? totalProductStock : 'AGOTADO'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {product.inventory.length > 0 ? (
                      product.inventory.map((inv, idx) => (
                        <span
                          key={inv.id || `${inv.size_or_detail}-${idx}`}
                          className={`inline-block rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${
                            inv.stock > 0
                              ? 'border-neutral-700/50 bg-neutral-800/80 text-neutral-200'
                              : 'border-red-900/30 bg-red-950/20 text-neutral-500 line-through'
                          }`}
                        >
                          {inv.size_or_detail}:{' '}
                          <span className={inv.stock > 0 ? 'text-red-400' : 'text-neutral-500'}>
                            {inv.stock} uds
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs italic text-neutral-500">Sin variantes</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(product)}
                      title="Editar producto"
                      className="inline-flex items-center justify-center rounded-lg border border-blue-900/40 bg-blue-950/30 p-2 text-blue-400 transition-colors hover:bg-blue-900/60 hover:text-white"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => onSale(product)}
                      disabled={totalProductStock <= 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-900/40 bg-emerald-950/50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 transition-colors hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CheckCircle className="size-3.5" /> Vendido
                    </button>
                    <button
                      onClick={() => onDelete(product.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-900/30 bg-neutral-950 p-2 text-neutral-400 transition-colors hover:border-red-600 hover:text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}