'use client'

import { useEffect } from 'react'

export const MarkerIO = () => {
  useEffect(() => {
    const loadMarkerIO = async () => {
      try {
        const markerSDK = await import('@marker.io/browser')
        
        // Initialize the widget using the correct API
        const widget = await markerSDK.default.loadWidget({
          project: '6877c535023390f021d37be52'
        })
        
        console.log('✅ Marker.io loaded successfully', widget)
      } catch (error) {
        console.error('❌ Failed to load Marker.io:', error)
      }
    }

    loadMarkerIO()
  }, [])

  return null // This component doesn't render anything visible
} 