'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import { X, Plus, Loader2 } from 'lucide-react'
import { ProductItem, InventoryVariant } from '@/lib/types'
import { SUBCATEGORIES } from '@/lib/constants'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  editingProductId: string | null
  productForm: {
    name: string
    category: ProductItem['category']
    subcategory: string
    cost_price?: number | ''
    profit_margin?: number | ''
    price: number | ''
    gender: 'caballeros' | 'damas' | 'niños'
  }
  setProductForm: React.Dispatch<React.SetStateAction<any>>
  variants: InventoryVariant[]
  handleCategoryChange: (cat: ProductItem['category']) => void
  handleVariantChange: (index: number, field: keyof InventoryVariant, value: string) => void
  handleAddVariant: () => void
  handleRemoveVariant: (index: number) => void
  imagePreview: string | null
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}

export function ProductModal({
  isOpen,
  onClose,
  editingProductId,
  productForm,
  setProductForm,
  variants,
  handleCategoryChange,
  handleVariantChange,
  handleAddVariant,
  handleRemoveVariant,
  imagePreview,
  handleImageChange,
  handleSubmit,
  isSubmitting,
}: ProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Asegura que siempre exista una subcategoría seleccionada al abrir o cambiar la categoría
  useEffect(() => {
    if (isOpen && productForm.category) {
      const availableSubs = SUBCATEGORIES[productForm.category] || []
      if (availableSubs.length > 0 && !availableSubs.includes(productForm.subcategory)) {
        setProductForm((prev: any) => ({
          ...prev,
          subcategory: availableSubs[0],
        }))
      }
    }
  }, [isOpen, productForm.category, productForm.subcategory, setProductForm])

  if (!isOpen) return null

  const onCategorySelectChange = (newCategory: ProductItem['category']) => {
    handleCategoryChange(newCategory)
    const firstSub = SUBCATEGORIES[newCategory]?.[0] || ''
    setProductForm((prev: any) => ({
      ...prev,
      category: newCategory,
      subcategory: firstSub,
    }))
  }

  // Manejador para calcular automáticamente el precio según Costo y Ganancia %
  const handleFinancialChange = (costVal: number | '', marginVal: number | '') => {
    const cost = Number(costVal) || 0
    const margin = Number(marginVal) || 0

    if (cost > 0) {
      const calculatedPrice = cost + cost * (margin / 100)
      setProductForm((prev: any) => ({
        ...prev,
        cost_price: costVal,
        profit_margin: marginVal,
        price: Number(calculatedPrice.toFixed(2)),
      }))
    } else {
      setProductForm((prev: any) => ({
        ...prev,
        cost_price: costVal,
        profit_margin: marginVal,
      }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-[820px] rounded-[32px] border border-neutral-800 bg-[#0c0c0e] p-8 shadow-2xl">
        <button
          onClick={onClose}
          type="button"
          className="absolute right-6 top-6 text-neutral-400 hover:text-white"
        >
          <X className="size-5" />
        </button>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-8 md:grid-cols-12">
          {/* COLUMNA IZQUIERDA: IMAGEN */}
          <div className="md:col-span-5">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-[360px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-neutral-700 bg-[#060608] p-6 text-center transition-colors hover:border-red-600"
            >
              {imagePreview ? (
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-neutral-400">
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3 text-neutral-300">
                    <Plus className="size-6" />
                  </div>
                  <span className="text-xs font-medium">Subir Imagen del Producto</span>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: FORMULARIO */}
          <div className="space-y-4 md:col-span-7">
            <h3 className="font-heading text-lg font-black uppercase tracking-wider text-white">
              {editingProductId ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </h3>

            {/* NOMBRE */}
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Nombre
              </label>
              <input
                type="text"
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-red-600 focus:outline-none"
                placeholder="Ej. Nike Air Force 1"
              />
            </div>

            {/* CATEGORÍA Y SUBCATEGORÍA */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Categoría
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) =>
                    onCategorySelectChange(e.target.value as ProductItem['category'])
                  }
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-red-600 focus:outline-none"
                >
                  <option value="zapatillas">Zapatillas</option>
                  <option value="perfumes">Perfumes</option>
                  <option value="accesorios">Accesorios</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Subcategoría
                </label>
                <select
                  value={productForm.subcategory}
                  onChange={(e) =>
                    setProductForm({ ...productForm, subcategory: e.target.value })
                  }
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm capitalize text-white focus:border-red-600 focus:outline-none"
                >
                  {SUBCATEGORIES[productForm.category]?.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* BLOQUE FINANCIERO: COSTO, MARGEN DE GANANCIA Y PRECIO DE VENTA */}
            <div className="rounded-2xl border border-neutral-800/80 bg-[#060608] p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Costo Compra ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={productForm.cost_price ?? ''}
                    onChange={(e) =>
                      handleFinancialChange(
                        e.target.value === '' ? '' : Number(e.target.value),
                        productForm.profit_margin ?? ''
                      )
                    }
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-blue-400">
                    Ganancia (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 40"
                    value={productForm.profit_margin ?? ''}
                    onChange={(e) =>
                      handleFinancialChange(
                        productForm.cost_price ?? '',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono font-bold text-blue-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Precio Venta ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        price: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono font-bold text-white focus:border-red-600 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Género
                  </label>
                  <select
                    value={productForm.gender}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        gender: e.target.value as 'caballeros' | 'damas' | 'niños',
                      })
                    }
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-red-600 focus:outline-none"
                  >
                    <option value="caballeros">Caballeros</option>
                    <option value="damas">Damas</option>
                    <option value="niños">Niños</option>
                  </select>
                </div>
              </div>
            </div>

            {/* VARIANTES / TALLAS */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Variantes / Tallas & Stock
                </label>
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="flex items-center gap-1 text-xs font-bold text-red-500 hover:underline"
                >
                  <Plus className="size-3" /> Agregar variante
                </button>
              </div>

              <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                {variants.map((variant, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Talla / Variante (Ej. 41 / 100ml)"
                      value={variant.size_or_detail}
                      onChange={(e) =>
                        handleVariantChange(index, 'size_or_detail', e.target.value)
                      }
                      className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-red-600 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={variant.stock}
                      onChange={(e) =>
                        handleVariantChange(index, 'stock', e.target.value)
                      }
                      className="w-20 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white focus:border-red-600 focus:outline-none"
                    />
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="p-2 text-neutral-500 hover:text-red-500"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* BOTÓN SUBMIT */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full rounded-full bg-red-600 py-4 font-heading text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Guardando...
                </span>
              ) : editingProductId ? (
                'Guardar Cambios'
              ) : (
                'Crear Producto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}