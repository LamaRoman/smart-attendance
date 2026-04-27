'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface GeofenceMapProps {
  latitude: number
  longitude: number
  radius: number
  onLocationChange: (lat: number, lng: number) => void
}

// Fix for default marker icons
const fixLeafletIcon = () => {
  if (typeof window === 'undefined') return

  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })
}

export default function GeofenceMap({
  latitude,
  longitude,
  radius,
  onLocationChange,
}: GeofenceMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || typeof window === 'undefined') return

    fixLeafletIcon()

    const map = L.map(mapContainerRef.current).setView([latitude, longitude], 16)

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    mapRef.current = map

    // Add click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      onLocationChange(lat, lng)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update markers and circle when coordinates or radius change
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return

    // Remove existing marker and circle
    if (markerRef.current) markerRef.current.remove()
    if (circleRef.current) circleRef.current.remove()

    // Add new marker
    markerRef.current = L.marker([latitude, longitude], {
      draggable: true,
    }).addTo(mapRef.current)

    // Add drag handler
    markerRef.current.on('dragend', (e: any) => {
      const position = e.target.getLatLng()
      onLocationChange(position.lat, position.lng)
    })

    // Add circle for geofence
    circleRef.current = L.circle([latitude, longitude], {
      radius: radius,
      color: '#334155',
      weight: 2,
      fillColor: '#334155',
      fillOpacity: 0.1,
      dashArray: '5, 5',
    }).addTo(mapRef.current)

    // Center map on new location
    mapRef.current.setView([latitude, longitude], mapRef.current.getZoom())
  }, [latitude, longitude, radius, onLocationChange])

  return (
    <div
      ref={mapContainerRef}
      className="z-0 h-96 w-full overflow-hidden rounded-xl border-2 border-slate-200"
    />
  )
}
