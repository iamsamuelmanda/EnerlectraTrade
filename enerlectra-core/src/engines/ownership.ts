import * as fs from 'fs'
import * as path from 'path'
import { computeOwnership, Contribution } from '../services/ownership'

export function getOwnershipForCluster(clusterId: string) {
  const contributionsPath = path.join(process.cwd(), 'store', 'contributions.json')
  const raw = fs.readFileSync(contributionsPath, 'utf8')
  const contributions: Contribution[] = raw.trim() ? JSON.parse(raw) : []
  return computeOwnership(contributions, clusterId)
}
