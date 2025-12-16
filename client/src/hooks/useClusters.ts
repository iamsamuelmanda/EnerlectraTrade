import { useEffect, useState } from "react"
import { apiService } from "@/services/api"

export function useClusters(pollInterval = 15000) {
  const [clusters, setClusters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchClusters() {
    try {
      const res = await apiService.getClusters()
      setClusters(res.data)
      setError(null)
    } catch (err) {
      console.error("Cluster fetch failed:", err)
      setError("Unable to load energy clusters")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClusters()

    const interval = setInterval(fetchClusters, pollInterval)
    return () => clearInterval(interval)
  }, [pollInterval])

  return { clusters, loading, error }
}
