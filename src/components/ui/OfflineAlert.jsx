import React from 'react'
import { WifiOff } from 'lucide-react'

const OfflineAlert = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">Sin conexión a internet</span>
    </div>
  )
}

export default OfflineAlert