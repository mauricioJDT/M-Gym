import React, { useState, useEffect } from 'react'
import {
  Settings, Save, Clock, DollarSign, Calendar as CalendarIcon,
  Phone, Mail, MapPin, Building, WifiOff, CreditCard, Globe
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'

const Configuracion = () => {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [config, setConfig] = useState({
    vigencia_tipo: 'dia',
    vigencia_cantidad: '1',
    monto_base: '5000',
    moneda: 'ARS',
    nombre_gimnasio: 'Mi Gimnasio',
    horario_apertura: '08:00',
    horario_cierre: '22:00',
    telefono_contacto: '',
    email_contacto: '',
    direccion: ''
  })

  const isOnline = useOnlineStatus()

  const tiposVigencia = [
    { value: 'dia', label: 'Dia(s)' },
    { value: 'semana', label: 'Semana(s)' },
    { value: 'mes', label: 'Mes(es)' },
    { value: 'anio', label: 'Año(s)' }
  ]

  const monedas = [
    { value: 'ARS', label: 'Peso Argentino ($)', simbolo: '$' },
    { value: 'USD', label: 'Dolar Americano (US$)', simbolo: 'US$' },
    { value: 'EUR', label: 'Euro (€)', simbolo: '€' },
    { value: 'CUP', label: 'Peso Cubano (₱)', simbolo: '₱' },
    { value: 'MLC', label: 'Moneda Libremente Convertible', simbolo: 'MLC' }
  ]

  useEffect(() => {
    cargarConfiguracion()
  }, [])

  const cargarConfiguracion = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('clave, valor')

      if (error) throw error

      const configData = { ...config }
      data.forEach(item => {
        configData[item.clave] = item.valor
      })
      setConfig(configData)
    } catch (error) {
      console.error('Error cargando configuracion:', error)
      setErrorMessage('Error al cargar la configuracion')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isOnline) {
      setErrorMessage('No hay conexion a internet')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      for (const [clave, valor] of Object.entries(config)) {
        const { error } = await supabase
          .from('configuracion')
          .update({ valor: valor.toString(), updated_at: new Date() })
          .eq('clave', clave)

        if (error) throw error
      }

      setSuccessMessage('Configuracion guardada exitosamente')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error guardando configuracion:', error)
      setErrorMessage('Error al guardar la configuracion')
    } finally {
      setLoading(false)
    }
  }

  const getVigenciaTexto = () => {
    const tipo = tiposVigencia.find(t => t.value === config.vigencia_tipo)
    const cantidad = config.vigencia_cantidad
    return `${cantidad} ${tipo?.label || 'Dia(s)'}`
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header fijo */}
      <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#e31837]/10 rounded-lg">
              <Settings className="w-5 h-5 text-[#e31837]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Configuracion del Sistema</h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">Personaliza los parametros de tu gimnasio</p>
            </div>
          </div>

          {!isOnline && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/50 rounded-lg px-3 py-2">
              <WifiOff className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-medium">Sin conexion</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {successMessage && (
          <div className="mb-4 bg-green-500/10 border border-green-500/50 rounded-xl p-3">
            <p className="text-green-400 text-sm text-center">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-xl p-3">
            <p className="text-red-400 text-sm text-center">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Panel 1: Configuracion de Membresia */}
            <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#2d2d2d]">
                <div className="p-2 bg-[#e31837]/10 rounded-lg">
                  <CreditCard className="w-5 h-5 text-[#e31837]" />
                </div>
                <h2 className="text-lg font-bold text-white">Configuracion de Membresia</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">
                    <Clock className="w-4 h-4 inline mr-1" /> Vigencia de la membresia
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="number"
                      value={config.vigencia_cantidad}
                      onChange={(e) => handleChange('vigencia_cantidad', e.target.value)}
                      min="1"
                      className="w-full sm:w-24 px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837]"
                    />
                    <select
                      value={config.vigencia_tipo}
                      onChange={(e) => handleChange('vigencia_tipo', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837]"
                    >
                      {tiposVigencia.map(tipo => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Vigencia actual: {getVigenciaTexto()} por pago
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" /> Monto base de la membresia
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      {monedas.find(m => m.value === config.moneda)?.simbolo || '$'}
                    </span>
                    <input
                      type="number"
                      value={config.monto_base}
                      onChange={(e) => handleChange('monto_base', e.target.value)}
                      className="w-full pl-12 pr-4 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">
                    <Globe className="w-4 h-4 inline mr-1" /> Moneda
                  </label>
                  <select
                    value={config.moneda}
                    onChange={(e) => handleChange('moneda', e.target.value)}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837]"
                  >
                    {monedas.map(moneda => (
                      <option key={moneda.value} value={moneda.value}>
                        {moneda.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Panel 2: Informacion del Gimnasio */}
            <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#2d2d2d]">
                <div className="p-2 bg-[#e31837]/10 rounded-lg">
                  <Building className="w-5 h-5 text-[#e31837]" />
                </div>
                <h2 className="text-lg font-bold text-white">Informacion del Gimnasio</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">
                    <Building className="w-4 h-4 inline mr-1" /> Nombre del gimnasio
                  </label>
                  <input
                    type="text"
                    value={config.nombre_gimnasio}
                    onChange={(e) => handleChange('nombre_gimnasio', e.target.value)}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837]"
                    placeholder="Mi Gimnasio"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 text-sm font-semibold mb-2">
                      <Clock className="w-4 h-4 inline mr-1" /> Apertura
                    </label>
                    <input
                      type="time"
                      value={config.horario_apertura}
                      onChange={(e) => handleChange('horario_apertura', e.target.value)}
                      className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-semibold mb-2">
                      <Clock className="w-4 h-4 inline mr-1" /> Cierre
                    </label>
                    <input
                      type="time"
                      value={config.horario_cierre}
                      onChange={(e) => handleChange('horario_cierre', e.target.value)}
                      className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">
                    <Phone className="w-4 h-4 inline mr-1" /> Telefono de contacto
                  </label>
                  <input
                    type="tel"
                    value={config.telefono_contacto}
                    onChange={(e) => handleChange('telefono_contacto', e.target.value)}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837]"
                    placeholder="+54 11 1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">
                    <Mail className="w-4 h-4 inline mr-1" /> Email de contacto
                  </label>
                  <input
                    type="email"
                    value={config.email_contacto}
                    onChange={(e) => handleChange('email_contacto', e.target.value)}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837]"
                    placeholder="contacto@gimnasio.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" /> Direccion
                  </label>
                  <textarea
                    value={config.direccion}
                    onChange={(e) => handleChange('direccion', e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837]"
                    placeholder="Calle, numero, ciudad, pais"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Boton Guardar */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={loading || !isOnline}
              className={`w-full bg-[#e31837] hover:bg-[#b8102a] text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
                (!isOnline) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Guardar Configuracion</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Configuracion