'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  DollarSign,
  UserCheck,
  Package
} from 'lucide-react'
import Image from 'next/image'
import { ProductItem, InventoryVariant } from '@/lib/types'
import { ADVISORS as DEFAULT_ADVISORS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface CartItem {
  product: ProductItem
  variant: InventoryVariant
  quantity: number
}

export default function POSPage() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [advisors, setAdvisors] = useState<{ id: string; name: string }[]>(DEFAULT_ADVISORS)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Carrito de compras
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>(DEFAULT_ADVISORS[0]?.name || '')
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo')
  const [customTotal, setCustomTotal] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null)
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false)

  // Modal para seleccionar talla cuando se hace clic en un producto
  const [activeProductForVariant, setActiveProductForVariant] = useState<ProductItem | null>(null)

  // Cargar productos y asesores
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*, inventory(*)')
        .order('created_at', { ascending: false })

      if (prodError) throw prodError
      if (prodData) setProducts(prodData as ProductItem[])

      // Intentar cargar asesores de Supabase si existe la tabla, sino usar defaults
      const { data: advData, error: advError } = await supabase
        .from('advisors')
        .select('*')

      if (!advError && advData && advData.length > 0) {
        setAdvisors(advData)
        setSelectedAdvisor(advData[0].name)
      }
    } catch (error) {
      console.error('Error cargando datos POS:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

  // Agregar al carrito
  const handleAddToCart = (product: ProductItem, variant: InventoryVariant) => {
    if (variant.stock <= 0) return

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.variant.id === variant.id
      )

      if (existingIndex > -1) {
        const updated = [...prev]
        const currentQty = updated[existingIndex].quantity
        if (currentQty < variant.stock) {
          updated[existingIndex].quantity += 1
        }
        return updated
      } else {
        return [...prev, { product, variant, quantity: 1 }]
      }
    })
    setActiveProductForVariant(null)
  }

  // Modificar cantidad en carrito
  const handleUpdateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev]
      const item = updated[index]
      const newQty = item.quantity + delta

      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index)
      } else if (newQty <= item.variant.stock) {
        item.quantity = newQty
      }
      return updated
    })
  }

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  // Cálculo del total del carrito
  const calculatedSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.product.price) || 0) * item.quantity, 0)
  }, [cart])

  const finalAmountToPay = customTotal !== '' ? Number(customTotal) || 0 : calculatedSubtotal

  // Procesar Venta POS
  const handleProcessSale = async () => {
    if (cart.length === 0) return
    setIsProcessing(true)

    try {
      const saleDate = new Date().toISOString()
      const totalUnits = cart.reduce((sum, i) => sum + i.quantity, 0)
      
      // Registrar en sales cada línea o una venta agrupada
      for (const item of cart) {
        const itemTotal = (Number(item.product.price) || 0) * item.quantity

        await supabase.from('sales').insert({
          product_id: item.product.id,
          advisor_name: selectedAdvisor || 'General',
          total_price: itemTotal,
          quantity: item.quantity,
          created_at: saleDate,
        })

        // Restar stock de la variante
        const newStock = Math.max(0, item.variant.stock - item.quantity)
        if (item.variant.id) {
          await supabase
            .from('inventory')
            .update({ stock: newStock })
            .eq('id', item.variant.id)
        }
      }

      const completedSaleData = {
        id: Math.random().toString(36).substring(7).toUpperCase(),
        date: new Date().toLocaleString(),
        advisor: selectedAdvisor,
        paymentMethod,
        items: [...cart],
        subtotal: calculatedSubtotal,
        total: finalAmountToPay,
      }

      setLastCompletedSale(completedSaleData)
      setShowReceiptModal(true)
      setCart([])
      setCustomTotal('')
      await fetchData()
    } catch (error) {
      console.error('Error procesando venta POS:', error)
      alert('Ocurrió un error al procesar la venta.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Imprimir Factura / Comprobante
  const handlePrintReceipt = () => {
    window.print()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* COLUMNA IZQUIERDA: CATÁLOGO DE PRODUCTOS (POS GRID) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              PUNTO DE VENTA (POS)
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Selecciona productos para agregar al carrito de cobro rápido
            </p>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA Y CATEGORÍAS */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-xs font-semibold text-white placeholder-neutral-500 outline-none focus:border-red-600 transition"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-xs font-bold uppercase text-neutral-300 outline-none focus:border-red-600 transition"
          >
            <option value="all">Todas las Categorías</option>
            <option value="zapatillas">Zapatillas</option>
            <option value="perfumes">Perfumes</option>
            <option value="accesorios">Accesorios</option>
          </select>
        </div>

        {/* GRID DE PRODUCTOS */}
        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold uppercase text-neutral-500">
            Cargando catálogo POS...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold uppercase text-neutral-500">
            No se encontraron productos disponibles.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[650px] overflow-y-auto pr-2">
            {filteredProducts.map((product) => {
              const totalStock = product.inventory?.reduce((acc, i) => acc + (i.stock || 0), 0) || 0
              const isOutOfStock = totalStock <= 0

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && setActiveProductForVariant(product)}
                  className={`group relative flex flex-col justify-between rounded-2xl border bg-neutral-900/40 p-3 backdrop-blur-md transition-all ${
                    isOutOfStock
                      ? 'border-neutral-800 opacity-40 cursor-not-allowed'
                      : 'border-neutral-800 hover:border-red-600 cursor-pointer hover:bg-neutral-900/80 hover:shadow-lg hover:shadow-red-950/20 active:scale-[0.98]'
                  }`}
                >
                  <div>
                    <div className="relative h-32 w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 mb-3">
                      <Image
                        src={product.image || '/placeholder.png'}
                        alt={product.name}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="font-heading text-[10px] font-black uppercase text-red-500 bg-black/80 px-2 py-1 rounded">
                            Agotado
                          </span>
                        </div>
                      )}
                    </div>

                    <h4 className="font-heading text-xs font-black uppercase tracking-wide text-white line-clamp-1">
                      {product.name}
                    </h4>
                    <p className="text-[10px] uppercase text-neutral-400 font-semibold">
                      {product.category}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-800/80">
                    <span className="font-mono text-sm font-black text-emerald-400">
                      ${product.price}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-neutral-400">
                      Stock: {totalStock}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* COLUMNA DERECHA: CARRITO Y FACTURACIÓN */}
      <div className="lg:col-span-5 space-y-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md flex flex-col justify-between min-h-[650px] shadow-2xl">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-5 text-red-500" />
                <h3 className="font-heading text-base font-black uppercase tracking-wider text-white">
                  Factura Actual
                </h3>
              </div>
              <span className="rounded-full bg-red-600/20 border border-red-500/30 px-2.5 py-0.5 font-mono text-xs font-bold text-red-400">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} ítems
              </span>
            </div>

            {/* SELECCIÓN DE ASESOR */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                <UserCheck className="size-3.5 text-red-500" /> Asesor Responsable
              </label>
              <select
                value={selectedAdvisor}
                onChange={(e) => setSelectedAdvisor(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-xs font-bold uppercase text-white outline-none focus:border-red-600 transition"
              >
                {advisors.map((adv) => (
                  <option key={adv.id || adv.name} value={adv.name}>
                    {adv.name}
                  </option>
                ))}
              </select>
            </div>

            {/* MÉTODO DE PAGO */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Método de Pago
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
                  { id: 'Pago Móvil', label: 'Pago Móvil', icon: Smartphone },
                  { id: 'Zelle', label: 'Zelle', icon: CreditCard },
                  { id: 'Binance', label: 'Binance', icon: DollarSign },
                ].map((m) => {
                  const Icon = m.icon
                  const active = paymentMethod === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold uppercase transition ${
                        active
                          ? 'border-red-600 bg-red-600/15 text-white shadow-sm'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Icon className={`size-4 ${active ? 'text-red-500' : 'text-neutral-500'}`} />
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* LISTA DE ÍTEMS EN EL CARRITO */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Productos Seleccionados
              </label>
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-xs font-bold uppercase text-neutral-500">
                    El carrito está vacío. Haz clic en un producto para agregarlo.
                  </div>
                ) : (
                  cart.map((item, idx) => {
                    const itemTotal = (Number(item.product.price) || 0) * item.quantity
                    return (
                      <div
                        key={`${item.product.id}-${item.variant.id}-${idx}`}
                        className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 p-2.5"
                      >
                        <div className="flex-1 pr-2">
                          <h5 className="font-bold text-xs uppercase text-white line-clamp-1">
                            {item.product.name}
                          </h5>
                          <span className="font-mono text-[10px] text-neutral-400">
                            Talla/Var: <strong className="text-red-400">{item.variant.size_or_detail}</strong> | ${item.product.price} c/u
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
                            <button
                              onClick={() => handleUpdateQuantity(idx, -1)}
                              className="p-1 text-neutral-400 hover:text-white"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="font-mono text-xs font-bold px-1.5 text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(idx, 1)}
                              className="p-1 text-neutral-400 hover:text-white"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>

                          <span className="font-mono text-xs font-black text-emerald-400 w-16 text-right">
                            ${itemTotal.toFixed(2)}
                          </span>

                          <button
                            onClick={() => handleRemoveCartItem(idx)}
                            className="p-1 text-neutral-500 hover:text-red-500 transition"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* TOTALES Y BOTÓN DE COBRO */}
          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-neutral-400">
                <span>Subtotal Calculado:</span>
                <span className="font-mono text-white">${calculatedSubtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-black uppercase text-white">Monto Total ($):</span>
                <input
                  type="number"
                  step="0.01"
                  value={customTotal}
                  placeholder={calculatedSubtotal.toFixed(2)}
                  onChange={(e) => setCustomTotal(e.target.value)}
                  className="w-32 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-sm font-black text-emerald-400 text-right outline-none focus:border-red-600"
                />
              </div>
            </div>

            <button
              onClick={handleProcessSale}
              disabled={cart.length === 0 || isProcessing}
              className="w-full rounded-2xl bg-red-600 py-4 font-heading text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-40"
            >
              {isProcessing ? 'Procesando Venta...' : 'Completar Venta y Cobrar'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL SELECCIÓN DE VARIANTE / TALLA AL HACER CLIC EN PRODUCTO */}
      {activeProductForVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-[#0c0c0e] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-heading text-sm font-black uppercase tracking-wider text-white">
                Selecciona Talla / Variante
              </h3>
              <button
                onClick={() => setActiveProductForVariant(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400 font-medium">
              Producto: <strong className="text-white">{activeProductForVariant.name}</strong>
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {activeProductForVariant.inventory?.filter((i) => i.stock > 0).length === 0 ? (
                <p className="p-4 text-center text-xs italic text-neutral-500">
                  No hay stock disponible para este producto.
                </p>
              ) : (
                activeProductForVariant.inventory
                  ?.filter((i) => i.stock > 0)
                  .map((inv) => (
                    <button
                      key={inv.id || inv.size_or_detail}
                      onClick={() => handleAddToCart(activeProductForVariant, inv)}
                      className="w-full flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 transition hover:border-red-600 hover:bg-neutral-900 group"
                    >
                      <span className="font-mono text-xs font-bold uppercase text-white">
                        Talla / Detalle: {inv.size_or_detail}
                      </span>
                      <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1 rounded-lg">
                        Stock: {inv.stock} uds
                      </span>
                    </button>
                  ))
              )}
            </div>

            <button
              onClick={() => setActiveProductForVariant(null)}
              className="w-full rounded-xl border border-neutral-800 py-3 text-xs font-bold uppercase text-neutral-400 hover:bg-neutral-800 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE RECIBO / FACTURA EXITOSA CON OPCIÓN DE IMPRESIÓN */}
      {showReceiptModal && lastCompletedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative my-auto w-full max-w-lg rounded-3xl border border-neutral-800 bg-white p-8 text-neutral-900 shadow-2xl space-y-6">
            
            {/* CONTENIDO DE FACTURA (IMPRIMIBLE) */}
            <div id="printable-receipt" className="space-y-6">
              <div className="text-center border-b border-neutral-200 pb-4 space-y-1">
                <div className="inline-block px-3 py-1 bg-red-600 text-white font-black text-sm uppercase rounded-lg mb-1">
                  REALITY SHOP
                </div>
                <h2 className="text-xl font-black uppercase tracking-wider text-black">
                  Comprobante de Venta
                </h2>
                <p className="text-xs text-neutral-500 font-mono">Factura ID: #{lastCompletedSale.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-neutral-500 uppercase text-[10px] font-bold">Fecha y Hora:</span>
                  <strong className="font-mono text-black">{lastCompletedSale.date}</strong>
                </div>
                <div>
                  <span className="block text-neutral-500 uppercase text-[10px] font-bold">Asesor de Venta:</span>
                  <strong className="text-black">{lastCompletedSale.advisor}</strong>
                </div>
                <div>
                  <span className="block text-neutral-500 uppercase text-[10px] font-bold">Método de Pago:</span>
                  <strong className="text-black">{lastCompletedSale.paymentMethod}</strong>
                </div>
              </div>

              <div className="border-t border-b border-neutral-200 py-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 text-[10px] uppercase font-bold">
                      <th className="pb-2 text-left">Producto</th>
                      <th className="pb-2 text-center">Talla</th>
                      <th className="pb-2 text-center">Cant</th>
                      <th className="pb-2 text-right">Precio U.</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {lastCompletedSale.items.map((item: any, idx: number) => {
                      const itemTot = (Number(item.product.price) || 0) * item.quantity
                      return (
                        <tr key={idx} className="font-mono">
                          <td className="py-2.5 font-bold uppercase text-black">{item.product.name}</td>
                          <td className="py-2.5 text-center">{item.variant.size_or_detail}</td>
                          <td className="py-2.5 text-center">{item.quantity}</td>
                          <td className="py-2.5 text-right">${Number(item.product.price).toFixed(2)}</td>
                          <td className="py-2.5 text-right font-black">${itemTot.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black uppercase text-black">Monto Total Factura:</span>
                <span className="text-xl font-mono font-black text-red-600">
                  ${lastCompletedSale.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN (NO SE IMPRIMEN SI SE CONFIGURA CSS PRINT, PERO ÚTILES EN PANTALLA) */}
            <div className="flex gap-3 pt-4 border-t border-neutral-200">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-black transition"
              >
                <Printer className="size-4" /> Imprimir / Descargar PDF
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-6 rounded-xl border border-neutral-300 py-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
