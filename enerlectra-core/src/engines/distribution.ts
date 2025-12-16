export interface OwnershipEntry {
    userId: string
    amountZMW: number
    pct: number
  }
  
  export interface DistributionResult {
    userId: string
    ownershipPct: number
    allocatedKwh: number
  }
  
  /**
   * Pure pro-rata distribution of kWh by ownership percentage.
   * No I/O. Deterministic. Regulator-safe.
   */
  export function distributeOutcome(
    ownership: OwnershipEntry[],
    totalKwh: number
  ): DistributionResult[] {
    if (totalKwh <= 0) {
      throw new Error('totalKwh must be greater than zero')
    }
  
    return ownership.map(o => ({
      userId: o.userId,
      ownershipPct: o.pct,
      allocatedKwh: Math.round((totalKwh * o.pct) / 100)
    }))
  }
  