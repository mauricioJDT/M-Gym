// components/dashboard/admin/SolicitudesRegistro.jsx
import React, { useState, useEffect } from 'react'
import { 
  UserPlus, CheckCircle, XCircle, Clock, Search, 
  Mail, Phone, User, Calendar, AlertCircle, RefreshCw,
  Shield, UserCheck, Activity, ChevronDown, ChevronUp
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const SolicitudesRegistro = ({ onSolicitudProcesada }) => {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('pendiente')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null)
  const [rolSeleccionado, setRolSeleccionado] = useState('alumno')
  const [mensajeRechazo, setMensajeRechazo] = useState('')
  const [showFiltrosMovil, setShowFiltrosMovil] = useState(false)

  const isOnline = navigator.onLine

  useEffect(() => {
    if (isOnline) {
      cargarSolicitudes()
    }
  }, [isOnline])

  const cargarSolicitudes = async () => {
    setLoading(true)
    setErrorMessage('')
    
    try {
      const { data, error } = await supabase
        .from('solicitudes_registro')
        .select('*')
        .order('fecha_solicitud', { ascending: false })

      if (error) throw error
      setSolicitudes(data || [])
    } catch (error) {
      console.error('Error cargando solicitudes:', error)
      setErrorMessage('Error al cargar las solicitudes')
    } finally {
      setLoading(false)
    }
  }

  const registrarLog = async (accion, entidad, entidadId, detalle) => {
    try {
      await supabase
        .from('logs_actividad')
        .insert([{
          accion: accion,
          entidad: entidad,
          entidad_id: entidadId,
          usuario: 'admin',
          detalle: detalle,
          created_at: new Date().toISOString()
        }])
    } catch (error) {
      console.error('Error registrando log:', error)
    }
  }

  const getRolIcon = (rol) => {
    switch(rol) {
      case 'admin': return <Shield className="w-3 h-3" />
      case 'entrenador': return <UserCheck className="w-3 h-3" />
      case 'alumno': return <Activity className="w-3 h-3" />
      default: return <User className="w-3 h-3" />
    }
  }

  const aprobarSolicitud = async (solicitud) => {
    if (!window.confirm(`¿Aprobar la solicitud de "${solicitud.nombre_completo}" como ${rolSeleccionado === 'alumno' ? 'Alumno' : rolSeleccionado === 'entrenador' ? 'Entrenador' : 'Administrador'}?`)) return

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', solicitud.username)
        .single()

      if (existingUser) {
        setErrorMessage('El nombre de usuario ya existe en el sistema')
        setLoading(false)
        return
      }

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{
          username: solicitud.username,
          password: solicitud.password,
          nombre_completo: solicitud.nombre_completo,
          rol: rolSeleccionado,
          email: solicitud.email,
          telefono: solicitud.telefono,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (userError) throw userError

      const { error: updateError } = await supabase
        .from('solicitudes_registro')
        .update({
          estado: 'aprobada',
          fecha_respuesta: new Date().toISOString()
        })
        .eq('id', solicitud.id)

      if (updateError) throw updateError

      await registrarLog('crear', 'usuario', newUser.id, `Usuario aprobado y creado: ${solicitud.username} - ${solicitud.nombre_completo} como ${rolSeleccionado}`)
      
      setSuccessMessage(`Solicitud de ${solicitud.nombre_completo} aprobada como ${rolSeleccionado === 'alumno' ? 'Alumno' : rolSeleccionado === 'entrenador' ? 'Entrenador' : 'Administrador'}`)
      setTimeout(() => setSuccessMessage(''), 3000)
      
      setModalOpen(false)
      setSolicitudSeleccionada(null)
      setRolSeleccionado('alumno')
      cargarSolicitudes()
      if (onSolicitudProcesada) onSolicitudProcesada()

    } catch (error) {
      console.error('Error aprobando solicitud:', error)
      setErrorMessage('Error al aprobar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  const rechazarSolicitud = async (solicitud, motivo) => {
    if (!window.confirm(`¿Rechazar la solicitud de "${solicitud.nombre_completo}"?`)) return

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { error: updateError } = await supabase
        .from('solicitudes_registro')
        .update({
          estado: 'rechazada',
          fecha_respuesta: new Date().toISOString(),
          mensaje_rechazo: motivo || 'Solicitud rechazada por el administrador'
        })
        .eq('id', solicitud.id)

      if (updateError) throw updateError

      await registrarLog('eliminar', 'solicitud', solicitud.id, `Solicitud rechazada: ${solicitud.username} - ${solicitud.nombre_completo}. Motivo: ${motivo || 'No especificado'}`)
      
      setSuccessMessage(`Solicitud de ${solicitud.nombre_completo} rechazada`)
      setTimeout(() => setSuccessMessage(''), 3000)
      
      cargarSolicitudes()
      if (onSolicitudProcesada) onSolicitudProcesada()
      setModalOpen(false)
      setMensajeRechazo('')
      setSolicitudSeleccionada(null)

    } catch (error) {
      console.error('Error rechazando solicitud:', error)
      setErrorMessage('Error al rechazar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  const abrirModalAprobacion = (solicitud) => {
    setSolicitudSeleccionada(solicitud)
    setRolSeleccionado('alumno')
    setModalOpen(true)
  }

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return '—'
    const fecha = new Date(fechaISO)
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case 'pendiente':
        return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Clock className="w-3 h-3" />, texto: 'Pendiente' }
      case 'aprobada':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle className="w-3 h-3" />, texto: 'Aprobada' }
      case 'rechazada':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3" />, texto: 'Rechazada' }
      default:
        return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <AlertCircle className="w-3 h-3" />, texto: estado }
    }
  }

  const solicitudesFiltradas = solicitudes.filter(solicitud => {
    const matchesSearch = 
      solicitud.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solicitud.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (solicitud.email && solicitud.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesEstado = filtroEstado === 'todos' || solicitud.estado === filtroEstado
    
    return matchesSearch && matchesEstado
  })

  const estadisticas = {
    total: solicitudes.length,
    pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
    aprobadas: solicitudes.filter(s => s.estado === 'aprobada').length,
    rechazadas: solicitudes.filter(s => s.estado === 'rechazada').length
  }

  return (
    <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl overflow-hidden">
      {/* Header de la sección */}
      <div className="bg-[#0f0f0f] px-4 sm:px-6 py-4 border-b border-[#2d2d2d]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#e31837]/10 rounded-lg text-[#e31837]">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Solicitudes de Registro</h2>
            <p className="text-gray-400 text-xs sm:text-sm">Gestiona las solicitudes de nuevos usuarios</p>
          </div>
        </div>
      </div>

      {/* Estadísticas - Grid responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 border-b border-[#2d2d2d]">
        <div className="text-center p-2 bg-[#0f0f0f]/50 rounded-lg">
          <p className="text-xl sm:text-2xl font-bold text-white">{estadisticas.total}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
        <div className="text-center p-2 bg-yellow-500/5 rounded-lg">
          <p className="text-xl sm:text-2xl font-bold text-yellow-400">{estadisticas.pendientes}</p>
          <p className="text-xs text-gray-400">Pendientes</p>
        </div>
        <div className="text-center p-2 bg-green-500/5 rounded-lg">
          <p className="text-xl sm:text-2xl font-bold text-green-400">{estadisticas.aprobadas}</p>
          <p className="text-xs text-gray-400">Aprobadas</p>
        </div>
        <div className="text-center p-2 bg-red-500/5 rounded-lg">
          <p className="text-xl sm:text-2xl font-bold text-red-400">{estadisticas.rechazadas}</p>
          <p className="text-xs text-gray-400">Rechazadas</p>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="p-4 border-b border-[#2d2d2d]">
        {/* Buscador siempre visible */}
        <div className="relative w-full mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white text-sm focus:outline-none focus:border-[#e31837]"
          />
        </div>

        {/* Botón de filtros para móvil */}
        <button
          onClick={() => setShowFiltrosMovil(!showFiltrosMovil)}
          className="sm:hidden w-full flex items-center justify-between px-3 py-2 bg-[#2d2d2d] rounded-lg text-gray-400 text-sm"
        >
          <span>Filtrar por estado</span>
          {showFiltrosMovil ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Filtros - Desktop siempre visible, Mobile colapsable */}
        <div className={`${showFiltrosMovil ? 'flex' : 'hidden'} sm:flex flex-wrap gap-2 mt-3 sm:mt-0`}>
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filtroEstado === 'todos' 
                ? 'bg-[#e31837] text-white' 
                : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d]'
            }`}
          >
            Todos ({estadisticas.total})
          </button>
          <button
            onClick={() => setFiltroEstado('pendiente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filtroEstado === 'pendiente' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d]'
            }`}
          >
            Pendientes ({estadisticas.pendientes})
          </button>
          <button
            onClick={() => setFiltroEstado('aprobada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filtroEstado === 'aprobada' 
                ? 'bg-green-500 text-white' 
                : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d]'
            }`}
          >
            Aprobadas ({estadisticas.aprobadas})
          </button>
          <button
            onClick={() => setFiltroEstado('rechazada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filtroEstado === 'rechazada' 
                ? 'bg-red-500 text-white' 
                : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d]'
            }`}
          >
            Rechazadas ({estadisticas.rechazadas})
          </button>
          <button
            onClick={cargarSolicitudes}
            disabled={loading}
            className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-400 rounded-lg flex items-center gap-1 text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Lista de solicitudes */}
      <div className="overflow-x-auto">
        {successMessage && (
          <div className="mx-4 mt-4 bg-green-500/10 border border-green-500/50 rounded-lg p-2">
            <p className="text-green-400 text-sm text-center">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-2">
            <p className="text-red-400 text-sm text-center">{errorMessage}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#e31837]/30 border-t-[#e31837] rounded-full animate-spin"></div>
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <p>No hay solicitudes para mostrar</p>
          </div>
        ) : (
          <>
            {/* Vista de tabla para desktop */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-[#0f0f0f] border-b border-[#2d2d2d]">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Solicitante</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Contacto</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Fecha</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Estado</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudesFiltradas.map((solicitud) => {
                    const estadoBadge = getEstadoBadge(solicitud.estado)
                    return (
                      <tr key={solicitud.id} className="border-b border-[#2d2d2d] hover:bg-[#2d2d2d]/50 transition-all">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white text-sm font-medium">{solicitud.nombre_completo}</p>
                            <p className="text-gray-500 text-xs">@{solicitud.username}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {solicitud.email && (
                            <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{solicitud.email}</span>
                            </div>
                          )}
                          {solicitud.telefono && (
                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                              <Phone className="w-3 h-3" />
                              <span>{solicitud.telefono}</span>
                            </div>
                          )}
                          {!solicitud.email && !solicitud.telefono && (
                            <span className="text-gray-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <Calendar className="w-3 h-3" />
                            <span>{formatearFecha(solicitud.fecha_solicitud)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${estadoBadge.color}`}>
                            {estadoBadge.icon}
                            {estadoBadge.texto}
                          </span>
                          {solicitud.mensaje_rechazo && solicitud.estado === 'rechazada' && (
                            <p className="text-red-400/70 text-xs mt-1 max-w-[150px] truncate">{solicitud.mensaje_rechazo}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {solicitud.estado === 'pendiente' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => abrirModalAprobacion(solicitud)}
                                disabled={!isOnline}
                                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg flex items-center gap-1 transition-all"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Aprobar
                              </button>
                              <button
                                onClick={() => rechazarSolicitud(solicitud, '')}
                                disabled={!isOnline}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg flex items-center gap-1 transition-all"
                              >
                                <XCircle className="w-3 h-3" />
                                Rechazar
                              </button>
                            </div>
                          )}
                          {solicitud.estado !== 'pendiente' && (
                            <span className="text-gray-500 text-xs">Procesada</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista de tarjetas para móvil */}
            <div className="md:hidden divide-y divide-[#2d2d2d]">
              {solicitudesFiltradas.map((solicitud) => {
                const estadoBadge = getEstadoBadge(solicitud.estado)
                return (
                  <div key={solicitud.id} className="p-4 hover:bg-[#2d2d2d]/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-white font-medium">{solicitud.nombre_completo}</p>
                        <p className="text-gray-500 text-xs">@{solicitud.username}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${estadoBadge.color}`}>
                        {estadoBadge.icon}
                        {estadoBadge.texto}
                      </span>
                    </div>
                    
                    <div className="space-y-1 mt-2 text-xs">
                      {solicitud.email && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="break-all">{solicitud.email}</span>
                        </div>
                      )}
                      {solicitud.telefono && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span>{solicitud.telefono}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>{formatearFecha(solicitud.fecha_solicitud)}</span>
                      </div>
                    </div>

                    {solicitud.mensaje_rechazo && solicitud.estado === 'rechazada' && (
                      <p className="text-red-400/70 text-xs mt-2 p-2 bg-red-500/10 rounded-lg break-words">
                        {solicitud.mensaje_rechazo}
                      </p>
                    )}

                    {solicitud.estado === 'pendiente' && (
                      <div className="flex gap-2 mt-3 pt-2 border-t border-[#2d2d2d]/50">
                        <button
                          onClick={() => abrirModalAprobacion(solicitud)}
                          disabled={!isOnline}
                          className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg flex items-center justify-center gap-1 transition-all"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => rechazarSolicitud(solicitud, '')}
                          disabled={!isOnline}
                          className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg flex items-center justify-center gap-1 transition-all"
                        >
                          <XCircle className="w-3 h-3" />
                          Rechazar
                        </button>
                      </div>
                    )}
                    {solicitud.estado !== 'pendiente' && (
                      <div className="mt-3 pt-2 border-t border-[#2d2d2d]/50">
                        <span className="text-gray-500 text-xs">✓ Procesada el {formatearFecha(solicitud.fecha_respuesta)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal de aprobación */}
      {modalOpen && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#2d2d2d] px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Aprobar Solicitud</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Solicitante</label>
                <input
                  type="text"
                  value={solicitudSeleccionada.nombre_completo}
                  disabled
                  className="w-full px-4 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Usuario</label>
                <input
                  type="text"
                  value={`@${solicitudSeleccionada.username}`}
                  disabled
                  className="w-full px-4 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Seleccionar Rol *</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setRolSeleccionado('alumno')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      rolSeleccionado === 'alumno'
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-[#3d3d3d] bg-[#2d2d2d] text-gray-400 hover:border-green-500/50'
                    }`}
                  >
                    <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-xs font-medium">Alumno</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRolSeleccionado('entrenador')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      rolSeleccionado === 'entrenador'
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                        : 'border-[#3d3d3d] bg-[#2d2d2d] text-gray-400 hover:border-blue-500/50'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-xs font-medium">Entrenador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRolSeleccionado('admin')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      rolSeleccionado === 'admin'
                        ? 'border-red-500 bg-red-500/20 text-red-400'
                        : 'border-[#3d3d3d] bg-[#2d2d2d] text-gray-400 hover:border-red-500/50'
                    }`}
                  >
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-xs font-medium">Admin</span>
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setModalOpen(false)} 
                  className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg transition-all font-medium text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => aprobarSolicitud(solicitudSeleccionada)} 
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprobar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SolicitudesRegistro