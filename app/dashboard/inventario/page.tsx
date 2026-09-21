'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Search, Filter, Layers, PackageCheck, AlertTriangle } from 'lucide-react'
import { InventoryTable } from '@/components/admin/inventory-table'
import { ProductModal } from '@/components/admin/modals/product-modal'
import { SaleModal } from '@/components/admin/modals/sale-modal'
import { ProductItem, InventoryVariant } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function InventoryPage() {
  // 1. ESTADOS DE DATOS Y CARGA
  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // 2. FILTROS Y BÚSQUEDA
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedGender, setSelectedGender] = useState<string>('all')

  // 3. ESTADOS DE MODALES
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)
  const [isSaleModalOpen, setIsSaleModalOpen] = useState<boolean>(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [selectedProductForSale, setSelectedProductForSale] = useState<ProductItem | null>(null)
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('')
  const [saleItems, setSaleItems] = useState<Record<string, number>>({})
  const [isProcessingSale, setIsProcessingSale] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // 4. ESTADO DE FORMULARIO E IMAGEN (Con Costo y % Ganancia)
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'zapatillas' as ProductItem['category'],
    subcategory: '',
    cost_price: '' as number | '',
    profit_margin: '' as number | '',
    price: '' as number | '',
    gender: 'caballeros' as 'caballeros' | 'damas' | 'niños',
  })
  const [variants, setVariants] = useState<InventoryVariant[]>([
    { size_or_detail: '', stock: 0 },
  ])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // 5. CARGAR INVENTARIO COMPLETO
  const fetchInventoryData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, inventory(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setProducts(data as ProductItem[])
    } catch (error) {
      console.error('Error cargando inventario:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])

  // 6. FILTRADO DINÁMICO DE PRODUCTOS
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.subcategory && product.subcategory.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory

      const matchesGender =
        selectedGender === 'all' || product.gender === selectedGender

      return matchesSearch && matchesCategory && matchesGender
    })
  }, [products, searchTerm, selectedCategory, selectedGender])

  // METRICAS RÁPIDAS DEL CATÁLOGO
  const catalogMetrics = useMemo(() => {
    let totalStock = 0
    let outOfStockCount = 0
    let totalValue = 0

    products.forEach((prod) => {
      const prodStock = prod.inventory?.reduce((acc, item) => acc + (item.stock || 0), 0) || 0
      totalStock += prodStock
      totalValue += prodStock * (Number(prod.price) || 0)
      if (prodStock === 0) outOfStockCount++
    })

    return { totalProducts: products.length, totalStock, outOfStockCount, totalValue }
  }, [products])

  // 7. HANDLERS DE FORMULARIO Y EDICIÓN
  const handleOpenCreateModal = () => {
    setEditingProductId(null)
    setProductForm({
      name: '',
      category: 'zapatillas',
      subcategory: '',
      cost_price: '',
      profit_margin: '',
      price: '',
      gender: 'caballeros',
    })
    setVariants([{ size_or_detail: '', stock: 0 }])
    setImagePreview(null)
    setSelectedFile(null)
    setIsAddModalOpen(true)
  }

  const handleOpenEditModal = (product: ProductItem) => {
    const prod = product as ProductItem & {
      inventory?: InventoryVariant[]
      image?: string
      image_url?: string
      cost_price?: number
      profit_margin?: number
    }

    setEditingProductId(prod.id)
    setProductForm({
      name: prod.name,
      category: prod.category,
      subcategory: prod.subcategory || '',
      cost_price: prod.cost_price ?? '',
      profit_margin: prod.profit_margin ?? '',
      price: prod.price,
      gender: prod.gender || 'caballeros',
    })
    setVariants(
      prod.inventory && prod.inventory.length > 0
        ? prod.inventory
        : [{ size_or_detail: '', stock: 0 }]
    )

    setImagePreview(prod.image || prod.image_url || null)
    setSelectedFile(null)
    setIsAddModalOpen(true)
  }

  const handleOpenSaleModal = (product: ProductItem) => {
    setSelectedProductForSale(product)
    setSaleItems({})
    setSelectedAdvisor('')
    setIsSaleModalOpen(true)
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto del inventario?')) return

    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      await fetchInventoryData()
    } catch (error) {
      alert('Error al eliminar producto')
      console.error(error)
    }
  }

  const handleCategoryChange = (cat: ProductItem['category']) => {
    setProductForm((prev) => ({ ...prev, category: cat }))
  }

  const handleVariantChange = (
    index: number,
    field: keyof InventoryVariant,
    value: string
  ) => {
    const updated = [...variants]
    if (field === 'stock') {
      updated[index][field] = Number(value) || 0
    } else {
      updated[index][field] = value
    }
    setVariants(updated)
  }

  const handleAddVariant = () => {
    setVariants((prev) => [...prev, { size_or_detail: '', stock: 0 }])
  }

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSaleQuantityChange = (key: string, qty: number, maxStock: number) => {
    setSaleItems((prev) => ({
      ...prev,
      [key]: Math.min(Math.max(0, qty), maxStock),
    }))
  }

  const handleConfirmSale = async () => {
    if (!selectedProductForSale) return
    setIsProcessingSale(true)

    try {
      let totalSaleAmount = 0
      let totalUnitsSoldInSale = 0

      for (const [variantId, qty] of Object.entries(saleItems)) {
        if (qty > 0) {
          totalSaleAmount += (Number(selectedProductForSale.price) || 0) * qty
          totalUnitsSoldInSale += qty

          const productWithInventory = selectedProductForSale as ProductItem & { inventory?: InventoryVariant[] }
          const variant = productWithInventory.inventory?.find((v: InventoryVariant) => v.id === variantId)
          if (variant) {
            const newStock = Math.max(0, (variant.stock || 0) - qty)
            await supabase
              .from('inventory')
              .update({ stock: newStock })
              .eq('id', variantId)
          }
        }
      }

      await supabase.from('sales').insert({
        product_id: selectedProductForSale.id,
        advisor_name: selectedAdvisor || 'General',
        total_price: totalSaleAmount,
        quantity: totalUnitsSoldInSale,
        created_at: new Date().toISOString(),
      })

      await fetchInventoryData()
      setIsSaleModalOpen(false)
    } catch (error) {
      console.error('Error procesando la venta:', error)
      alert('Ocurrió un error al procesar la venta.')
    } finally {
      setIsProcessingSale(false)
    }
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let imageUrl = imagePreview

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, selectedFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(filePath)

        imageUrl = publicUrlData.publicUrl
      }

      let productId = editingProductId

      // CÁLCULO DEL PRECIO FINAL
      const cost = Number(productForm.cost_price) || 0
      const margin = Number(productForm.profit_margin) || 0
      const calculatedPrice = cost > 0 ? Math.round((cost + (cost * margin / 100)) * 100) / 100 : Number(productForm.price) || 0

      const productPayload = {
        name: productForm.name,
        category: productForm.category,
        subcategory: productForm.subcategory,
        cost_price: cost,
        profit_margin: margin,
        price: calculatedPrice,
        gender: productForm.gender,
        image: imageUrl,
      }

      if (editingProductId) {
        const { error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', editingProductId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(productPayload)
          .select()
          .single()

        if (error) throw error
        productId = data.id
      }

      if (productId) {
        for (const variant of variants) {
          if (variant.size_or_detail) {
            if (variant.id) {
              await supabase
                .from('inventory')
                .update({ size_or_detail: variant.size_or_detail, stock: variant.stock })
                .eq('id', variant.id)
            } else {
              await supabase
                .from('inventory')
                .insert({
                  product_id: productId,
                  size_or_detail: variant.size_or_detail,
                  stock: variant.stock,
                })
            }
          }
        }
      }

      await fetchInventoryData()
      setIsAddModalOpen(false)
    } catch (error) {
      console.error('Error al guardar el producto:', error)
      alert('Error al guardar el producto')
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
            GESTIÓN DE INVENTARIO Y CATÁLOGO
          </h1>
          <p className="text-xs font-semibold uppercase text-neutral-400">
            Control de mercancía, existencias y variantes registradas
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-heading text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-700"
        >
          <Plus className="size-4" />
          Agregar Nuevo Producto
        </button>
      </div>

      {/* TARJETAS RÁPIDAS DE ESTADO DEL CATÁLOGO */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Modelos Registrados
            </span>
            <Layers className="size-5 text-red-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-white">{catalogMetrics.totalProducts}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Unidades en Stock
            </span>
            <PackageCheck className="size-5 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-emerald-400">{catalogMetrics.totalStock}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Productos Agotados
            </span>
            <AlertTriangle className="size-5 text-amber-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-amber-400">{catalogMetrics.outOfStockCount}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Valor del Catálogo
            </span>
            <span className="font-mono text-xs font-black text-neutral-400">USD</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-white">
            ${catalogMetrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-xs font-semibold text-white placeholder-neutral-500 outline-none focus:border-red-600 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-neutral-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-bold uppercase text-neutral-300 outline-none focus:border-red-600 transition"
            >
              <option value="all">Todas las Categorías</option>
              <option value="zapatillas">Zapatillas</option>
              <option value="ropa">Ropa</option>
              <option value="accesorios">Accesorios</option>
            </select>
          </div>

          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-bold uppercase text-neutral-300 outline-none focus:border-red-600 transition"
          >
            <option value="all">Todos los Géneros</option>
            <option value="caballeros">Caballeros</option>
            <option value="damas">Damas</option>
            <option value="niños">Niños</option>
          </select>
        </div>
      </div>

      {/* TABLA DEL INVENTARIO */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md">
        <InventoryTable
          products={filteredProducts}
          isLoading={isLoading}
          onEdit={handleOpenEditModal}
          onSale={handleOpenSaleModal}
          onDelete={handleDeleteProduct}
          showNewBadge={true}
        />
      </div>

      {/* MODALES */}
      <SaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        product={selectedProductForSale}
        selectedAdvisor={selectedAdvisor}
        setSelectedAdvisor={setSelectedAdvisor}
        saleItems={saleItems}
        onQuantityChange={handleSaleQuantityChange}
        onConfirmSale={handleConfirmSale}
        isProcessing={isProcessingSale}
      />

      <ProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        editingProductId={editingProductId}
        productForm={productForm}
        setProductForm={setProductForm}
        variants={variants}
        handleCategoryChange={handleCategoryChange}
        handleVariantChange={handleVariantChange}
        handleAddVariant={handleAddVariant}
        handleRemoveVariant={handleRemoveVariant}
        imagePreview={imagePreview}
        handleImageChange={handleImageChange}
        handleSubmit={handleProductSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}