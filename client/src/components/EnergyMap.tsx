import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
// Fix for default markers in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix Leaflet's default icon path issues
let DefaultIcon = L.divIcon({
  html: `<div class="w-6 h-6 bg-primary-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
    <div class="w-2 h-2 bg-white rounded-full"></div>
  </div>`,
  className: 'custom-div-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

L.Marker.prototype.options.icon = DefaultIcon

interface Cluster {
  id: string
  name: string
  type: string
  location: {
    region: string
    gps?: [number, number]
    address?: string
  }
  memberCount: number
  energyCapacity: number
  status: string
}

interface EnergyMapProps {
  clusters: Cluster[]
  className?: string
}

const EnergyMap: React.FC<EnergyMapProps> = ({ clusters, className = '' }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  // Zambian regions with approximate coordinates
  const zambianRegions = {
    'Lusaka': [-15.3875, 28.3228],
    'Kabwe': [-14.4469, 28.4464],
    'Copperbelt': [-12.8389, 28.2069],
    'Kitwe': [-12.8024, 28.2132],
    'Ndola': [-12.9585, 28.6367],
    'Livingstone': [-17.8419, 25.8561],
    'Chipata': [-13.6303, 32.6464],
    'Kasama': [-10.2129, 31.1807],
    'Mansa': [-11.1956, 28.8947],
    'Mongu': [-15.2639, 23.1308]
  } as const

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map centered on Zambia
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-13.1339, 27.8493], 6) // Center of Zambia

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Add zoom control to top-right
    L.control.zoom({
      position: 'topright'
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !clusters.length) return

    // Clear existing markers
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapInstanceRef.current!.removeLayer(layer)
      }
    })

    // Add markers for each cluster
    clusters.forEach((cluster) => {
      let coordinates: [number, number]

      // Use GPS coordinates if available, otherwise use region coordinates
      if (cluster.location.gps) {
        coordinates = cluster.location.gps
      } else {
        const regionCoords = zambianRegions[cluster.location.region as keyof typeof zambianRegions]
        if (regionCoords) {
          coordinates = regionCoords as [number, number]
        } else {
          return // Skip if no coordinates available
        }
      }

      // Create custom icon based on cluster type
      const iconColor = {
        'micro': '#f59e0b',      // Solar yellow
        'neighborhood': '#10b981', // Green
        'industrial': '#3b82f6',   // Blue
        'supply': '#8b5cf6'       // Purple
      }[cluster.type] || '#6b7280'

      const customIcon = L.divIcon({
        html: `
          <div class="relative">
            <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center" 
                 style="background-color: ${iconColor}">
              <div class="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
          </div>
        `,
        className: 'custom-cluster-icon',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40]
      })

      const marker = L.marker(coordinates, { icon: customIcon })
        .addTo(mapInstanceRef.current!)

      // Create popup content
      const popupContent = `
        <div class="p-2 min-w-48">
          <h4 class="font-semibold text-gray-900 mb-2">${cluster.name}</h4>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Type:</span>
              <span class="capitalize font-medium">${cluster.type}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Members:</span>
              <span class="font-medium">${cluster.memberCount}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Capacity:</span>
              <span class="font-medium">${cluster.energyCapacity} kWh</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Status:</span>
              <span class="capitalize font-medium px-2 py-1 rounded text-xs" 
                    style="background-color: ${cluster.status === 'active' ? '#dcfce7' : '#fef3c7'}; 
                           color: ${cluster.status === 'active' ? '#166534' : '#92400e'}">
                ${cluster.status}
              </span>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200">
              <button class="w-full px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors">
                View Details
              </button>
            </div>
          </div>
        </div>
      `

      marker.bindPopup(popupContent, {
        maxWidth: 250,
        className: 'cluster-popup'
      })
    })

    // Fit map to show all markers if there are any
    if (clusters.length > 0) {
      const group = new L.featureGroup(
        clusters
          .filter(cluster => cluster.location.gps || zambianRegions[cluster.location.region as keyof typeof zambianRegions])
          .map(cluster => {
            const coordinates = cluster.location.gps || 
              zambianRegions[cluster.location.region as keyof typeof zambianRegions] as [number, number]
            return L.marker(coordinates)
          })
      )
      
      if (group.getLayers().length > 0) {
        mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [20, 20] })
      }
    }
  }, [clusters])

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-xs">
        <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Cluster Types</h5>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Micro</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Neighborhood</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Industrial</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Supply</span>
          </div>
        </div>
      </div>

      {/* Cluster count */}
      <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 text-sm">
        <span className="font-semibold text-gray-900 dark:text-white">
          {clusters.length} Clusters
        </span>
      </div>
    </div>
  )
}

export default EnergyMap