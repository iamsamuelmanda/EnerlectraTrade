import React, { useEffect, useMemo, useRef } from "react"
import L from "leaflet"

/* ----------------------------------
   TYPES
----------------------------------- */

export interface Cluster {
  id: string
  name: string
  type: "micro" | "neighborhood" | "industrial" | "supply"
  location: {
    region: string
    gps?: [number, number]
  }
  memberCount: number
  energyCapacity: number
  status: "active" | "idle" | "offline"
  live?: {
    status: "active" | "stressed" | "offline"
    generated: number
    consumed: number
    battery: number
  }
}

/* ----------------------------------
   REGION COORDINATES
----------------------------------- */

const REGION_COORDS: Record<string, [number, number]> = {
  Lusaka: [-15.3875, 28.3228],
  Kabwe: [-14.4469, 28.4464],
  Kitwe: [-12.8024, 28.2132],
  Ndola: [-12.9585, 28.6367],
  Livingstone: [-17.8419, 25.8561],
  Chipata: [-13.6303, 32.6464],
  Kasama: [-10.2129, 31.1807],
  Mongu: [-15.2639, 23.1308],
}

/* ----------------------------------
   VISUAL INTELLIGENCE
----------------------------------- */

const TYPE_COLOR = {
  micro: "#f59e0b",
  neighborhood: "#10b981",
  industrial: "#3b82f6",
  supply: "#8b5cf6",
}

const LIVE_STATUS_COLOR = {
  active: "#22c55e",
  stressed: "#f59e0b",
  offline: "#ef4444",
}

/* ----------------------------------
   LIVE ICON FACTORY
----------------------------------- */

const createLiveIcon = (
  size: number,
  baseColor: string,
  liveStatus: "active" | "stressed" | "offline"
) =>
  L.divIcon({
    className: "energy-cluster-icon",
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        background:${baseColor};
        border-radius:50%;
        border:3px solid white;
        box-shadow:0 0 0 0 ${LIVE_STATUS_COLOR[liveStatus]};
        animation:pulse 2s infinite;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:11px;
        color:white;
        font-weight:600;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })

/* ----------------------------------
   COMPONENT
----------------------------------- */

interface Props {
  clusters: Cluster[]
  className?: string
}

const EnergyMap: React.FC<Props> = ({ clusters, className }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  /* INIT MAP */
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-13.1339, 27.8493], 6)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map)
    L.control.zoom({ position: "topright" }).addTo(map)

    mapInstance.current = map
    return () => map.remove()
  }, [])

  /* RESOLVE CLUSTERS */
  const resolvedClusters = useMemo(() => {
    return clusters
      .map((c) => {
        const coords = c.location.gps || REGION_COORDS[c.location.region]
        return coords ? { ...c, coords } : null
      })
      .filter(Boolean) as (Cluster & { coords: [number, number] })[]
  }, [clusters])

  /* RENDER MARKERS */
  useEffect(() => {
    if (!mapInstance.current) return
    const map = mapInstance.current

    map.eachLayer((l) => l instanceof L.Marker && map.removeLayer(l))

    resolvedClusters.forEach((cluster) => {
      const size = Math.min(48, 26 + cluster.energyCapacity / 60)
      const liveStatus =
        cluster.live?.status ||
        (cluster.status === "idle" ? "stressed" : cluster.status)

      const marker = L.marker(cluster.coords, {
        icon: createLiveIcon(size, TYPE_COLOR[cluster.type], liveStatus),
      }).addTo(map)

      marker.bindPopup(`
        <div style="min-width:240px">
          <strong>${cluster.name}</strong><hr/>
          <div>Type: ${cluster.type}</div>
          <div>Members: ${cluster.memberCount}</div>
          <div>Capacity: ${cluster.energyCapacity} kWh</div>
          <hr/>
          <div><b>Status:</b> ${liveStatus}</div>
          <div><b>Load:</b> ${cluster.live?.consumed ?? 0} / ${cluster.live?.generated ?? 0} kWh</div>
          <div><b>Battery:</b> ${cluster.live?.battery ?? 0}%</div>
        </div>
      `)
    })
  }, [resolvedClusters])

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-xl" />
    </div>
  )
}

/* ----------------------------------
   SAFE STYLE INJECTION
----------------------------------- */

if (!document.getElementById("energy-map-pulse")) {
  const style = document.createElement("style")
  style.id = "energy-map-pulse"
  style.innerHTML = `
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(0,0,0,.4); }
      70% { box-shadow: 0 0 0 12px rgba(0,0,0,0); }
      100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
    }
  `
  document.head.appendChild(style)
}

export default EnergyMap
