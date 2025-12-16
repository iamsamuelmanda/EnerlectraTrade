import { Router } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import { computeOwnership, Contribution } from '../services/ownership'

const router = Router()

router.get('/clusters/:id/ownership', (req, res) => {
  const clusterId = req.params.id

  const contributionsPath = path.join(
    process.cwd(),
    'store',
    'contributions.json'
  )

  const raw = fs.readFileSync(contributionsPath, 'utf8')
  const contributions: Contribution[] = raw.trim()
    ? JSON.parse(raw)
    : []

  const ownership = computeOwnership(contributions, clusterId)

  res.json({
    clusterId,
    ownership,
    totalOwners: ownership.length
  })
})

export default router
