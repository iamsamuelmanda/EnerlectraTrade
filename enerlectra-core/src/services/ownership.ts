export type Contribution = {
    contributionId: string
    clusterId: string
    userId: string
    amountZMW: number
    timestamp: string
  }
  
  export function computeOwnership(
    contributions: Contribution[],
    clusterId: string
  ) {
    const clusterContributions = contributions.filter(
      c => c.clusterId === clusterId
    )
  
    if (clusterContributions.length === 0) return []
  
    const totalsByUser: Record<string, number> = {}
  
    for (const c of clusterContributions) {
      totalsByUser[c.userId] =
        (totalsByUser[c.userId] || 0) + c.amountZMW
    }
  
    const totalAmount = Object.values(totalsByUser)
      .reduce((sum, v) => sum + v, 0)
  
    return Object.entries(totalsByUser).map(([userId, amountZMW]) => ({
      userId,
      amountZMW,
      pct: Number(((amountZMW / totalAmount) * 100).toFixed(2))
    }))
  }
  