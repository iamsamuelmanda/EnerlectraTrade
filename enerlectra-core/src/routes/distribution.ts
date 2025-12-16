// src/routes/distribution.ts

import { Router } from 'express'
import { getOwnershipForCluster } from '../engines/ownership'
import { distributeOutcome } from '../engines/distribution'

const router = Router()

router.post('/clusters/:id/distribute', (req, res) => {
  const clusterId = req.params.id
  const { totalSurplusKwh = 0, totalDeficitKwh = 0 } = req.body

  if (
    (totalSurplusKwh > 0 && totalDeficitKwh > 0) ||
    (totalSurplusKwh === 0 && totalDeficitKwh === 0)
  ) {
    return res.status(400).json({
      error: 'Provide either surplus OR deficit (not both)'
    })
  }

  const ownership = getOwnershipForCluster(clusterId)

  if (!ownership.length) {
    return res.status(404).json({ error: 'No ownership data found' })
  }

  const totalKwh = totalSurplusKwh || totalDeficitKwh
  const mode = totalSurplusKwh > 0 ? 'surplus' : 'deficit'

  const distribution = distributeOutcome(ownership, totalKwh)

  res.json({
    clusterId,
    mode,
    totalKwh,
    distribution
  })
})

export default router
