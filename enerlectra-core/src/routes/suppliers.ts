import { Router } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import { generateId } from '../utils/id'

const router = Router()

const suppliersFile = path.join(process.cwd(), 'store', 'suppliers.json')
const productsFile = path.join(process.cwd(), 'store', 'products.json')

function readJsonArray(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, '[]', 'utf8')
  }
  const raw = fs.readFileSync(filePath, 'utf8')
  return raw.trim() ? JSON.parse(raw) : []
}

function writeJsonArray(filePath: string, data: any[]): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

// POST /suppliers
router.post('/suppliers', (req, res) => {
  const { name, contact } = req.body

  if (!name || !contact) {
    return res.status(400).json({ error: 'Invalid supplier payload' })
  }

  const suppliers = readJsonArray(suppliersFile)

  const supplier = {
    supplierId: generateId('sup'),
    name,
    contact,
    createdAt: new Date().toISOString()
  }

  suppliers.push(supplier)
  writeJsonArray(suppliersFile, suppliers)

  res.status(201).json(supplier)
})

// POST /suppliers/:id/products
router.post('/suppliers/:id/products', (req, res) => {
  const { id } = req.params
  const { type, model, capacityKW, priceZMW } = req.body

  if (!type || !model || capacityKW == null || priceZMW == null) {
    return res.status(400).json({ error: 'Invalid product payload' })
  }

  const suppliers = readJsonArray(suppliersFile)
  const supplier = suppliers.find((s: any) => s.supplierId === id)
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found' })
  }

  const products = readJsonArray(productsFile)

  const product = {
    productId: generateId('prd'),
    supplierId: id,
    type,
    model,
    capacityKW,
    priceZMW,
    createdAt: new Date().toISOString()
  }

  products.push(product)
  writeJsonArray(productsFile, products)

  res.status(201).json(product)
})

export default router
