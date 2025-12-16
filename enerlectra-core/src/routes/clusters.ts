import { Router } from 'express'
import { createCluster, listClusters, deleteCluster, updateCluster } from '../services/clusterService'
import { simulateEnergy } from '../services/simulateEnergy'

const router = Router()

router.post('/', async (req, res) => {
  const { name, location, target_kW } = req.body

  if (!name || !location || !target_kW) {
    return res.status(400).json({ error: 'Invalid payload' })
  }

  const cluster = await createCluster(req.body)
  res.status(201).json(cluster)
})

router.get('/', async (_, res) => {
  const clusters = await listClusters()
  res.json(clusters)
})

router.get('/:id', async (req, res) => {
  const { id } = req.params
  const clusters = await listClusters()
  const cluster = clusters.find(c => c.clusterId === id)
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' })
  }
  res.json(cluster)
})

router.put('/:id', async (req, res) => {
  const { id } = req.params
  const cluster = await updateCluster(id, req.body)
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' })
  }
  res.json(cluster)
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  const deleted = await deleteCluster(id)
  if (!deleted) {
    return res.status(404).json({ error: 'Cluster not found' })
  }
  res.json({ deleted: true })
})

router.post('/:id/simulate', async (req, res) => {
  const { id } = req.params
  const clusters = await listClusters()
  const cluster = clusters.find(c => c.clusterId === id)
  if (!cluster) {
    return res.status(404).json({ error: 'Cluster not found' })
  }

  const { days, peakKwhPerKW, avgConsumptionPerHouse, households } = req.body

  if (!days || !peakKwhPerKW || !avgConsumptionPerHouse || !households) {
    return res.status(400).json({ error: 'Invalid simulation input' })
  }

  const result = simulateEnergy({
    target_kW: cluster.target_kW,
    days,
    peakKwhPerKW,
    avgConsumptionPerHouse,
    households
  })

  res.json({
    clusterId: cluster.clusterId,
    periodDays: days,
    ...result
  })
})

export default router
