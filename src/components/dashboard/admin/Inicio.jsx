import React, { useState, useEffect } from 'react'
import { 
  Users, DollarSign, TrendingUp, AlertCircle, Clock, Activity, 
  Award, UserPlus, UserCheck, X, Package, CreditCard, ArrowRight, 
  Loader2, Trash2, Edit, CheckCircle, Dumbbell, Bell, AlertTriangle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const Inicio = ({ user }) => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAlumnos: 0,
    totalEntrenadores: 0,
    ingresosMes: 0,
    alumnosSinMembresia: 0,
    alumnosConMembresia: 0,
    porcentajePago: 0,
    totalProductos: 0,
    productosStockBajo: 0,
    vencenHoy: 0
  })
  const [alumnosList, setAlumnosList] = useState([])
  const [entrenadoresList, setEntrenadoresList] = useState([])
  const [sinMembresiaList, setSinMembresiaList] = useState([])
  const [vencenHoyList, setVencenHoyList] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalData, setModalData] = useState([])
  const [actividadesRecientes, setActividadesRecientes] = useState([])
  const [configuracion, setConfiguracion] = useState({
    vigencia_tipo: 'mes',
    vigencia_cantidad: 1,
    monto_base: 5000
  })

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const mesActual = new Date().getMonth() + 1
  const anioActual = new Date().getFullYear()

  useEffect(() => {
    const inicializar = async () => {
      const cfg = await cargarConfiguracion()
      await cargarDatosDashboard(cfg)
      await cargarActividadesRecientes()
    }
    inicializar()
  }, [])

  useEffect(() => {
    const handleRecargar = () => {
      cargarDatosDashboard(configuracion)
      cargarActividadesRecientes()
    }
    window.addEventListener('recargarDashboard', handleRecargar)
    return () => window.removeEventListener('recargarDashboard', handleRecargar)
  }, [configuracion])

  // ========== FUNCIONES DE VIGENCIA ==========

  const obtenerFechaVencimientoDate = (fechaPago, tipo, cantidad) => {
    if (!fechaPago) return null
    const [year, month, day] = fechaPago.split('-').map(Number)
    const fecha = new Date(year, month - 1, day)
    switch (tipo) {
      case 'dia':    fecha.setDate(fecha.getDate() + cantidad); break
      case 'semana': fecha.setDate(fecha.getDate() + cantidad * 7); break
      case 'mes':    fecha.setMonth(fecha.getMonth() + cantidad); break
      case 'anio':   fecha.setFullYear(fecha.getFullYear() + cantidad); break
      default:       fecha.setMonth(fecha.getMonth() + 1)
    }
    return fecha
  }

  const verificarMembresiaVigente = (fechaPago, tipo, cantidad) => {
    if (!fechaPago) return false
    const fechaVencimiento = obtenerFechaVencimientoDate(fechaPago, tipo, cantidad)
    if (!fechaVencimiento) return false
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    fechaVencimiento.setHours(0, 0, 0, 0)
    return fechaVencimiento >= hoy
  }

  const venceHoy = (fechaPago, tipo, cantidad) => {
    if (!fechaPago) return false
    const fechaVencimiento = obtenerFechaVencimientoDate(fechaPago, tipo, cantidad)
    if (!fechaVencimiento) return false
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    fechaVencimiento.setHours(0, 0, 0, 0)
    return fechaVencimiento.getTime() === hoy.getTime()
  }

  const formatearFechaVencimiento = (fechaPago, tipo, cantidad) => {
    if (!fechaPago) return '—'
    const fecha = obtenerFechaVencimientoDate(fechaPago, tipo, cantidad)
    if (!fecha) return '—'
    const d = String(fecha.getDate()).padStart(2, '0')
    const m = String(fecha.getMonth() + 1).padStart(2, '0')
    return `${d}/${m}/${fecha.getFullYear()}`
  }

  // Cargar configuración — devuelve el objeto para encadenamiento
  const cargarConfiguracion = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('clave, valor')
      if (error) throw error
      const config = {}
      data.forEach(item => { config[item.clave] = item.valor })
      const nuevaConfig = {
        vigencia_tipo: config.vigencia_tipo || 'mes',
        vigencia_cantidad: parseInt(config.vigencia_cantidad) || 1,
        monto_base: parseInt(config.monto_base) || 5000
      }
      setConfiguracion(nuevaConfig)
      return nuevaConfig
    } catch (error) {
      console.error('Error cargando configuración:', error)
      return configuracion
    }
  }

  const cargarDatosDashboard = async (cfg) => {
    const configAUsar = cfg || configuracion
    setLoading(true)
    try {
      const { data: alumnosData } = await supabase
        .from('users')
        .select('id, username, nombre_completo, email, telefono')
        .eq('rol', 'alumno')

      const { data: entrenadoresData } = await supabase
        .from('users')
        .select('id, username, nombre_completo, email, telefono')
        .eq('rol', 'entrenador')

      const { data: todasMensualidades } = await supabase
        .from('mensualidades')
        .select('*')
        .eq('pagado', true)
        .order('fecha_pago', { ascending: false })

      const { data: mensualidadesMesActual } = await supabase
        .from('mensualidades')
        .select('*')
        .eq('mes', mesActual)
        .eq('anio', anioActual)
        .eq('pagado', true)

      const { data: inventarioData } = await supabase
        .from('inventario')
        .select('cantidad, cantidad_minima')

      const alumnos = alumnosData || []
      const entrenadores = entrenadoresData || []

      // Último pago por alumno (el más reciente por fecha_pago)
      const ultimoPagoPorAlumno = {}
      todasMensualidades?.forEach(pago => {
        const actual = ultimoPagoPorAlumno[pago.alumno_id]
        if (!actual || new Date(pago.fecha_pago) > new Date(actual.fecha_pago)) {
          ultimoPagoPorAlumno[pago.alumno_id] = pago
        }
      })

      const alumnosConMembresiaLista = []
      const alumnosSinMembresiaLista = []
      const alumnosVencenHoyLista = []

      alumnos.forEach(alumno => {
        const ultimoPago = ultimoPagoPorAlumno[alumno.id]
        if (ultimoPago && ultimoPago.pagado && ultimoPago.fecha_pago) {
          const vigente = verificarMembresiaVigente(
            ultimoPago.fecha_pago,
            configAUsar.vigencia_tipo,
            configAUsar.vigencia_cantidad
          )
          const esVenceHoy = venceHoy(
            ultimoPago.fecha_pago,
            configAUsar.vigencia_tipo,
            configAUsar.vigencia_cantidad
          )

          if (vigente) {
            alumnosConMembresiaLista.push(alumno)
          } else {
            alumnosSinMembresiaLista.push(alumno)
          }

          // Lista separada para la sección "vencen hoy"
          if (esVenceHoy) {
            alumnosVencenHoyLista.push({
              ...alumno,
              ultimoPago,
              fechaVencimiento: formatearFechaVencimiento(
                ultimoPago.fecha_pago,
                configAUsar.vigencia_tipo,
                configAUsar.vigencia_cantidad
              )
            })
          }
        } else {
          alumnosSinMembresiaLista.push(alumno)
        }
      })

      let ingresosMes = 0
      mensualidadesMesActual?.forEach(pago => {
        ingresosMes += pago.monto || configAUsar.monto_base
      })

      const porcentajePago = alumnos.length > 0
        ? (alumnosConMembresiaLista.length / alumnos.length) * 100
        : 0

      const inventario = inventarioData || []
      const totalProductos = inventario.reduce((sum, p) => sum + (p.cantidad || 0), 0)
      const productosStockBajo = inventario.filter(p => p.cantidad <= p.cantidad_minima && p.cantidad > 0).length

      setAlumnosList(alumnos)
      setEntrenadoresList(entrenadores)
      setSinMembresiaList(alumnosSinMembresiaLista)
      setVencenHoyList(alumnosVencenHoyLista)

      setStats({
        totalAlumnos: alumnos.length,
        totalEntrenadores: entrenadores.length,
        ingresosMes,
        alumnosSinMembresia: alumnosSinMembresiaLista.length,
        alumnosConMembresia: alumnosConMembresiaLista.length,
        porcentajePago: porcentajePago.toFixed(1),
        totalProductos,
        productosStockBajo,
        vencenHoy: alumnosVencenHoyLista.length
      })
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarActividadesRecientes = async () => {
    try {
      const { data: logsData } = await supabase
        .from('logs_actividad')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15)

      if (logsData && logsData.length > 0) {
        const actividades = logsData.map(log => {
          let icon = <Activity className="w-4 h-4" />
          let color = 'text-gray-400'
          switch (log.accion) {
            case 'crear':       icon = <UserPlus className="w-4 h-4" />;   color = 'text-green-400'; break
            case 'editar':      icon = <Edit className="w-4 h-4" />;       color = 'text-blue-400';  break
            case 'eliminar':    icon = <Trash2 className="w-4 h-4" />;     color = 'text-red-400';   break
            case 'pago':        icon = <CreditCard className="w-4 h-4" />; color = 'text-green-400'; break
            case 'anular_pago': icon = <X className="w-4 h-4" />;         color = 'text-red-400';   break
            default:            icon = <Activity className="w-4 h-4" />;   color = 'text-gray-400'
          }
          return {
            id: log.id,
            accion: getAccionTexto(log.accion, log.entidad),
            usuario: log.usuario || 'Sistema',
            tiempo: formatRelativeTime(log.created_at),
            icon, color,
            detalle: log.detalle
          }
        })
        setActividadesRecientes(actividades.slice(0, 8))
      } else {
        setActividadesRecientes([
          { id: 1, accion: 'Bienvenido al sistema', usuario: 'Sistema', tiempo: 'Ahora', icon: <Activity className="w-4 h-4" />, color: 'text-gray-400', detalle: '' }
        ])
      }
    } catch (error) {
      console.error('Error cargando actividades:', error)
    }
  }

  const getAccionTexto = (accion, entidad) => {
    const textos = {
      crear: `Nuevo ${entidad} creado`,
      editar: `${entidad} editado`,
      eliminar: `${entidad} eliminado`,
      pago: 'Pago registrado',
      anular_pago: 'Pago anulado'
    }
    return textos[accion] || accion
  }

  const formatRelativeTime = (fechaISO) => {
    if (!fechaISO) return 'Recientemente'
    const fecha = new Date(fechaISO)
    const ahora = new Date()
    const diffMs = ahora - fecha
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours} hs`
    if (diffDays === 1) return 'Ayer'
    return `Hace ${diffDays} días`
  }

  const abrirModal = (titulo, datos) => {
    setModalTitle(titulo)
    setModalData(datos)
    setShowModal(true)
  }

  // Navega a Gestión de Pagos con filtro vencenHoy
  const irAGestionPagosVencenHoy = () => {
    window.dispatchEvent(new CustomEvent('cambiarPestaña', {
      detail: { tab: 'pagos', filtro: 'vencenHoy' }
    }))
  }

  const irAInventario = () => {
    window.dispatchEvent(new CustomEvent('cambiarPestaña', { detail: { tab: 'inventario' } }))
  }

  const cards = [
    {
      titulo: 'Alumnos',
      valor: stats.totalAlumnos,
      icono: <Users className="w-6 h-6" />,
      color: 'bg-blue-500/20 text-blue-400',
      border: 'border-blue-500/30',
      onClick: () => abrirModal('Lista de Alumnos', alumnosList),
      subtitulo: 'Total de alumnos registrados'
    },
    {
      titulo: 'Entrenadores',
      valor: stats.totalEntrenadores,
      icono: <UserCheck className="w-6 h-6" />,
      color: 'bg-purple-500/20 text-purple-400',
      border: 'border-purple-500/30',
      onClick: () => abrirModal('Lista de Entrenadores', entrenadoresList),
      subtitulo: 'Profesores activos'
    },
    {
      titulo: 'Ingresos del Mes',
      valor: `$${stats.ingresosMes.toLocaleString()}`,
      icono: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500/20 text-green-400',
      border: 'border-green-500/30',
      onClick: () => {},
      subtitulo: `${meses[mesActual - 1]} ${anioActual}`
    },
    {
      titulo: 'Tasa de Membresías Activas',
      valor: `${stats.porcentajePago}%`,
      icono: <TrendingUp className="w-6 h-6" />,
      color: 'bg-orange-500/20 text-orange-400',
      border: 'border-orange-500/30',
      subtitulo: `${stats.alumnosConMembresia} de ${stats.totalAlumnos} tienen membresía activa`
    }
  ]

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border-b border-[#2d2d2d] px-6 py-4 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#e31837]/10 rounded-lg">
              <Activity className="w-5 h-5 text-[#e31837]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
              <p className="text-gray-400 text-sm mt-1">Bienvenido, {user?.nombre_completo}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#e31837] animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header fijo */}
      <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border-b border-[#2d2d2d] px-6 py-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#e31837]/10 rounded-lg">
            <Activity className="w-5 h-5 text-[#e31837]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
            <p className="text-gray-400 text-sm mt-1">Bienvenido, {user?.nombre_completo}</p>
          </div>
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((card, index) => (
            <div
              key={index}
              onClick={card.onClick}
              className={`bg-[#1a1a1a]/50 backdrop-blur-sm border ${card.border} rounded-xl p-6 cursor-pointer transition-all hover:scale-[1.02] hover:bg-[#1a1a1a]/70`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${card.color}`}>
                  {card.icono}
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500" />
              </div>
              <p className="text-2xl font-bold text-white">{card.valor}</p>
              <p className="text-gray-400 text-sm mt-1">{card.titulo}</p>
              <p className="text-gray-500 text-xs mt-2">{card.subtitulo}</p>
            </div>
          ))}
        </div>

        {/* Botones destacados - Membresías que vencen hoy e Inventario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Tarjeta de Membresías que vencen hoy */}
          {stats.vencenHoy > 0 && (
            <div
              onClick={irAGestionPagosVencenHoy}
              className="bg-gradient-to-r from-orange-500/10 to-red-500/5 border border-orange-500/40 rounded-xl p-6 cursor-pointer transition-all hover:scale-[1.02] group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/20 rounded-xl animate-pulse">
                    <Bell className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-orange-400 font-semibold text-lg">Membresías que vencen hoy</p>
                    <p className="text-3xl font-bold text-white">{stats.vencenHoy}</p>
                    <p className="text-gray-400 text-sm mt-1">Haz clic para gestionar</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-orange-400 transition-all" />
              </div>
            </div>
          )}

          {/* Tarjeta de Inventario */}
          <div
            onClick={irAInventario}
            className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-xl p-6 cursor-pointer transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-blue-400 font-semibold text-lg">Inventario</p>
                  <p className="text-2xl font-bold text-white">{stats.totalProductos} unidades</p>
                  {stats.productosStockBajo > 0 && (
                    <p className="text-yellow-400 text-sm mt-1">{stats.productosStockBajo} productos con stock bajo</p>
                  )}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-all" />
            </div>
          </div>
        </div>

        {/* Grid de Información del Gimnasio y Actividad Reciente */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información del Gimnasio */}
          <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#e31837]/10 rounded-lg">
                <Award className="w-5 h-5 text-[#e31837]" />
              </div>
              <h2 className="text-xl font-bold text-white">Información del Gimnasio</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[#0f0f0f]/50 rounded-lg">
                <span className="text-gray-400">Mes actual</span>
                <span className="text-white font-medium">{meses[mesActual - 1]} {anioActual}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#0f0f0f]/50 rounded-lg">
                <span className="text-gray-400">Total recaudado (mes)</span>
                <span className="text-green-400 font-medium">${stats.ingresosMes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#0f0f0f]/50 rounded-lg">
                <span className="text-gray-400">Alumnos con membresía activa</span>
                <span className="text-white font-medium">{stats.alumnosConMembresia}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#0f0f0f]/50 rounded-lg">
                <span className="text-gray-400">Alumnos sin membresía</span>
                <span className="text-red-400 font-medium">{stats.alumnosSinMembresia}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#0f0f0f]/50 rounded-lg">
                <span className="text-gray-400">Tasa de retención</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-[#2d2d2d] rounded-full h-2">
                    <div className="bg-[#e31837] h-2 rounded-full" style={{ width: `${stats.porcentajePago}%` }} />
                  </div>
                  <span className="text-white text-sm">{stats.porcentajePago}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actividad Reciente - Diseño mejorado y alineado */}
          <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#e31837]/10 rounded-lg">
                <Clock className="w-5 h-5 text-[#e31837]" />
              </div>
              <h2 className="text-xl font-bold text-white">Actividad Reciente</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2 pr-1 custom-scrollbar">
              {actividadesRecientes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p>No hay actividad reciente</p>
                </div>
              ) : (
                actividadesRecientes.map((actividad) => (
                  <div 
                    key={actividad.id} 
                    className="flex items-center gap-3 p-3 bg-[#0f0f0f]/50 rounded-lg group hover:bg-[#1a1a1a] transition-all duration-200 hover:border-l-2 hover:border-[#e31837]"
                  >
                    <div className={`p-2 rounded-lg ${actividad.color} bg-opacity-20 flex-shrink-0`}>
                      {actividad.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-medium truncate">{actividad.accion}</p>
                        <span className="text-gray-500 text-xs whitespace-nowrap">{actividad.tiempo}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gray-500 text-xs">por {actividad.usuario}</span>
                        {actividad.detalle && (
                          <>
                            <span className="text-gray-600 text-xs">•</span>
                            <p className="text-gray-600 text-xs truncate hidden sm:block">{actividad.detalle}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de lista de alumnos/entrenadores */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-[#2d2d2d]">
              <h2 className="text-xl font-bold text-white">{modalTitle}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 max-h-[60vh]">
              {modalData.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p>No hay datos para mostrar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {modalData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#0f0f0f]/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{item.nombre_completo}</p>
                        <p className="text-gray-500 text-sm">@{item.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">{item.email || 'Sin email'}</p>
                        <p className="text-gray-500 text-xs">{item.telefono || 'Sin teléfono'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inicio