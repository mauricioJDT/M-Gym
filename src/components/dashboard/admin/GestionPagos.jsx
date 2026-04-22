import React, { useState, useEffect, useRef } from 'react'
import { 
  DollarSign, Search, X, CheckCircle, XCircle, Calendar, 
  TrendingUp, Users, WifiOff, RefreshCw, Trash2, History,
  ChevronLeft, ChevronRight, AlertTriangle, Clock, Bell, ChevronDown, ChevronUp
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'

const GestionPagos = ({ filtroInicial, onPagoRegistrado }) => {
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1)
  const [anioActual, setAnioActual] = useState(new Date().getFullYear())
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [filtroEstado, setFiltroEstado] = useState(filtroInicial === 'morosos' ? 'morosos' : 'todos')
  const [showHistorial, setShowHistorial] = useState(false)
  const [historialAlumno, setHistorialAlumno] = useState([])
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
  const [modalPagoPersonalizado, setModalPagoPersonalizado] = useState(false)
  const [montoPersonalizado, setMontoPersonalizado] = useState('')
  const [configuracion, setConfiguracion] = useState({
    vigencia_tipo: 'mes',
    vigencia_cantidad: 1,
    monto_base: 5000,
    moneda: 'ARS'
  })
  const [alumnosVencenHoy, setAlumnosVencenHoy] = useState([])
  const [showFiltrosMovil, setShowFiltrosMovil] = useState(false)

  // FIX: usamos ref para que cargarDatos siempre lea la config más reciente
  // sin necesidad de re-declararse como efecto
  const configuracionRef = useRef(configuracion)
  useEffect(() => {
    configuracionRef.current = configuracion
  }, [configuracion])

  const isOnline = useOnlineStatus()
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  // ========== FUNCIONES DECLARADAS PRIMERO ==========

  const getFechaActual = () => {
    const ahora = new Date()
    const year = ahora.getFullYear()
    const month = String(ahora.getMonth() + 1).padStart(2, '0')
    const day = String(ahora.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return '—'
    const [year, month, day] = fechaISO.split('-')
    return `${day}/${month}/${year}`
  }

  // Función para obtener fecha de vencimiento como objeto Date
  // FIX: ahora acepta config como parámetro opcional para evitar cierre sobre state desactualizado
  const obtenerFechaVencimientoDate = (fechaPago, cfg) => {
    if (!fechaPago) return null

    const config = cfg || configuracionRef.current

    const [year, month, day] = fechaPago.split('-').map(Number)
    const fecha = new Date(year, month - 1, day)
    const cantidad = Number(config.vigencia_cantidad)
    const tipo = config.vigencia_tipo

    switch (tipo) {
      case 'dia':
        fecha.setDate(fecha.getDate() + cantidad)
        break
      case 'semana':
        fecha.setDate(fecha.getDate() + cantidad * 7)
        break
      case 'mes':
        fecha.setMonth(fecha.getMonth() + cantidad)
        break
      case 'anio':
        fecha.setFullYear(fecha.getFullYear() + cantidad)
        break
      default:
        fecha.setMonth(fecha.getMonth() + 1)
    }

    return fecha
  }

  const calcularFechaVencimiento = (fechaPago, cfg) => {
    if (!fechaPago) return '—'
    const fecha = obtenerFechaVencimientoDate(fechaPago, cfg)
    if (!fecha) return '—'
    const yearFinal = fecha.getFullYear()
    const monthFinal = String(fecha.getMonth() + 1).padStart(2, '0')
    const dayFinal = String(fecha.getDate()).padStart(2, '0')
    return `${dayFinal}/${monthFinal}/${yearFinal}`
  }

  // FIX: parseo seguro de fechaInicio (igual que obtenerFechaVencimientoDate)
  const pagoCubreMes = (fechaPago, mes, anio, cfg) => {
    if (!fechaPago) return false

    const [yy, mm, dd] = fechaPago.split('-').map(Number)
    const fechaInicio = new Date(yy, mm - 1, dd)
    fechaInicio.setHours(0, 0, 0, 0)

    const fechaVencimiento = obtenerFechaVencimientoDate(fechaPago, cfg)
    if (!fechaVencimiento) return false
    fechaVencimiento.setHours(0, 0, 0, 0)

    const primerDiaMes = new Date(anio, mes - 1, 1)
    primerDiaMes.setHours(0, 0, 0, 0)

    const ultimoDiaMes = new Date(anio, mes, 0)
    ultimoDiaMes.setHours(23, 59, 59, 999)

    return fechaInicio <= ultimoDiaMes && fechaVencimiento >= primerDiaMes
  }

  const verificarMembresiaParaMes = (fechaPago, mes, anio, cfg) => {
    if (!fechaPago) return false
    return pagoCubreMes(fechaPago, mes, anio, cfg)
  }

  const verificarVenceEnMes = (fechaPago, mes, anio, cfg) => {
    if (!fechaPago) return false
    const fechaVencimiento = obtenerFechaVencimientoDate(fechaPago, cfg)
    if (!fechaVencimiento) return false
    return fechaVencimiento.getMonth() + 1 === mes && fechaVencimiento.getFullYear() === anio
  }

  const obtenerEstadoParaMes = (pago) => {
    if (!pago || !pago.pagado) return 'pendiente'
    if (!pago.fecha_pago) return 'pendiente'
    const cubre = verificarMembresiaParaMes(pago.fecha_pago, mesActual, anioActual)
    return cubre ? 'pagado' : 'vencido'
  }

  const obtenerMensajeVencimientoParaMes = (fechaPago) => {
    if (!fechaPago) return null
    const fechaVencimiento = obtenerFechaVencimientoDate(fechaPago)
    if (!fechaVencimiento) return null

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    fechaVencimiento.setHours(0, 0, 0, 0)

    if (fechaVencimiento < hoy) return null

    const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24))

    if (diferenciaDias === 0) {
      return { texto: '¡Vence HOY!', tipo: 'critico' }
    } else if (diferenciaDias <= 3) {
      return { texto: `Vence en ${diferenciaDias} día${diferenciaDias !== 1 ? 's' : ''}`, tipo: 'proximo' }
    }

    return null
  }

  const esMontoPersonalizado = (monto) => {
    return monto && monto !== configuracion.monto_base
  }

  // Función para registrar logs
  const registrarLog = async (accion, entidad, entidadId, detalle) => {
    try {
      await supabase
        .from('logs_actividad')
        .insert([{
          accion,
          entidad,
          entidad_id: entidadId,
          usuario: 'admin',
          detalle,
          created_at: new Date().toISOString()
        }])
    } catch (error) {
      console.error('Error registrando log:', error)
    }
  }

  // Cargar configuración
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
        monto_base: parseInt(config.monto_base) || 5000,
        moneda: config.moneda || 'ARS'
      }

      setConfiguracion(nuevaConfig)
      // FIX: actualizar ref inmediatamente para que cargarDatos la use
      configuracionRef.current = nuevaConfig
      return nuevaConfig
    } catch (error) {
      console.error('Error cargando configuración:', error)
      return configuracionRef.current
    }
  }

  // Cargar datos principales
  // FIX: recibe cfg como parámetro para no depender del cierre sobre state
  const cargarDatos = async (mes, anio, cfg) => {
    const mesAUsar = mes ?? mesActual
    const anioAUsar = anio ?? anioActual
    const configAUsar = cfg ?? configuracionRef.current

    setLoading(true)
    setErrorMessage('')

    try {
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('users')
        .select('id, username, nombre_completo, email, telefono')
        .eq('rol', 'alumno')
        .order('id', { ascending: false })

      if (alumnosError) throw alumnosError

      // Cargar TODAS las mensualidades pagadas
      const { data: todasMensualidades, error: todasError } = await supabase
        .from('mensualidades')
        .select('*')
        .eq('pagado', true)
        .order('fecha_pago', { ascending: false })

      if (todasError) throw todasError

      // Mapa de pagos por alumno
      const pagosPorAlumno = {}
      todasMensualidades?.forEach(pago => {
        if (!pagosPorAlumno[pago.alumno_id]) {
          pagosPorAlumno[pago.alumno_id] = []
        }
        pagosPorAlumno[pago.alumno_id].push(pago)
      })

      // Para cada alumno determinar qué pago cubre el mes seleccionado
      const alumnosConEstado = await Promise.all(
        alumnosData.map(async (alumno) => {
          const pagosAlumno = pagosPorAlumno[alumno.id] || []

          let pagoQueCubre = null
          for (const pago of pagosAlumno) {
            if (verificarMembresiaParaMes(pago.fecha_pago, mesAUsar, anioAUsar, configAUsar)) {
              pagoQueCubre = pago
              break
            }
          }

          const ultimoPago = pagosAlumno.length > 0 ? pagosAlumno[0] : null

          const { data: registroMes, error: registroError } = await supabase
            .from('mensualidades')
            .select('id, pagado, fecha_pago, monto')
            .eq('alumno_id', alumno.id)
            .eq('mes', mesAUsar)
            .eq('anio', anioAUsar)
            .maybeSingle()

          if (registroError && registroError.code !== 'PGRST116') {
            console.error('Error consultando registro mensualidad:', registroError)
          }

          return {
            ...alumno,
            mensualidad: {
              id: registroMes?.id || pagoQueCubre?.id || null,
              alumno_id: alumno.id,
              mes: mesAUsar,
              anio: anioAUsar,
              monto: pagoQueCubre?.monto || configAUsar.monto_base,
              pagado: !!pagoQueCubre,
              fecha_pago: pagoQueCubre?.fecha_pago || null
            },
            ultimoPago,
            todosLosPagos: pagosAlumno,
            registroEspecificoMes: registroMes
          }
        })
      )

      setAlumnos(alumnosConEstado)

      // FIX PRINCIPAL: normalizar hoy a medianoche ANTES de comparar
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      const vencenHoy = alumnosData
        .filter(alumno => {
          const pagosAlumno = pagosPorAlumno[alumno.id] || []
          for (const pago of pagosAlumno) {
            if (!pago.fecha_pago) continue
            const fechaVencimiento = obtenerFechaVencimientoDate(pago.fecha_pago, configAUsar)
            if (!fechaVencimiento) continue
            fechaVencimiento.setHours(0, 0, 0, 0)
            // Comparación correcta: ambas fechas normalizadas a medianoche
            if (fechaVencimiento.getTime() === hoy.getTime()) return true
          }
          return false
        })
        .map(alumno => {
          let pagoVencimiento = null
          for (const pago of pagosPorAlumno[alumno.id] || []) {
            const fechaVencimiento = obtenerFechaVencimientoDate(pago.fecha_pago, configAUsar)
            if (fechaVencimiento) {
              const copia = new Date(fechaVencimiento)
              copia.setHours(0, 0, 0, 0)
              if (copia.getTime() === hoy.getTime()) {
                pagoVencimiento = pago
                break
              }
            }
          }
          return {
            ...alumno,
            ultimoPago: pagoVencimiento,
            fechaVencimiento: pagoVencimiento
              ? calcularFechaVencimiento(pagoVencimiento.fecha_pago, configAUsar)
              : '—'
          }
        })

      setAlumnosVencenHoy(vencenHoy)
    } catch (error) {
      console.error('Error cargando datos:', error)
      setErrorMessage('Error al cargar los datos.')
    } finally {
      setLoading(false)
    }
  }

  // Registrar pago
  const registrarPago = async (alumnoId, monto) => {
    const montoFinal = monto ?? configuracionRef.current.monto_base
    if (!isOnline) {
      setErrorMessage('No hay conexión a internet.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const fechaActual = getFechaActual()

      const { data: existente, error: checkError } = await supabase
        .from('mensualidades')
        .select('id')
        .eq('alumno_id', alumnoId)
        .eq('mes', mesActual)
        .eq('anio', anioActual)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') throw checkError

      const alumno = alumnos.find(a => a.id === alumnoId)

      if (existente) {
        const { error } = await supabase
          .from('mensualidades')
          .update({ pagado: true, fecha_pago: fechaActual, monto: montoFinal })
          .eq('id', existente.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('mensualidades')
          .insert([{
            alumno_id: alumnoId,
            mes: mesActual,
            anio: anioActual,
            monto: montoFinal,
            pagado: true,
            fecha_pago: fechaActual
          }])
        if (error) throw error
      }

      await registrarLog('pago', 'mensualidad', alumnoId,
        `Pago registrado para ${alumno?.nombre_completo} - Mes: ${meses[mesActual - 1]} ${anioActual} - Monto: ${montoFinal}`)

      setSuccessMessage('Pago registrado exitosamente')
      setTimeout(() => setSuccessMessage(''), 3000)
      await cargarDatos(mesActual, anioActual)
      if (onPagoRegistrado) onPagoRegistrado()
    } catch (error) {
      console.error('Error registrando pago:', error)
      setErrorMessage('Error al registrar el pago.')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  // Anular pago
  const anularPago = async (alumnoId) => {
    if (!window.confirm(`¿Estás seguro de que querés ANULAR el pago del mes ${meses[mesActual - 1]} ${anioActual}?`)) return
    if (!isOnline) { setErrorMessage('No hay conexión a internet.'); return }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const alumno = alumnos.find(a => a.id === alumnoId)
      const { error } = await supabase
        .from('mensualidades')
        .update({ pagado: false, fecha_pago: null })
        .eq('alumno_id', alumnoId)
        .eq('mes', mesActual)
        .eq('anio', anioActual)
      if (error) throw error

      await registrarLog('anular_pago', 'mensualidad', alumnoId,
        `Pago anulado para ${alumno?.nombre_completo} - Mes: ${meses[mesActual - 1]} ${anioActual}`)

      setSuccessMessage('Pago anulado correctamente')
      setTimeout(() => setSuccessMessage(''), 3000)
      await cargarDatos(mesActual, anioActual)
      if (onPagoRegistrado) onPagoRegistrado()
    } catch (error) {
      console.error('Error anulando pago:', error)
      setErrorMessage('Error al anular el pago.')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  // Ver historial de pagos
  const verHistorial = async (alumno) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('mensualidades')
        .select('*')
        .eq('alumno_id', alumno.id)
        .order('anio', { ascending: false })
        .order('mes', { ascending: false })
      if (error) throw error
      setHistorialAlumno(data || [])
      setAlumnoSeleccionado(alumno)
      setShowHistorial(true)
    } catch (error) {
      console.error('Error cargando historial:', error)
      setErrorMessage('Error al cargar el historial')
    } finally {
      setLoading(false)
    }
  }

  // Cambiar mes
  const cambiarMes = (direccion) => {
    let nuevoMes = mesActual + direccion
    let nuevoAnio = anioActual
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++ }
    else if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio-- }
    setMesActual(nuevoMes)
    setAnioActual(nuevoAnio)
  }

  // Modal pago personalizado
  const abrirModalPagoPersonalizado = (alumno) => {
    setAlumnoSeleccionado(alumno)
    setMontoPersonalizado(alumno.mensualidad.monto?.toString() || configuracion.monto_base.toString())
    setModalPagoPersonalizado(true)
  }

  const confirmarPagoPersonalizado = () => {
    const monto = parseFloat(montoPersonalizado)
    if (isNaN(monto) || monto <= 0) { setErrorMessage('Ingresá un monto válido'); return }
    registrarPago(alumnoSeleccionado.id, monto)
    setModalPagoPersonalizado(false)
    setAlumnoSeleccionado(null)
  }

  // Filtrar alumnos
  const alumnosFiltrados = alumnos.filter(alumno => {
    const matchesSearch =
      alumno.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumno.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alumno.email && alumno.email.toLowerCase().includes(searchTerm.toLowerCase()))

    const fechaPagoFormateada = formatearFecha(alumno.mensualidad.fecha_pago)
    const matchesFecha = searchTerm.includes('/') && fechaPagoFormateada.includes(searchTerm)
    const matchesGeneral = matchesSearch || matchesFecha

    const estadoParaMes = obtenerEstadoParaMes(alumno.mensualidad)
    let matchesEstado = true
    if (filtroEstado === 'pagados') matchesEstado = estadoParaMes === 'pagado'
    if (filtroEstado === 'morosos') matchesEstado = estadoParaMes !== 'pagado'

    return matchesGeneral && matchesEstado
  })

  // Agrupar por fecha de pago
  const alumnosConSeparadores = () => {
    if (!alumnosFiltrados.length) return []

    const alumnosConFecha = alumnosFiltrados.filter(a => a.mensualidad.pagado && a.mensualidad.fecha_pago)
    const alumnosSinFecha = alumnosFiltrados.filter(a => !a.mensualidad.pagado || !a.mensualidad.fecha_pago)

    const grupos = {}
    alumnosConFecha.forEach(alumno => {
      const fecha = alumno.mensualidad.fecha_pago
      if (!grupos[fecha]) grupos[fecha] = []
      grupos[fecha].push(alumno)
    })

    const fechasOrdenadas = Object.keys(grupos).sort((a, b) => new Date(b) - new Date(a))
    const resultado = []
    fechasOrdenadas.forEach(fecha => {
      resultado.push({ esSeparador: true, fecha, alumnos: grupos[fecha].length })
      resultado.push(...grupos[fecha].map(alumno => ({ ...alumno, esSeparador: false })))
    })

    if (alumnosSinFecha.length > 0) {
      resultado.push({
        esSeparador: true, fecha: null,
        texto: `Sin pago para ${meses[mesActual - 1]} ${anioActual}`,
        alumnos: alumnosSinFecha.length
      })
      resultado.push(...alumnosSinFecha.map(alumno => ({ ...alumno, esSeparador: false })))
    }

    return resultado
  }

  // Estadísticas
  const estadisticas = {
    totalAlumnos: alumnos.length,
    pagados: alumnos.filter(a => obtenerEstadoParaMes(a.mensualidad) === 'pagado').length,
    morosos: alumnos.filter(a => obtenerEstadoParaMes(a.mensualidad) !== 'pagado').length,
    totalCobrado: alumnos
      .filter(a => obtenerEstadoParaMes(a.mensualidad) === 'pagado')
      .reduce((sum, a) => sum + (a.mensualidad.monto || configuracion.monto_base), 0),
    porcentajePago: alumnos.length > 0
      ? ((alumnos.filter(a => obtenerEstadoParaMes(a.mensualidad) === 'pagado').length / alumnos.length) * 100).toFixed(1)
      : 0
  }

  const simboloMoneda = configuracion.moneda === 'ARS' ? '$'
    : configuracion.moneda === 'USD' ? 'US$'
    : configuracion.moneda === 'EUR' ? '€'
    : '₱'

  // ========== useEffect ==========
  // FIX: carga config primero, luego datos — evita race condition
  useEffect(() => {
    const inicializar = async () => {
      const cfg = await cargarConfiguracion()
      if (isOnline) {
        await cargarDatos(mesActual, anioActual, cfg)
      }
    }
    inicializar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // FIX: cuando cambia el mes/año recargamos con los valores correctos
  useEffect(() => {
    if (isOnline) {
      cargarDatos(mesActual, anioActual)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesActual, anioActual])

  useEffect(() => {
    if (isOnline) {
      cargarDatos(mesActual, anioActual)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // ========== RENDER ==========
  return (
    <div className="h-full flex flex-col">
      {/* Header fijo - Responsive */}
      <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#e31837]/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-[#e31837]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Gestión de Pagos</h1>
              <p className="text-gray-400 text-xs sm:text-sm">Control de mensualidades y cobros</p>
            </div>
          </div>
          {!isOnline && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/50 rounded-lg px-3 py-2">
              <WifiOff className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm">Sin conexión</span>
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

        {/* Selector de mes y estadísticas - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <button onClick={() => cambiarMes(-1)} className="p-2 rounded-lg hover:bg-[#2d2d2d]">
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  <Calendar className="w-5 h-5 text-[#e31837]" />
                  <span className="text-base sm:text-xl font-bold text-white">
                    {meses[mesActual - 1]} {anioActual}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-1 hidden sm:block">Mes seleccionado para cobro</p>
              </div>
              <button onClick={() => cambiarMes(1)} className="p-2 rounded-lg hover:bg-[#2d2d2d]">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Alumnos</p>
                <p className="text-2xl font-bold text-white">{estadisticas.totalAlumnos}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pagaron este mes</p>
                <p className="text-2xl font-bold text-green-400">{estadisticas.pagados}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Cobrado</p>
                <p className="text-lg sm:text-2xl font-bold text-[#e31837]">{simboloMoneda}{estadisticas.totalCobrado.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[#e31837]" />
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400 text-sm">Alumnos que pagaron {meses[mesActual - 1]} {anioActual}</span>
            <span className="text-white text-sm font-semibold">{estadisticas.porcentajePago}%</span>
          </div>
          <div className="w-full bg-[#2d2d2d] rounded-full h-2">
            <div
              className="bg-[#e31837] h-2 rounded-full transition-all duration-500"
              style={{ width: `${estadisticas.porcentajePago}%` }}
            />
          </div>
        </div>

        {/* SECCIÓN DE ALUMNOS QUE VENCEN HOY - Responsive */}
        {alumnosVencenHoy.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/40 rounded-xl overflow-hidden">
            <div className="bg-orange-500/20 px-4 sm:px-6 py-3 border-b border-orange-500/30">
              <div className="flex flex-wrap items-center gap-3">
                <div className="p-1.5 bg-red-500/30 rounded-lg">
                  <Bell className="w-5 h-5 text-orange-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Membresías que vencen HOY</h2>
                  <p className="text-orange-200/80 text-xs hidden sm:block">Estos alumnos pierden su membresía hoy si no renuevan</p>
                </div>
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-3 py-1">
                  {alumnosVencenHoy.length} Alumnos
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-[#0f0f0f]/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-300 text-xs font-semibold uppercase">Alumno</th>
                    <th className="text-left px-4 py-3 text-gray-300 text-xs font-semibold uppercase hidden sm:table-cell">Contacto</th>
                    <th className="text-left px-4 py-3 text-gray-300 text-xs font-semibold uppercase hidden md:table-cell">Último Pago</th>
                    <th className="text-left px-4 py-3 text-gray-300 text-xs font-semibold uppercase">Vence</th>
                    <th className="text-left px-4 py-3 text-gray-300 text-xs font-semibold uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnosVencenHoy.map((alumno) => (
                    <tr key={alumno.id} className="border-b border-orange-500/20 hover:bg-orange-500/5 transition-all">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{alumno.nombre_completo}</p>
                        <p className="text-gray-400 text-xs">@{alumno.username}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-gray-300 text-xs">{alumno.email || '—'}</p>
                        <p className="text-gray-400 text-xs">{alumno.telefono || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm hidden md:table-cell">
                        {formatearFecha(alumno.ultimoPago?.fecha_pago)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-500/30 text-red-400 border border-red-500/50 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          ¡Hoy! {alumno.fechaVencimiento}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => registrarPago(alumno.id)}
                          disabled={!isOnline}
                          className="px-2 sm:px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-lg flex items-center gap-1.5 transition-all font-medium"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Registrar Renovación</span>
                          <span className="sm:hidden">Renovar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Barra de búsqueda y filtros - Responsive */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#e31837] text-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <X className="w-4 h-4 text-gray-500 hover:text-white" />
              </button>
            )}
          </div>
          
          {/* Botón de filtros para móvil */}
          <button 
            onClick={() => setShowFiltrosMovil(!showFiltrosMovil)} 
            className="sm:hidden w-full flex items-center justify-between px-4 py-2 bg-[#2d2d2d] rounded-lg text-gray-400 text-sm"
          >
            <span>Filtrar por estado</span>
            {showFiltrosMovil ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {/* Filtros - Desktop siempre visible, Mobile colapsable */}
          <div className={`${showFiltrosMovil ? 'flex' : 'hidden'} sm:flex flex-wrap gap-2`}>
            <button onClick={() => setFiltroEstado('todos')} className={`px-4 py-2 rounded-lg text-sm transition-all ${filtroEstado === 'todos' ? 'bg-[#e31837] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d]'}`}>Todos</button>
            <button onClick={() => setFiltroEstado('pagados')} className={`px-4 py-2 rounded-lg text-sm transition-all ${filtroEstado === 'pagados' ? 'bg-green-500 text-white' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d]'}`}>Pagaron este mes</button>
            <button onClick={() => setFiltroEstado('morosos')} className={`px-4 py-2 rounded-lg text-sm transition-all ${filtroEstado === 'morosos' ? 'bg-red-500 text-white' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d]'}`}>No pagaron</button>
            <button onClick={() => cargarDatos(mesActual, anioActual)} disabled={loading} className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-400 rounded-lg flex items-center gap-2 text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Tabla de alumnos */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#e31837]/30 border-t-[#e31837] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl overflow-hidden">
            {/* Versión Desktop - Tabla completa */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0f0f0f] border-b border-[#2d2d2d] sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-400 text-xs font-semibold uppercase">#</th>
                    <th className="text-left px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Alumno</th>
                    <th className="text-left px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Contacto</th>
                    <th className="text-left px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Monto</th>
                    <th className="text-left px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Estado</th>
                    <th className="text-left px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Fecha Pago</th>
                    <th className="text-left px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnosConSeparadores().map((item, idx) => {
                    if (item.esSeparador) {
                      return (
                        <tr key={`separador-${idx}`} className="bg-[#e31837]/10 border-t-2 border-b-2 border-[#e31837]/30">
                          <td colSpan="7" className="px-6 py-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#e31837]" />
                              <span className="text-[#e31837] font-semibold text-sm">
                                {item.fecha ? `Pagados el ${formatearFecha(item.fecha)}` : item.texto}
                              </span>
                              <span className="text-gray-400 text-xs">({item.alumnos} alumnos)</span>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    const estadoParaMes = obtenerEstadoParaMes(item.mensualidad)
                    const advertencia = estadoParaMes === 'pagado' ? obtenerMensajeVencimientoParaMes(item.mensualidad.fecha_pago) : null
                    const esMontoDif = esMontoPersonalizado(item.mensualidad.monto)

                    return (
                      <tr key={item.id} className={`border-b border-[#2d2d2d] hover:bg-[#2d2d2d]/50 transition-all ${advertencia ? 'bg-yellow-500/5' : ''}`}>
                        <td className="px-6 py-3 text-gray-400 text-sm">{idx + 1}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div>
                              <p className="text-white text-sm font-medium">{item.nombre_completo}</p>
                              <p className="text-gray-500 text-xs">@{item.username}</p>
                            </div>
                            {advertencia && (
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                advertencia.tipo === 'critico' ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                <AlertTriangle className="w-3 h-3" />
                                <span>{advertencia.texto}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-gray-400 text-sm">{item.email || '—'}</p>
                          <p className="text-gray-500 text-xs">{item.telefono || '—'}</p>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-sm font-medium ${esMontoDif ? 'text-amber-400' : 'text-white'}`}>
                            {simboloMoneda}{(item.mensualidad.monto || configuracion.monto_base).toLocaleString()}
                          </span>
                          {esMontoDif && (
                            <span className="ml-2 text-[10px] text-amber-500/70">(personalizado)</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {estadoParaMes === 'pagado' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                              <CheckCircle className="w-3 h-3" />
                              Pagado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                              <XCircle className="w-3 h-3" />
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-400 text-sm">
                          {formatearFecha(item.mensualidad.fecha_pago)}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            {estadoParaMes !== 'pagado' ? (
                              <>
                                <button onClick={() => registrarPago(item.id)} disabled={!isOnline} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Registrar
                                </button>
                                <button onClick={() => abrirModalPagoPersonalizado(item)} disabled={!isOnline} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  Personalizar
                                </button>
                              </>
                            ) : (
                              <button onClick={() => anularPago(item.id)} disabled={!isOnline} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg flex items-center gap-1">
                                <Trash2 className="w-3 h-3" />
                                Anular
                              </button>
                            )}
                            <button onClick={() => verHistorial(item)} className="p-1 text-gray-400 hover:text-blue-400 transition-all" title="Ver historial">
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Versión Móvil - Tarjetas */}
            <div className="md:hidden divide-y divide-[#2d2d2d]">
              {alumnosFiltrados.map((item, idx) => {
                const estadoParaMes = obtenerEstadoParaMes(item.mensualidad)
                const advertencia = estadoParaMes === 'pagado' ? obtenerMensajeVencimientoParaMes(item.mensualidad.fecha_pago) : null
                const esMontoDif = esMontoPersonalizado(item.mensualidad.monto)
                return (
                  <div key={item.id} className={`p-4 ${advertencia ? 'bg-yellow-500/5' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.nombre_completo}</p>
                        <p className="text-gray-500 text-xs">@{item.username}</p>
                        {advertencia && (
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 ${
                            advertencia.tipo === 'critico' ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            <AlertTriangle className="w-3 h-3" />
                            <span>{advertencia.texto}</span>
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        estadoParaMes === 'pagado' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {estadoParaMes === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-2">
                      <p>{item.email || 'Sin email'}</p>
                      <p className="text-gray-500">{item.telefono || 'Sin teléfono'}</p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-sm font-medium ${esMontoDif ? 'text-amber-400' : 'text-white'}`}>
                        {simboloMoneda}{(item.mensualidad.monto || configuracion.monto_base).toLocaleString()}
                        {esMontoDif && <span className="ml-1 text-[10px] text-amber-500/70">(pers.)</span>}
                      </span>
                      <span className="text-gray-500 text-xs">{formatearFecha(item.mensualidad.fecha_pago)}</span>
                    </div>
                    
                    <div className="flex gap-2 mt-3 pt-2 border-t border-[#2d2d2d]/50">
                      {estadoParaMes !== 'pagado' ? (
                        <>
                          <button onClick={() => registrarPago(item.id)} disabled={!isOnline} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg">
                            Pagar
                          </button>
                          <button onClick={() => abrirModalPagoPersonalizado(item)} disabled={!isOnline} className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg">
                            <DollarSign className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => anularPago(item.id)} disabled={!isOnline} className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg">
                          Anular
                        </button>
                      )}
                      <button onClick={() => verHistorial(item)} className="px-3 py-2 text-gray-400 hover:text-blue-400">
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {alumnosFiltrados.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p>No hay alumnos registrados</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de pago personalizado */}
      {modalPagoPersonalizado && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-[#2d2d2d]">
              <h2 className="text-xl font-bold text-white">Registrar Pago Personalizado</h2>
              <button onClick={() => setModalPagoPersonalizado(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Alumno</label>
                <input
                  type="text"
                  value={alumnoSeleccionado?.nombre_completo || ''}
                  disabled
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-gray-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Monto ({simboloMoneda})</label>
                <input
                  type="number"
                  value={montoPersonalizado}
                  onChange={(e) => setMontoPersonalizado(e.target.value)}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Ingresá el monto"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setModalPagoPersonalizado(false)} className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg text-sm">
                  Cancelar
                </button>
                <button onClick={confirmarPagoPersonalizado} className="flex-1 px-4 py-2 bg-[#e31837] hover:bg-[#b8102a] text-white rounded-lg text-sm">
                  Registrar Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de historial */}
      {showHistorial && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#2d2d2d] px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Historial de Pagos</h2>
                <p className="text-gray-400 text-sm">{alumnoSeleccionado?.nombre_completo}</p>
              </div>
              <button onClick={() => setShowHistorial(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {historialAlumno.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No hay pagos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-[#0f0f0f]">
                      <tr>
                        <th className="text-left px-4 py-2 text-gray-400 text-xs">Mes/Año</th>
                        <th className="text-left px-4 py-2 text-gray-400 text-xs">Monto</th>
                        <th className="text-left px-4 py-2 text-gray-400 text-xs">Estado</th>
                        <th className="text-left px-4 py-2 text-gray-400 text-xs">Fecha Pago</th>
                        <th className="text-left px-4 py-2 text-gray-400 text-xs">Vigencia Hasta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialAlumno.map((pago) => (
                        <tr key={pago.id} className="border-b border-[#2d2d2d]">
                          <td className="px-4 py-2 text-white text-sm">{meses[pago.mes - 1]} {pago.anio}</td>
                          <td className="px-4 py-2 text-white text-sm">{simboloMoneda}{pago.monto?.toLocaleString()}</td>
                          <td className="px-4 py-2">
                            {pago.pagado
                              ? <span className="text-green-400 text-xs">Pagado</span>
                              : <span className="text-red-400 text-xs">Pendiente</span>
                            }
                          </td>
                          <td className="px-4 py-2 text-gray-400 text-sm">{formatearFecha(pago.fecha_pago)}</td>
                          <td className="px-4 py-2 text-gray-400 text-sm">
                            {pago.pagado ? calcularFechaVencimiento(pago.fecha_pago) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GestionPagos