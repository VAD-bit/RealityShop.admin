export interface InventoryItem {
  id?: string
  size_or_detail: string
  stock: number
}

export interface InventoryVariant {
  id?: string
  size_or_detail: string
  stock: number
}

export interface ProductItem {
  id: string
  name: string
  category: 'zapatillas' | 'perfumes' | 'accesorios'
  subcategory: string
  price: number
  image: string
  inventory: InventoryItem[]
  gender?: 'caballeros' | 'damas' | 'niños'
}

export interface Advisor {
  id: string
  name: string
}