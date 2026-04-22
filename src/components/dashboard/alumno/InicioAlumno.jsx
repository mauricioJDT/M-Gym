import React, { useState, useEffect, useCallback } from 'react'
import { 
  Calendar, Dumbbell, Apple, TrendingUp, Award, 
  Clock, CheckCircle, XCircle, Activity, User,
  Calendar as CalendarIcon, ChevronRight, Target, Flame,
  Zap, Heart, Weight, AlertCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const InicioAlumno = ({ user }) => {
  const [loading, setLoading] = useState(true)
  const [membresia, setMembresia] = useState({
    dias: 0,
    vencimiento: null,
    activa: false,
    monto: null,
    existe: false
  })
  const [entrenador, setEntrenador] = useState(null)
  const [entrenamientos, setEntrenamientos] = useState([])
  const [estadisticas, setEstadisticas] = useState({
    totalDias: 0,
    diasEntrenados: 0,
    porcentajeAsistencia: 0,
    rachaActual: 0
  })
  // Detectar si es administrador viendo vista de alumno
  const [isAdminView, setIsAdminView] = useState(false)

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  // Detectar si el usuario es admin (por el rol) para usar los tabs correctos
  useEffect(() => {
    const checkAdminView = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('rol')
          .eq('id', user.id)
          .single()
        
        if (!error && data?.rol === 'admin') {
          setIsAdminView(true)
        }
      } catch (error) {
        console.error('Error verificando rol:', error)
      }
    }
    checkAdminView()
  }, [user.id])

  const obtenerFechaLocal = (fecha) => {
    const year = fecha.getFullYear()
    const month = String(fecha.getMonth() + 1).padStart(2, '0')
    const day = String(fecha.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return '—'
    const date = new Date(fecha)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  useEffect(() => {
    cargarDatos()
    
    const handleRecargar = () => {
      cargarDatos()
    }
    
    window.addEventListener('recargarDashboard', handleRecargar)
    
    return () => {
      window.removeEventListener('recargarDashboard', handleRecargar)
    }
  }, [user.id])

  const cargarDiasRestantes = async () => {
    try {
      const { data, error } = await supabase
        .rpc('obtener_dias_membresia', {
          p_alumno_id: user.id
        })

      if (error) {
        console.error('Error en RPC:', error)
        return
      }

      if (data) {
        setMembresia({
          dias: data.dias || 0,
          vencimiento: data.vencimiento,
          activa: data.activa || false,
          monto: data.monto,
          existe: data.existe || false
        })
      }
    } catch (error) {
      console.error('Error cargando días restantes:', error)
    }
  }

  const cargarEntrenamientos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('registro_entrenamientos')
        .select('*')
        .eq('usuario_id', user.id)
        .order('fecha', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error cargando entrenamientos:', error)
      return []
    }
  }, [user.id])

  const calcularRacha = (entrenamientosArray) => {
    if (!entrenamientosArray || entrenamientosArray.length === 0) return 0
    
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    let racha = 0
    
    const fechasEntreno = new Set()
    entrenamientosArray.forEach(e => {
      fechasEntreno.add(e.fecha)
    })
    
    for (let i = 0; i < 365; i++) {
      const fechaActual = new Date(hoy)
      fechaActual.setDate(hoy.getDate() - i)
      const fechaStr = obtenerFechaLocal(fechaActual)
      
      if (fechasEntreno.has(fechaStr)) {
        racha++
      } else {
        break
      }
    }
    
    return racha
  }

  const cargarDatos = async () => {
    setLoading(true)
    try {
      await cargarDiasRestantes()

      const { data: asignacion } = await supabase
        .from('alumno_entrenador')
        .select('entrenador_id, users!inner(id, username, nombre_completo, email, telefono)')
        .eq('alumno_id', user.id)
        .eq('activo', true)
        .maybeSingle()

      if (asignacion) {
        setEntrenador(asignacion.users)
      }

      const entrenamientosData = await cargarEntrenamientos()
      setEntrenamientos(entrenamientosData)

      const hoy = new Date()
      const anio = hoy.getFullYear()
      const mes = hoy.getMonth()
      
      const primerDiaMes = new Date(anio, mes, 1)
      const ultimoDiaMes = new Date(anio, mes + 1, 0)
      
      let diasEntrenados = 0
      let totalDias = 0
      
      for (let d = new Date(primerDiaMes); d <= ultimoDiaMes; d.setDate(d.getDate() + 1)) {
        totalDias++
        const fechaStr = obtenerFechaLocal(d)
        const entrenamientoEncontrado = entrenamientosData.find(e => e.fecha === fechaStr)
        if (entrenamientoEncontrado) {
          diasEntrenados++
        }
      }

      const porcentajeAsistencia = totalDias > 0 ? (diasEntrenados / totalDias) * 100 : 0
      const rachaActual = calcularRacha(entrenamientosData)

      setEstadisticas({
        totalDias,
        diasEntrenados,
        porcentajeAsistencia: porcentajeAsistencia.toFixed(1),
        rachaActual
      })

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Función para cambiar de pestaña según el rol
  const cambiarPestaña = (tabName) => {
    let tabDestino = tabName
    // Si es administrador viendo vista de alumno, usar los tabs con prefijo 'alumno_'
    if (isAdminView) {
      switch(tabName) {
        case 'rutinas':
          tabDestino = 'alumno_rutinas'
          break
        case 'dieta':
          tabDestino = 'alumno_dieta'
          break
        case 'estadisticas':
          tabDestino = 'alumno_estadisticas'
          break
        case 'configuracion':
          tabDestino = 'alumno_configuracion'
          break
        default:
          tabDestino = tabName
      }
    }
    
    window.dispatchEvent(new CustomEvent('cambiarPestaña', { 
      detail: { tab: tabDestino } 
    }))
  }

  if (loading) {
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#e31837]/10 rounded-lg">
            <Activity className="w-5 h-5 text-[#e31837]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Mi Panel</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Bienvenido, {user?.nombre_completo}</p>
            {isAdminView && (
              <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                Vista como Alumno
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Tarjetas de resumen - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Tarjeta de Membresía */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-[#e31837]/10 rounded-lg">
                <Award className="w-5 h-5 text-[#e31837]" />
              </div>
              {!membresia.existe ? (
                <span className="text-gray-400 text-xs bg-gray-500/20 px-2 py-1 rounded-full">Sin membresía</span>
              ) : membresia.activa ? (
                <span className="text-green-400 text-xs bg-green-500/20 px-2 py-1 rounded-full">Activa</span>
              ) : (
                <span className="text-red-400 text-xs bg-red-500/20 px-2 py-1 rounded-full">Vencida</span>
              )}
            </div>
            <h3 className="text-gray-400 text-xs sm:text-sm">Mi Membresía</h3>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">
              {!membresia.existe ? 'Inactiva' : 
               membresia.dias > 0 ? `${membresia.dias} días` : 'Vencida'}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              {!membresia.existe ? 'Sin pagos registrados' :
               membresia.dias > 0 ? `Vence: ${formatearFecha(membresia.vencimiento)}` : 'Membresía vencida'}
            </p>
            {membresia.existe && membresia.dias <= 5 && membresia.dias > 0 && (
              <div className="mt-2 flex items-center gap-1 text-yellow-400 text-xs">
                <AlertCircle className="w-3 h-3" />
                <span>¡Por vencer pronto!</span>
              </div>
            )}
          </div>

          {/* Tarjeta de Asistencia */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-xs sm:text-sm">Asistencia del Mes</h3>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">{estadisticas.porcentajeAsistencia}%</p>
            <p className="text-gray-500 text-xs mt-2">
              {estadisticas.diasEntrenados} de {estadisticas.totalDias} días entrenados
            </p>
          </div>

          {/* Tarjeta de Racha */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-xs sm:text-sm">Racha Actual</h3>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">{estadisticas.rachaActual} días</p>
            <p className="text-gray-500 text-xs mt-2">¡Sigue así!</p>
          </div>
        </div>

        {/* Entrenador asignado - Responsive */}
        {entrenador && (
          <div className="bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-4 sm:p-5 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-3 bg-[#e31837]/10 rounded-full">
                <User className="w-6 h-6 text-[#e31837]" />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs sm:text-sm">Tu Entrenador</p>
                <p className="text-white font-semibold text-base sm:text-lg">{entrenador.nombre_completo}</p>
                <p className="text-gray-500 text-xs sm:text-sm">@{entrenador.username}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-gray-400 text-xs">{entrenador.email || '—'}</p>
                <p className="text-gray-500 text-xs">{entrenador.telefono || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Calendario de entrenamientos - Responsive */}
        <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl overflow-hidden">
          <div className="bg-[#0f0f0f] px-4 sm:px-6 py-4 border-b border-[#2d2d2d]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#e31837]/10 rounded-lg">
                <CalendarIcon className="w-5 h-5 text-[#e31837]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Calendario de Entrenamientos</h2>
                <p className="text-gray-400 text-xs sm:text-sm">{meses[new Date().getMonth()]} {new Date().getFullYear()}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 overflow-x-auto">
            <div className="min-w-[280px]">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {diasSemana.map(dia => (
                  <div key={dia} className="text-center text-gray-500 text-[10px] sm:text-xs font-medium py-2">
                    {dia}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {(() => {
                  const hoy = new Date()
                  const anio = hoy.getFullYear()
                  const mes = hoy.getMonth()
                  const diaHoy = hoy.getDate()
                  
                  const primerDiaMes = new Date(anio, mes, 1)
                  const primerDiaSemana = primerDiaMes.getDay()
                  const diasVacios = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1
                  
                  const elementos = []
                  
                  for (let i = 0; i < diasVacios; i++) {
                    elementos.push(
                      <div key={`empty-${i}`} className="aspect-square bg-[#0f0f0f]/50 rounded-lg"></div>
                    )
                  }
                  
                  const ultimoDiaMes = new Date(anio, mes + 1, 0)
                  
                  for (let d = 1; d <= ultimoDiaMes.getDate(); d++) {
                    const fecha = new Date(anio, mes, d)
                    const fechaStr = obtenerFechaLocal(fecha)
                    const entrenamiento = entrenamientos.find(e => e.fecha === fechaStr)
                    const esHoy = d === diaHoy
                    const esFuturo = fecha > hoy
                    
                    let bgColor = 'bg-[#0f0f0f]/50 border border-[#2d2d2d]'
                    let textColor = 'text-gray-400'
                    let icon = null
                    
                    if (entrenamiento) {
                      bgColor = 'bg-green-500/20 border border-green-500/50'
                      textColor = 'text-green-400'
                      icon = <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                    } else if (!esFuturo && !entrenamiento) {
                      bgColor = 'bg-red-500/20 border border-red-500/50'
                      textColor = 'text-red-400'
                      icon = <XCircle className="w-3 h-3 text-red-400 mt-0.5" />
                    } else if (esFuturo) {
                      bgColor = 'bg-[#0f0f0f]/30 border border-[#2d2d2d]'
                      textColor = 'text-gray-600'
                    }
                    
                    elementos.push(
                      <div
                        key={d}
                        className={`aspect-square rounded-lg p-1 sm:p-2 flex flex-col items-center justify-center transition-all ${bgColor} ${esHoy ? 'ring-2 ring-[#e31837]' : ''}`}
                      >
                        <span className={`text-xs sm:text-sm font-medium ${textColor}`}>
                          {d}
                        </span>
                        {icon}
                      </div>
                    )
                  }
                  
                  return elementos
                })()}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 pt-4 border-t border-[#2d2d2d]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500/20 border border-green-500/50 rounded"></div>
                <span className="text-gray-400 text-xs">Entrenó</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded"></div>
                <span className="text-gray-400 text-xs">No entrenó</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#0f0f0f]/50 border border-[#2d2d2d] rounded"></div>
                <span className="text-gray-400 text-xs">Día futuro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 ring-2 ring-[#e31837] rounded"></div>
                <span className="text-gray-400 text-xs">Hoy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones rápidas - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8">
          <button 
            onClick={() => cambiarPestaña('rutinas')}
            className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-xl p-4 sm:p-5 text-left hover:scale-[1.02] transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Dumbbell className="w-5 h-5 text-blue-400" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 ml-auto group-hover:text-blue-400 transition-all" />
            </div>
            <h3 className="text-white font-semibold text-sm sm:text-base">Mis Rutinas</h3>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Registra tu entrenamiento de hoy</p>
          </button>

          <button 
            onClick={() => cambiarPestaña('dieta')}
            className="bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/30 rounded-xl p-4 sm:p-5 text-left hover:scale-[1.02] transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Apple className="w-5 h-5 text-green-400" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 ml-auto group-hover:text-green-400 transition-all" />
            </div>
            <h3 className="text-white font-semibold text-sm sm:text-base">Plan de Dieta</h3>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Sigue tu alimentación</p>
          </button>

          <button 
            onClick={() => cambiarPestaña('estadisticas')}
            className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/30 rounded-xl p-4 sm:p-5 text-left hover:scale-[1.02] transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Target className="w-5 h-5 text-orange-400" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 ml-auto group-hover:text-orange-400 transition-all" />
            </div>
            <h3 className="text-white font-semibold text-sm sm:text-base">Mis Estadísticas</h3>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Controla tu progreso</p>
          </button>
        </div>
      </div>
    </div>
  )
}

export default InicioAlumno