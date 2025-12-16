import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/* ----------------------------------
   TYPES
----------------------------------- */

export interface ClusterLiveData {
  generated: number
  consumed: number
  battery: number
  status: 'active' | 'stressed' | 'offline'
  timestamp: number
  generatedSolar?: number
  generatedWind?: number
  generatedHydro?: number
}

export interface LiveEnergyPayload {
  clusterId: string
  generated: number
  consumed: number
  battery: number
  status: 'active' | 'stressed' | 'offline'
  timestamp: number
}

/* ----------------------------------
   CONFIG
----------------------------------- */

const WS_ENDPOINT = 'wss://enerlectra.local/energy'
const RECONNECT_DELAY = 3000
const DEMO_INTERVAL = 2500

/* ----------------------------------
   HOOK
----------------------------------- */

export const useLiveEnergy = () => {
  const queryClient = useQueryClient()
  const [clusters, setClusters] = useState<ClusterLiveData[]>([])
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number | null>(null)
  const demoTimer = useRef<number | null>(null)

  /* ----------------------------------
     APPLY LIVE UPDATE
  ----------------------------------- */

  const applyLiveUpdate = (payload: LiveEnergyPayload) => {
    queryClient.setQueryData(['clusters'], (old: any) => {
      if (!old?.data) return old

      const updated = old.data.map((cluster: any) =>
        cluster.id === payload.clusterId
          ? {
              ...cluster,
              live: {
                ...cluster.live,
                generated: payload.generated,
                consumed: payload.consumed,
                battery: payload.battery,
                status: payload.status,
                timestamp: payload.timestamp,
              },
            }
          : cluster
      )

      setClusters(updated.map(c => c.live).filter(Boolean))
      return { ...old, data: updated }
    })
  }

  /* ----------------------------------
     WEBSOCKET CONNECTOR
  ----------------------------------- */

  const connectSocket = () => {
    if (socketRef.current) return

    const socket = new WebSocket(WS_ENDPOINT)

    socket.onmessage = (event) => {
      try {
        const payload: LiveEnergyPayload = JSON.parse(event.data)
        if (!payload?.clusterId) return
        applyLiveUpdate(payload)
      } catch {
        console.warn('Invalid live energy payload')
      }
    }

    socket.onerror = () => console.warn('Live energy socket error')

    socket.onclose = () => {
      socketRef.current = null
      reconnectTimer.current = window.setTimeout(() => {
        console.warn('Reconnecting live energy stream...')
        connectSocket()
      }, RECONNECT_DELAY)
    }

    socketRef.current = socket
  }

  /* ----------------------------------
     DEMO / OFFLINE SIMULATION
  ----------------------------------- */

  const startDemoMode = () => {
    console.info('⚡ Using simulated live energy data')

    demoTimer.current = window.setInterval(() => {
      queryClient.setQueryData(['clusters'], (old: any) => {
        if (!old?.data) return old

        const updated = old.data.map((cluster: any) => {
          const generatedSolar = Math.floor(Math.random() * 50 + 20)
          const generatedWind = Math.floor(Math.random() * 40 + 10)
          const generatedHydro = Math.floor(Math.random() * 30 + 5)
          const generated = generatedSolar + generatedWind + generatedHydro
          const consumed = Math.floor(Math.random() * 110 + 30)
          const battery = Math.max(
            10,
            Math.min(100, (cluster.live?.battery ?? 70) + (Math.random() * 10 - 5))
          )
          const status =
            consumed > generated
              ? 'stressed'
              : battery < 20
              ? 'offline'
              : 'active'

          return {
            ...cluster,
            live: {
              generated,
              consumed,
              battery,
              status,
              generatedSolar,
              generatedWind,
              generatedHydro,
              timestamp: Date.now(),
            },
          }
        })

        setClusters(updated.map(c => c.live).filter(Boolean))
        return { ...old, data: updated }
      })
    }, DEMO_INTERVAL)
  }

  /* ----------------------------------
     EFFECT
  ----------------------------------- */

  useEffect(() => {
    if (import.meta.env.DEV) {
      startDemoMode()
      return
    }

    connectSocket()

    return () => {
      socketRef.current?.close()
      socketRef.current = null
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (demoTimer.current) clearInterval(demoTimer.current)
    }
  }, [])

  return { clusters, transactions: [] } // Add live transactions if you extend
}
