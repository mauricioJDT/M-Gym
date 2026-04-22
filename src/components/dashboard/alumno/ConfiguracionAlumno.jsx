// components/dashboard/alumno/ConfiguracionAlumno.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { 
  Settings, Save, WifiOff, CheckCircle, AlertCircle, RefreshCw,
  Calendar, Zap, Flame, Dumbbell, Target, Award, Heart
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'

const ConfiguracionAlumno = ({ user }) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [configuracion, setConfiguracion] = useState({
    dias_entrenamiento: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
  })

  const isOnline = useOnlineStatus()

  const diasSemana = [
    { id: 'lunes', label: 'Lunes', icon: <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'martes', label: 'Martes', icon: <Flame className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'miercoles', label: 'Miércoles', icon: <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'jueves', label: 'Jueves', icon: <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'viernes', label: 'Viernes', icon: <Target className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'sabado', label: 'Sábado', icon: <Award className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'domingo', label: 'Domingo', icon: <Heart className="w-4 h-4 sm:w-5 sm:h-5" /> }
  ]

  const cargarConfiguracion = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const { data, error } = await supabase
        .from('configuracion_alumno')
        .select('dias_entrenamiento')
        .eq('alumno_id', user.id)
        .maybeSingle()

      if (data && data.dias_entrenamiento) {
        setConfiguracion({
          dias_entrenamiento: data.dias_entrenamiento
        })
        localStorage.setItem(`config_alumno_${user.id}`, JSON.stringify(data.dias_entrenamiento))
      } else {
        const diasPorDefecto = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
        
        if (isOnline) {
          const { error: insertError } = await supabase
            .from('configuracion_alumno')
            .insert({
              alumno_id: user.id,
              usar_plan_dieta: true,
              dias_entrenamiento: diasPorDefecto
            })
          
          if (insertError) {
            console.error('Error creando configuración por defecto:', insertError)
          }
        }
        
        setConfiguracion({
          dias_entrenamiento: diasPorDefecto
        })
      }
    } catch (err) {
      console.error('Error cargando configuración:', err)
      const savedConfig = localStorage.getItem(`config_alumno_${user.id}`)
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig)
          setConfiguracion({
            dias_entrenamiento: parsed
          })
        } catch (e) {
          console.error('Error cargando configuración local:', e)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [user.id, isOnline])

  useEffect(() => {
    cargarConfiguracion()
  }, [cargarConfiguracion])

  const handleToggleDia = (diaId) => {
    setConfiguracion(prev => {
      const nuevosDias = prev.dias_entrenamiento.includes(diaId)
        ? prev.dias_entrenamiento.filter(d => d !== diaId)
        : [...prev.dias_entrenamiento, diaId]
      return { ...prev, dias_entrenamiento: nuevosDias }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    localStorage.setItem(`config_alumno_${user.id}`, JSON.stringify(configuracion.dias_entrenamiento))

    if (!isOnline) {
      setSuccessMessage('Configuración guardada localmente. Se sincronizará cuando tengas conexión.')
      setTimeout(() => setSuccessMessage(''), 4000)
      setSaving(false)
      return
    }

    try {
      const { data: existe } = await supabase
        .from('configuracion_alumno')
        .select('id')
        .eq('alumno_id', user.id)
        .maybeSingle()

      if (existe) {
        const { error: updateError } = await supabase
          .from('configuracion_alumno')
          .update({
            dias_entrenamiento: configuracion.dias_entrenamiento,
            updated_at: new Date().toISOString()
          })
          .eq('alumno_id', user.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('configuracion_alumno')
          .insert({
            alumno_id: user.id,
            usar_plan_dieta: true,
            dias_entrenamiento: configuracion.dias_entrenamiento,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) throw insertError
      }

      setSuccessMessage('Configuración guardada exitosamente!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error guardando configuración:', err)
      setErrorMessage('Error al guardar la configuración. Los cambios se guardaron localmente.')
      setTimeout(() => setErrorMessage(''), 4000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#e31837] animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Responsive */}
      <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#e31837]/10 rounded-lg">
              <Settings className="w-5 h-5 text-[#e31837]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Mi Configuración</h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">Personaliza tus días de entrenamiento</p>
            </div>
          </div>
          {!isOnline && (
            <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-3 py-2">
              <WifiOff className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-xs sm:text-sm">Sin conexión - Modo offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenido Responsive */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {successMessage && (
          <div className="mb-4 bg-green-500/10 border border-green-500/50 rounded-xl p-3">
            <p className="text-green-400 text-xs sm:text-sm text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {successMessage}
            </p>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-xl p-3">
            <p className="text-red-400 text-xs sm:text-sm text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </p>
          </div>
        )}

        {!isOnline && (
          <div className="mb-4 bg-blue-500/10 border border-blue-500/50 rounded-xl p-3">
            <p className="text-blue-400 text-xs sm:text-sm text-center flex items-center justify-center gap-2">
              <WifiOff className="w-4 h-4" />
              Estás en modo offline. Los cambios se guardarán localmente.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#2d2d2d]">
              <div className="p-2 bg-[#e31837]/10 rounded-lg">
                <Calendar className="w-5 h-5 text-[#e31837]" />
              </div>
              <h2 className="text-lg font-bold text-white">Días de Entrenamiento</h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-400 text-xs sm:text-sm">
                Selecciona los días que normalmente entrenas.
              </p>
              
              {/* Grid de días responsive */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
                {diasSemana.map(dia => (
                  <button
                    key={dia.id}
                    type="button"
                    onClick={() => handleToggleDia(dia.id)}
                    className={`flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-xl border-2 transition-all ${
                      configuracion.dias_entrenamiento.includes(dia.id)
                        ? 'border-[#e31837] bg-[#e31837]/20 text-[#e31837]'
                        : 'border-[#3d3d3d] bg-[#2d2d2d] text-gray-400 hover:border-[#e31837]/50'
                    }`}
                  >
                    {dia.icon}
                    <span className="text-xs sm:text-sm font-medium">{dia.label}</span>
                    {configuracion.dias_entrenamiento.includes(dia.id) && (
                      <CheckCircle className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>

              {/* Información de días seleccionados */}
              <div className="mt-4 p-3 bg-[#0f0f0f]/50 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <span className="text-gray-400 text-xs sm:text-sm">Días seleccionados:</span>
                  <span className="text-white text-sm font-bold">
                    {configuracion.dias_entrenamiento.length} / 7
                  </span>
                </div>
                <div className="w-full bg-[#2d2d2d] rounded-full h-2">
                  <div 
                    className="bg-[#e31837] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${(configuracion.dias_entrenamiento.length / 7) * 100}%` }}
                  />
                </div>
                <p className="text-gray-500 text-xs mt-3">
                  {configuracion.dias_entrenamiento.length === 0 
                    ? 'No has seleccionado ningún día de entrenamiento' 
                    : `Entrenarás ${configuracion.dias_entrenamiento.length} días por semana`}
                </p>
                {configuracion.dias_entrenamiento.length > 0 && (
                  <p className="text-gray-500 text-xs mt-2 break-words">
                    Días: <span className="text-white">
                      {configuracion.dias_entrenamiento.map(d => 
                        diasSemana.find(dia => dia.id === d)?.label
                      ).join(', ')}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Botón Guardar Responsive */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className={`w-full bg-[#e31837] hover:bg-[#b8102a] text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
            {!isOnline && (
              <p className="text-center text-yellow-500 text-xs mt-2 flex items-center justify-center gap-1">
                <WifiOff className="w-3 h-3" />
                Sin conexión - Los cambios se guardarán localmente
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default ConfiguracionAlumno