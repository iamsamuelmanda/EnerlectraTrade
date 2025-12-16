import * as fs from 'fs'
import * as path from 'path'

const file = path.join(process.cwd(), 'store', 'contributions.json')

export type ContributionEntry = {
  contributionId: string
  clusterId: string
  userId: string
  amountZMW: number
  timestamp: string
}

export function recordContribution(entry: ContributionEntry): void {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, '[]', 'utf8')
  }

  const raw = fs.readFileSync(file, 'utf8')
  const data: ContributionEntry[] = raw.trim() ? JSON.parse(raw) : []

  data.push(entry)

  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}
