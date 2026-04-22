import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, TrendingDown, Target, Activity, Weight, 
  Calendar, Plus, X, Save, Edit, Trash2, BarChart3,
  Award
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'

const EstadisticasAlumno = ({ user }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [registros, setRegistros] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [estadisticas, setEstadisticas] = useState({
    pesoInicial: null,
    pesoActual: null,
    cambioPeso: null,
    imcActual: null,
    mejorMarca: null,
    totalRegistros: 0
  })
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    peso: '',
    altura: '',
    pecho: '',
    cintura: '',
    cadera: '',
    brazo: '',
    pierna: '',
    notas: ''
  })

  const isOnline = useOnlineStatus()

  useEffect(() => {
    cargarDatos()
  }, [user.id])

  const obtenerFechaLocal = () => {
    const hoy = new Date()
    const year = hoy.getFullYear()
    const month = String(hoy.getMonth() + 1).padStart(2, '0')
    const day = String(hoy.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const { data: registrosData, error: registrosError } = await supabase
        .from('registros_progreso')
        .select('*')
        .eq('alumno_id', user.id)
        .order('fecha', { ascending: false })

      if (registrosError) throw registrosError
      setRegistros(registrosData || [])

      if (registrosData && registrosData.length > 0) {
        const ordenados = [...registrosData].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
        const pesoInicial = ordenados[0]?.peso
        const pesoActual = ordenados[ordenados.length - 1]?.peso
        const cambioPeso = pesoActual && pesoInicial ? (pesoActual - pesoInicial).toFixed(1) : null
        
        let imcActual = null
        const ultimo = ordenados[ordenados.length - 1]
        if (ultimo?.peso && ultimo?.altura) {
          const alturaM = ultimo.altura / 100
          imcActual = (ultimo.peso / (alturaM * alturaM)).toFixed(1)
        }

        const mejorPeso = Math.min(...registrosData.filter(r => r.peso).map(r => r.peso))

        setEstadisticas({
          pesoInicial: pesoInicial || null,
          pesoActual: pesoActual || null,
          cambioPeso: cambioPeso,
          imcActual: imcActual,
          mejorMarca: mejorPeso,
          totalRegistros: registrosData.length
        })
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      setErrorMessage('Error al cargar los datos')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isOnline) {
      setErrorMessage('Sin conexión a internet')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const dataToSave = {
        alumno_id: user.id,
        fecha: formData.fecha,
        peso: formData.peso ? parseFloat(formData.peso) : null,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        pecho: formData.pecho ? parseFloat(formData.pecho) : null,
        cintura: formData.cintura ? parseFloat(formData.cintura) : null,
        cadera: formData.cadera ? parseFloat(formData.cadera) : null,
        brazo: formData.brazo ? parseFloat(formData.brazo) : null,
        pierna: formData.pierna ? parseFloat(formData.pierna) : null,
        notas: formData.notas || null
      }

      if (dataToSave.peso && dataToSave.altura) {
        const alturaM = dataToSave.altura / 100
        dataToSave.imc = parseFloat((dataToSave.peso / (alturaM * alturaM)).toFixed(1))
      }

      if (editando) {
        const { error } = await supabase
          .from('registros_progreso')
          .update(dataToSave)
          .eq('id', editando.id)

        if (error) throw error
        setSuccessMessage('Registro actualizado correctamente')
      } else {
        const { error } = await supabase
          .from('registros_progreso')
          .insert([dataToSave])

        if (error) throw error
        setSuccessMessage('Registro guardado correctamente')
      }

      setTimeout(() => setSuccessMessage(''), 3000)
      cerrarModal()
      cargarDatos()
      window.dispatchEvent(new CustomEvent('recargarDashboard'))
    } catch (error) {
      console.error('Error guardando registro:', error)
      setErrorMessage(error.message || 'Error al guardar el registro')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const eliminarRegistro = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return
    
    if (!isOnline) {
      setErrorMessage('Sin conexión a internet')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('registros_progreso')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setSuccessMessage('Registro eliminado')
      setTimeout(() => setSuccessMessage(''), 3000)
      cargarDatos()
      window.dispatchEvent(new CustomEvent('recargarDashboard'))
    } catch (error) {
      console.error('Error eliminando registro:', error)
      setErrorMessage('Error al eliminar el registro')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const abrirModal = (registro = null) => {
    if (registro) {
      setEditando(registro)
      setFormData({
        fecha: registro.fecha,
        peso: registro.peso || '',
        altura: registro.altura || '',
        pecho: registro.pecho || '',
        cintura: registro.cintura || '',
        cadera: registro.cadera || '',
        brazo: registro.brazo || '',
        pierna: registro.pierna || '',
        notas: registro.notas || ''
      })
    } else {
      setEditando(null)
      setFormData({
        fecha: obtenerFechaLocal(),
        peso: '',
        altura: '',
        pecho: '',
        cintura: '',
        cadera: '',
        brazo: '',
        pierna: '',
        notas: ''
      })
    }
    setModalOpen(true)
  }

  const cerrarModal = () => {
    setModalOpen(false)
    setEditando(null)
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return '—'
    const [year, month, day] = fecha.split('-')
    return `${day}/${month}/${year}`
  }

  const getCambioPesoColor = (cambio) => {
    if (!cambio) return 'text-gray-400'
    const num = parseFloat(cambio)
    if (num < 0) return 'text-green-400'
    if (num > 0) return 'text-red-400'
    return 'text-gray-400'
  }

  const getCambioPesoIcon = (cambio) => {
    if (!cambio) return null
    const num = parseFloat(cambio)
    if (num < 0) return <TrendingDown className="w-4 h-4" />
    if (num > 0) return <TrendingUp className="w-4 h-4" />
    return null
  }

  const getIMCStatus = (imc) => {
    if (!imc) return null
    const num = parseFloat(imc)
    if (num < 18.5) return { text: 'Bajo peso', color: 'text-yellow-400' }
    if (num < 25) return { text: 'Normal', color: 'text-green-400' }
    if (num < 30) return { text: 'Sobrepeso', color: 'text-orange-400' }
    return { text: 'Obesidad', color: 'text-red-400' }
  }

  if (loading && registros.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e31837]/30 border-t-[#e31837] rounded-full animate-spin"></div>
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
              <BarChart3 className="w-5 h-5 text-[#e31837]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Mis Estadísticas</h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">Controla tu progreso físico</p>
            </div>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-[#e31837] hover:bg-[#b8102a] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Registro</span>
          </button>
        </div>
      </div>

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

        {/* Tarjetas de resumen - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Weight className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-xs sm:text-sm">Peso Actual</h3>
            <p className="text-xl sm:text-2xl font-bold text-white">{estadisticas.pesoActual || '—'} kg</p>
            {estadisticas.cambioPeso && (
              <div className={`flex items-center gap-1 mt-2 text-xs sm:text-sm ${getCambioPesoColor(estadisticas.cambioPeso)}`}>
                {getCambioPesoIcon(estadisticas.cambioPeso)}
                <span>{Math.abs(estadisticas.cambioPeso)} kg</span>
                <span className="text-xs text-gray-500">desde el inicio</span>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Target className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-xs sm:text-sm">IMC Actual</h3>
            <p className="text-xl sm:text-2xl font-bold text-white">{estadisticas.imcActual || '—'}</p>
            {estadisticas.imcActual && (
              <p className={`text-xs sm:text-sm mt-2 ${getIMCStatus(estadisticas.imcActual)?.color}`}>
                {getIMCStatus(estadisticas.imcActual)?.text}
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Award className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-xs sm:text-sm">Mejor Marca</h3>
            <p className="text-xl sm:text-2xl font-bold text-white">{estadisticas.mejorMarca || '—'} kg</p>
            <p className="text-gray-500 text-xs mt-2">peso más bajo registrado</p>
          </div>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-xs sm:text-sm">Total Registros</h3>
            <p className="text-xl sm:text-2xl font-bold text-white">{estadisticas.totalRegistros}</p>
            <p className="text-gray-500 text-xs mt-2">mediciones registradas</p>
          </div>
        </div>

        {/* Tabla de registros físicos - Responsive */}
        {registros.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1a1a]/50 rounded-xl border border-[#2d2d2d]">
            <Weight className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400">No hay registros físicos aún. ¡Agrega tu primer registro!</p>
          </div>
        ) : (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#e31837]" />
              Historial de Mediciones
            </h2>
            <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-[#0f0f0f] border-b border-[#2d2d2d]">
                    <tr>
                      <th className="text-left px-3 sm:px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Fecha</th>
                      <th className="text-left px-3 sm:px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Peso (kg)</th>
                      <th className="text-left px-3 sm:px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Altura (cm)</th>
                      <th className="text-left px-3 sm:px-4 py-3 text-gray-400 text-xs font-semibold uppercase">IMC</th>
                      <th className="text-left px-3 sm:px-4 py-3 text-gray-400 text-xs font-semibold uppercase hidden md:table-cell">Pecho</th>
                      <th className="text-left px-3 sm:px-4 py-3 text-gray-400 text-xs font-semibold uppercase hidden lg:table-cell">Cintura</th>
                      <th className="text-left px-3 sm:px-4 py-3 text-gray-400 text-xs font-semibold uppercase hidden lg:table-cell">Cadera</th>
                      <th className="text-left px-3 sm:px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((registro) => (
                      <tr key={registro.id} className="border-b border-[#2d2d2d] hover:bg-[#2d2d2d]/50 transition-all">
                        <td className="px-3 sm:px-4 py-3 text-white text-sm">{formatearFecha(registro.fecha)}</td>
                        <td className="px-3 sm:px-4 py-3 text-white text-sm">{registro.peso || '—'}</td>
                        <td className="px-3 sm:px-4 py-3 text-white text-sm">{registro.altura || '—'}</td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className={`text-sm ${getIMCStatus(registro.imc)?.color || 'text-white'}`}>
                            {registro.imc || '—'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-white text-sm hidden md:table-cell">{registro.pecho || '—'}</td>
                        <td className="px-3 sm:px-4 py-3 text-white text-sm hidden lg:table-cell">{registro.cintura || '—'}</td>
                        <td className="px-3 sm:px-4 py-3 text-white text-sm hidden lg:table-cell">{registro.cadera || '—'}</td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => abrirModal(registro)}
                              className="p-1 text-gray-400 hover:text-blue-400 transition-all"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => eliminarRegistro(registro.id)}
                              className="p-1 text-gray-400 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de registro físico - Responsive */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-white">{editando ? 'Editar Registro' : 'Nuevo Registro'}</h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.peso}
                    onChange={(e) => setFormData({...formData, peso: e.target.value})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                    placeholder="70.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.altura}
                    onChange={(e) => setFormData({...formData, altura: e.target.value})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                    placeholder="170"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Pecho (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.pecho}
                      onChange={(e) => setFormData({...formData, pecho: e.target.value})}
                      className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Cintura (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.cintura}
                      onChange={(e) => setFormData({...formData, cintura: e.target.value})}
                      className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Cadera (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.cadera}
                    onChange={(e) => setFormData({...formData, cadera: e.target.value})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Brazo (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.brazo}
                    onChange={(e) => setFormData({...formData, brazo: e.target.value})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Pierna (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.pierna}
                    onChange={(e) => setFormData({...formData, pierna: e.target.value})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Observaciones, sensaciones, etc."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={cerrarModal} className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-[#e31837] hover:bg-[#b8102a] text-white rounded-lg flex items-center justify-center gap-2 text-sm">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Save className="w-4 h-4" /><span>{editando ? 'Actualizar' : 'Guardar'}</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default EstadisticasAlumno