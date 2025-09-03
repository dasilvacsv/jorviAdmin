import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(amount: string | number) {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(amount))
}

// Nueva función para formatear con moneda específica
export function formatCurrencyWithSymbol(amount: string | number, currency?: { symbol: string; code: string }) {
  const symbol = currency?.symbol || "$"
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${symbol}${numAmount.toFixed(2)}`
}

export function generateInternalId(prefix: string, sequence: number) {
  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

export function generateInvoiceNumber() {
  const timestamp = Date.now().toString()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `INV-${timestamp.slice(-8)}-${random}`
}

export function generateMailboxNumber(branchCode: string = 'MB', sequence: number) {
  return `${branchCode}${sequence.toString().padStart(4, '0')}`
}

export function getTimeAgo(date: Date) {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInHours < 1) return `hace ${diffInMinutes}m`
  if (diffInHours < 24) return `hace ${diffInHours}h`
  if (diffInDays === 1) return `ayer`
  return `hace ${diffInDays} días`
}

export function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string) {
  const phoneRegex = /^\+?[\d\s-()]{7,}$/
  return phoneRegex.test(phone)
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'In Transit':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'In Warehouse':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'Paid, Not Delivered':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'Paid and Delivered':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'Unassigned':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'Paid':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'Overdue':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'Cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'Partial':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'inactive':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function getShippingMethodColor(method: string): string {
  switch (method) {
    case 'Air':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'Sea':
      return 'bg-teal-100 text-teal-800 border-teal-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function calculateWeight(realWeight: number, volumetricWeight?: number) {
  if (!volumetricWeight) return realWeight
  return Math.max(realWeight, volumetricWeight)
}

export function calculateShippingCost(weight: number, pricePerUnit: string, minWeight: string = '1') {
  const billedWeight = Math.max(weight, parseFloat(minWeight))
  return billedWeight * parseFloat(pricePerUnit)
}

export function parseCountryCode(countryCode: string) {
  const codes = {
    'US': '+1',
    'CR': '+506',
    'VE': '+58',
    'PA': '+507',
    'CO': '+57',
    'EC': '+593',
    'PE': '+51',
    'MX': '+52',
  }
  return codes[countryCode as keyof typeof codes] || '+1'
}

// Funciones para pagos múltiples
export function calculateInvoiceTotal(subtotal: number, taxRate: number, taxAmount?: number, additionalCharges: number = 0, discountAmount: number = 0) {
  const tax = taxAmount || (subtotal * (taxRate / 100))
  return subtotal + tax + additionalCharges - discountAmount
}

export function formatPaymentMethod(method: string) {
  const methods = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    card: 'Tarjeta',
    check: 'Cheque',
    other: 'Otro',
  }
  return methods[method as keyof typeof methods] || method
}

export function getPaymentStatusColor(status: string) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  }
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export function isInvoiceOverdue(dueDate: Date | string | null, status: string) {
  if (!dueDate || status !== "Pending") return false
  return new Date(dueDate) < new Date()
}

export function getDaysOverdue(dueDate: Date | string | null) {
  if (!dueDate) return 0
  const diffTime = new Date().getTime() - new Date(dueDate).getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

export const countryOptions = [
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', phone: '+1' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', phone: '+506' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', phone: '+58' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', phone: '+507' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', phone: '+57' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', phone: '+593' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', phone: '+51' },
  { code: 'MX', name: 'México', flag: '🇲🇽', phone: '+52' },
]