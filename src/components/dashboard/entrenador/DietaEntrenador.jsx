// components/dashboard/entrenador/DietaEntrenador.jsx
import React from 'react'
import { Apple } from 'lucide-react'

const DietaEntrenador = ({ user }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border-b border-[#2d2d2d] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#e31837]/10 rounded-lg">
            <Apple className="w-5 h-5 text-[#e31837]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Gestión de Planes de Dieta</h1>
            <p className="text-gray-400 text-sm">Crea y asigna dietas a tus alumnos</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#e31837]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Apple className="w-10 h-10 text-[#e31837]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Módulo en Desarrollo</h2>
          <p className="text-gray-400">Próximamente podrás crear y gestionar planes de dieta para tus alumnos.</p>
        </div>
      </div>
    </div>
  )
}

export default DietaEntrenador