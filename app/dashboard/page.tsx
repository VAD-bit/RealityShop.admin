'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MetricsCards } from '@/components/admin/metrics-cards'
import { InventoryTable } from '@/components/admin/inventory-table'
import { ProductModal } from '@/components/admin/modals/product-modal'
import { SaleModal } from '@/components/admin/modals/sale-modal'
import { ProductItem, InventoryVariant } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function DashboardPage() {
  const router = useRouter()

  // 1. ESTADOS DE DATOS Y CARGA
  const [products, setProducts] = useState<ProductItem[]>([])
  const [recentProducts, setRecentProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // 2. ESTADOS DE MÉTRICAS (SOLO MES ACTUAL PARA RESUMEN)
  const [totalRevenue, setTotalRevenue] = useState<number>(0)
  const [potentialRevenue, setPotentialRevenue] = useState<number>(0)
  const [totalStockUnits, setTotalStockUnits] = useState<number>(0)
  const [salesCount, setSalesCount] = useState<number>(0)

  // 3. ESTADOS DE MODALES
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)
  const [isSaleModalOpen, setIsSaleModalOpen] = useState<boolean>(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [selectedProductForSale, setSelectedProductForSale] = useState<ProductItem | null>(null)
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('')
  const [saleItems, setSaleItems] = useState<Record<string, number>>({})
  const [isProcessingSale, setIsProcessingSale] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // 4. ESTADO DE FORMULARIO E IMAGEN
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'zapatillas' as ProductItem['category'],
    subcategory: '',
    price: '' as number | '',
    gender: 'caballeros' as 'caballeros' | 'damas' | 'niños',
  })
  const [variants, setVariants] = useState<InventoryVariant[]>([
    { size_or_detail: '', stock: 0 },
  ])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // 5. CARGA DE DATOS DE SUPABASE CON FILTRADO MENSUAL
  const fetchInventoryData = useCallback(async () => {
    setIsLoading(true)
    try {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
      const thirtyDaysAgoDate = new Date()
      thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30)

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, inventory(*)')
        .order('created_at', { ascending: false })

      if (productsError) throw productsError

      if (productsData) {
        setProducts(productsData as ProductItem[])

        let totalStock = 0
        let potentialVal = 0

        productsData.forEach((product: any) => {
          const productStock = product.inventory?.reduce(
            (sum: number, v: any) => sum + (v.stock || 0),
            0
          ) || 0
          
          totalStock += productStock
          potentialVal += (Number(product.price) || 0) * productStock
        })

        setTotalStockUnits(totalStock)
        setPotentialRevenue(potentialVal)

        const recent = (productsData as ProductItem[]).filter((product: any) => {
          const createdAt = new Date(product.created_at)
          return createdAt >= thirtyDaysAgoDate
        })
        setRecentProducts(recent)
      }

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', firstDayOfMonth)

      if (!salesError && salesData) {
        const totalUnitsSold = salesData.reduce(
          (sum: number, sale: any) => sum + (Number(sale.quantity) || 0),
          0
        )
        setSalesCount(totalUnitsSold)

        const totalRev = salesData.reduce(
          (sum: number, sale: any) => sum + (Number(sale.total_price) || 0),
          0
        )
        setTotalRevenue(totalRev)
      }
    } catch (error: any) {
      console.error('ERROR COMPLETO:', error)
      console.error('Mensaje:', error?.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])

  // 6. HANDLERS Y LÓGICA DE FORMULARIO
  const handleOpenEditModal = (product: ProductItem) => {
    const prod = product as ProductItem & { 
      inventory?: InventoryVariant[]; 
      image?: string; 
      image_url?: string; 
    }
    
    setEditingProductId(prod.id)
    setProductForm({
      name: prod.name,
      category: prod.category,
      subcategory: prod.subcategory || '',
      price: prod.price,
      gender: prod.gender || 'caballeros',
    })
    setVariants(prod.inventory && prod.inventory.length > 0 
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
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

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

      const productPayload = {
        name: productForm.name,
        category: productForm.category,
        subcategory: productForm.subcategory,
        price: Number(productForm.price),
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
      {/* HEADER DE RESUMEN */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-black uppercase tracking-wider text-white">
            RESUMEN DE INVENTARIO
          </h1>
          <p className="text-xs font-semibold uppercase text-neutral-400">
            Métricas del mes actual y mercancía reciente
          </p>
        </div>
      </div>

      {/* MÉTRICAS (SOLO GANANCIAS/VENTAS DEL MES Y STOCK TOTAL) */}
      <div className="space-y-4">
        <MetricsCards
          totalRevenue={totalRevenue}
          potentialRevenue={potentialRevenue}
          totalStockUnits={totalStockUnits}
          salesCount={salesCount}
        />
      </div>

      {/* MERCANCÍA INGRESADA EN EL ÚLTIMO MES */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/80 p-5">
          <div>
            <h2 className="font-heading text-sm font-black uppercase tracking-widest text-neutral-200">
              MERCANCÍA RECIENTE (ÚLTIMO MES)
            </h2>
            <p className="text-[10px] text-neutral-400 font-semibold uppercase">
              Productos cargados al sistema en los últimos 30 días
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/Inventario')}
            className="text-xs font-bold text-red-500 hover:text-red-400 transition"
          >
            Ver todo el inventario →
          </button>
        </div>

        <InventoryTable
          products={recentProducts}
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