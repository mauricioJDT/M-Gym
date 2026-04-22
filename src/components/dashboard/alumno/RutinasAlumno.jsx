import React, { useState, useEffect, useCallback } from 'react'
import { 
  Dumbbell, Calendar, CheckCircle, 
  TrendingUp, AlertCircle, RefreshCw, Plus, Edit, Trash2,
  Save, X, Activity, Flame, Timer, Weight, Repeat,
  Zap, Target, Heart, StopCircle, Clock, Award,
  ChevronLeft, ChevronRight, Check
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'

const RutinasAlumno = ({ user }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [diasConfigurados, setDiasConfigurados] = useState([])
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [ejercicios, setEjercicios] = useState([])
  const [showAgregarEjercicio, setShowAgregarEjercicio] = useState(false)
  const [editandoEjercicio, setEditandoEjercicio] = useState(null)
  const [showConfigurarRutina, setShowConfigurarRutina] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [estadisticas, setEstadisticas] = useState({
    totalEntrenos: 0,
    totalEjercicios: 0,
    rachaActual: 0
  })
  const [configRutina, setConfigRutina] = useState({
    nombre_rutina: '',
    tipos_entrenamiento: []
  })
  const [nuevoEjercicio, setNuevoEjercicio] = useState({
    nombre_ejercicio: '',
    unidad_medida: 'repeticiones',
    objetivo: '',
    series: 3,
    descanso: 60,
    notas: ''
  })

  const isOnline = useOnlineStatus()

  const DIAS_POR_DEFECTO = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

  const unidadesMedida = [
    { value: 'repeticiones', label: 'Repeticiones', icon: <Repeat className="w-4 h-4" /> },
    { value: 'segundos', label: 'Segundos', icon: <Timer className="w-4 h-4" /> },
    { value: 'minutos', label: 'Minutos', icon: <Clock className="w-4 h-4" /> },
    { value: 'kg', label: 'Kilogramos', icon: <Weight className="w-4 h-4" /> },
    { value: 'libras', label: 'Libras', icon: <Weight className="w-4 h-4" /> }
  ]

  const tiposEntrenamiento = [
    { value: 'pierna', label: 'Pierna', icon: <Zap className="w-4 h-4" />, color: 'bg-purple-500/20 text-purple-400', border: 'border-purple-500/30' },
    { value: 'espalda', label: 'Espalda', icon: <Target className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-400', border: 'border-blue-500/30' },
    { value: 'pecho', label: 'Pecho', icon: <Activity className="w-4 h-4" />, color: 'bg-red-500/20 text-red-400', border: 'border-red-500/30' },
    { value: 'hombros', label: 'Hombros', icon: <Dumbbell className="w-4 h-4" />, color: 'bg-orange-500/20 text-orange-400', border: 'border-orange-500/30' },
    { value: 'brazos', label: 'Brazos', icon: <Flame className="w-4 h-4" />, color: 'bg-green-500/20 text-green-400', border: 'border-green-500/30' },
    { value: 'abdominales', label: 'Abdominales', icon: <Heart className="w-4 h-4" />, color: 'bg-pink-500/20 text-pink-400', border: 'border-pink-500/30' },
    { value: 'fullbody', label: 'Full Body', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-cyan-500/20 text-cyan-400', border: 'border-cyan-500/30' },
    { value: 'cardio', label: 'Cardio', icon: <Timer className="w-4 h-4" />, color: 'bg-yellow-500/20 text-yellow-400', border: 'border-yellow-500/30' }
  ]

  const diasSemana = [
    { id: 'lunes', label: 'Lunes', icon: <Zap className="w-4 h-4" /> },
    { id: 'martes', label: 'Martes', icon: <Flame className="w-4 h-4" /> },
    { id: 'miercoles', label: 'Miércoles', icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'jueves', label: 'Jueves', icon: <Zap className="w-4 h-4" /> },
    { id: 'viernes', label: 'Viernes', icon: <Target className="w-4 h-4" /> },
    { id: 'sabado', label: 'Sábado', icon: <Activity className="w-4 h-4" /> },
    { id: 'domingo', label: 'Domingo', icon: <Heart className="w-4 h-4" /> }
  ]

  const obtenerFechaLocal = () => {
    const hoy = new Date()
    const year = hoy.getFullYear()
    const month = String(hoy.getMonth() + 1).padStart(2, '0')
    const day = String(hoy.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const calcularRachaActual = async () => {
    try {
      const { data: entrenamientos, error } = await supabase
        .from('registro_entrenamientos')
        .select('fecha')
        .eq('usuario_id', user.id)
        .order('fecha', { ascending: false })

      if (error) throw error
      if (!entrenamientos || entrenamientos.length === 0) return 0

      const fechasEntreno = new Set()
      entrenamientos.forEach(e => { fechasEntreno.add(e.fecha) })

      let racha = 0
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      for (let i = 0; i < 365; i++) {
        const fechaActual = new Date(hoy)
        fechaActual.setDate(hoy.getDate() - i)
        const fechaStr = fechaActual.toISOString().split('T')[0]
        if (fechasEntreno.has(fechaStr)) { racha++ }
        else { break }
      }
      return racha
    } catch (error) {
      console.error('Error calculando racha:', error)
      return 0
    }
  }

  const cargarConfiguracion = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_alumno')
        .select('dias_entrenamiento')
        .eq('alumno_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error cargando configuración:', error)
      }

      let diasActivos = []
      if (data && data.dias_entrenamiento && data.dias_entrenamiento.length > 0) {
        diasActivos = diasSemana.filter(dia => data.dias_entrenamiento.includes(dia.id))
      } else {
        diasActivos = diasSemana.filter(dia => DIAS_POR_DEFECTO.includes(dia.id))
      }
      setDiasConfigurados(diasActivos)
      if (diasActivos.length > 0 && !diaSeleccionado) {
        setDiaSeleccionado(diasActivos[0].id)
      }
    } catch (error) {
      console.error('Error en cargarConfiguracion:', error)
      const diasActivos = diasSemana.filter(dia => DIAS_POR_DEFECTO.includes(dia.id))
      setDiasConfigurados(diasActivos)
      if (diasActivos.length > 0 && !diaSeleccionado) {
        setDiaSeleccionado(diasActivos[0].id)
      }
    }
  }, [user.id, diaSeleccionado])

  const cargarEjercicios = useCallback(async () => {
    if (!diaSeleccionado) {
      setEjercicios([])
      return
    }
    try {
      const { data, error } = await supabase
        .from('ejercicios')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('dia_semana', diaSeleccionado)
        .order('orden', { ascending: true })

      if (error) {
        console.error('Error cargando ejercicios:', error)
        return
      }
      setEjercicios(data || [])
      
      const { data: entrenamientos, error: entrenosError } = await supabase
        .from('registro_entrenamientos')
        .select('id')
        .eq('usuario_id', user.id)
      if (entrenosError) throw entrenosError
      
      const racha = await calcularRachaActual()
      setEstadisticas({
        totalEntrenos: entrenamientos?.length || 0,
        totalEjercicios: data?.length || 0,
        rachaActual: racha
      })
    } catch (error) {
      console.error('Error en cargarEjercicios:', error)
    }
  }, [user.id, diaSeleccionado])

  const cargarConfiguracionRutina = useCallback(async () => {
    if (!diaSeleccionado) return
    try {
      const { data, error } = await supabase
        .from('ejercicios')
        .select('nombre_rutina, tipo_entrenamiento')
        .eq('usuario_id', user.id)
        .eq('dia_semana', diaSeleccionado)
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (data) {
        setConfigRutina({
          nombre_rutina: data.nombre_rutina || '',
          tipos_entrenamiento: data.tipo_entrenamiento || []
        })
      } else {
        setConfigRutina({ nombre_rutina: '', tipos_entrenamiento: [] })
      }
    } catch (error) {
      console.error('Error cargando configuración de rutina:', error)
    }
  }, [user.id, diaSeleccionado])

  useEffect(() => {
    const inicializar = async () => {
      setLoading(true)
      await cargarConfiguracion()
      setLoading(false)
    }
    inicializar()
  }, [cargarConfiguracion])

  useEffect(() => {
    if (diaSeleccionado) {
      cargarEjercicios()
      cargarConfiguracionRutina()
    }
  }, [diaSeleccionado, cargarEjercicios, cargarConfiguracionRutina])

  const toggleTipoEntrenamiento = (tipoValue) => {
    setConfigRutina(prev => {
      const nuevosTipos = prev.tipos_entrenamiento.includes(tipoValue)
        ? prev.tipos_entrenamiento.filter(t => t !== tipoValue)
        : [...prev.tipos_entrenamiento, tipoValue]
      return { ...prev, tipos_entrenamiento: nuevosTipos }
    })
  }

  const guardarConfiguracionRutina = async () => {
    if (!isOnline) {
      setErrorMessage('Sin conexión a internet.')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }
    if (!configRutina.nombre_rutina.trim()) {
      setErrorMessage('El nombre de la rutina es obligatorio')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }
    if (configRutina.tipos_entrenamiento.length === 0) {
      setErrorMessage('Selecciona al menos un tipo de entrenamiento')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setSaving(true)
    try {
      if (ejercicios.length > 0) {
        const { error } = await supabase
          .from('ejercicios')
          .update({
            nombre_rutina: configRutina.nombre_rutina,
            tipo_entrenamiento: configRutina.tipos_entrenamiento
          })
          .eq('usuario_id', user.id)
          .eq('dia_semana', diaSeleccionado)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('ejercicios')
          .insert({
            usuario_id: user.id,
            dia_semana: diaSeleccionado,
            nombre_ejercicio: 'Configuración de rutina',
            nombre_rutina: configRutina.nombre_rutina,
            tipo_entrenamiento: configRutina.tipos_entrenamiento,
            series: 0,
            descanso: 0,
            orden: 0
          })
        if (error) throw error
      }
      setSuccessMessage('Configuración de rutina guardada')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowConfigurarRutina(false)
      cargarEjercicios()
      cargarConfiguracionRutina()
    } catch (error) {
      console.error('Error guardando configuración:', error)
      setErrorMessage('Error al guardar la configuración')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const registrarEntrenamiento = async () => {
    if (!isOnline) {
      setErrorMessage('Sin conexión a internet.')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const fechaHoy = obtenerFechaLocal()
      const { data: existe } = await supabase
        .from('registro_entrenamientos')
        .select('id')
        .eq('usuario_id', user.id)
        .eq('fecha', fechaHoy)
        .maybeSingle()

      if (existe) {
        setErrorMessage('Ya registraste tu entrenamiento de hoy')
        setTimeout(() => setErrorMessage(''), 3000)
        setSaving(false)
        return
      }

      const { error: insertError } = await supabase
        .from('registro_entrenamientos')
        .insert({ usuario_id: user.id, fecha: fechaHoy })
      if (insertError) throw insertError

      setSuccessMessage('¡Entrenamiento registrado!')
      setTimeout(() => setSuccessMessage(''), 3000)
      await cargarEjercicios()
      window.dispatchEvent(new CustomEvent('recargarDashboard'))
    } catch (error) {
      console.error('Error registrando entrenamiento:', error)
      setErrorMessage('Error al registrar el entrenamiento')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const agregarEjercicio = async () => {
    if (!nuevoEjercicio.nombre_ejercicio.trim()) {
      setErrorMessage('El nombre del ejercicio es obligatorio')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }
    if (!isOnline) {
      setErrorMessage('Sin conexión a internet.')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data, error } = await supabase
        .from('ejercicios')
        .insert({
          usuario_id: user.id,
          dia_semana: diaSeleccionado,
          nombre_ejercicio: nuevoEjercicio.nombre_ejercicio,
          unidad_medida: nuevoEjercicio.unidad_medida,
          objetivo: nuevoEjercicio.objetivo || null,
          series: nuevoEjercicio.series,
          descanso: nuevoEjercicio.descanso,
          notas: nuevoEjercicio.notas || null,
          nombre_rutina: configRutina.nombre_rutina || null,
          tipo_entrenamiento: configRutina.tipos_entrenamiento.length > 0 ? configRutina.tipos_entrenamiento : null,
          orden: ejercicios.length
        })
        .select()

      if (error) throw error
      setEjercicios([...ejercicios, data[0]])
      setShowAgregarEjercicio(false)
      setSuccessMessage('Ejercicio agregado correctamente')
      setTimeout(() => setSuccessMessage(''), 3000)
      setNuevoEjercicio({
        nombre_ejercicio: '',
        unidad_medida: 'repeticiones',
        objetivo: '',
        series: 3,
        descanso: 60,
        notas: ''
      })
    } catch (error) {
      console.error('Error agregando ejercicio:', error)
      setErrorMessage('Error al guardar el ejercicio')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const eliminarEjercicio = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar ejercicio "${nombre}"?`)) return
    if (!isOnline) {
      setErrorMessage('Sin conexión a internet')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }
    try {
      const { error } = await supabase.from('ejercicios').delete().eq('id', id)
      if (error) throw error
      setEjercicios(ejercicios.filter(e => e.id !== id))
      setSuccessMessage('Ejercicio eliminado')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error eliminando ejercicio:', error)
      setErrorMessage('Error al eliminar el ejercicio')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const actualizarEjercicio = async () => {
    if (!editandoEjercicio) return
    if (!isOnline) {
      setErrorMessage('Sin conexión a internet')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('ejercicios')
        .update({
          nombre_ejercicio: nuevoEjercicio.nombre_ejercicio,
          unidad_medida: nuevoEjercicio.unidad_medida,
          objetivo: nuevoEjercicio.objetivo || null,
          series: nuevoEjercicio.series,
          descanso: nuevoEjercicio.descanso,
          notas: nuevoEjercicio.notas || null
        })
        .eq('id', editandoEjercicio.id)

      if (error) throw error
      setEjercicios(ejercicios.map(e => e.id === editandoEjercicio.id ? { ...e, ...nuevoEjercicio } : e))
      setEditandoEjercicio(null)
      setShowAgregarEjercicio(false)
      setSuccessMessage('Ejercicio actualizado')
      setTimeout(() => setSuccessMessage(''), 3000)
      setNuevoEjercicio({
        nombre_ejercicio: '',
        unidad_medida: 'repeticiones',
        objetivo: '',
        series: 3,
        descanso: 60,
        notas: ''
      })
    } catch (error) {
      console.error('Error actualizando ejercicio:', error)
      setErrorMessage('Error al actualizar el ejercicio')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const getTipoInfo = (tipoValue) => {
    return tiposEntrenamiento.find(t => t.value === tipoValue) || tiposEntrenamiento[0]
  }

  const getTiposMostrados = (tiposArray) => {
    if (!tiposArray || tiposArray.length === 0) return []
    return tiposArray.map(t => getTipoInfo(t)).filter(t => t)
  }

  const abrirConfigurarRutina = async () => {
    await cargarConfiguracionRutina()
    setShowConfigurarRutina(true)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#e31837] animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando rutinas...</p>
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
              <Dumbbell className="w-5 h-5 text-[#e31837]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Mis Rutinas</h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">Planifica y registra tus entrenamientos</p>
            </div>
          </div>
          <button
            onClick={registrarEntrenamiento}
            disabled={saving}
            className="px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all bg-green-500 hover:bg-green-600 text-white text-sm"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span>Registrar Entrenamiento</span>
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

        {!isOnline && (
          <div className="mb-4 bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-3">
            <p className="text-yellow-400 text-sm text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Sin conexión a internet.
            </p>
          </div>
        )}

        {/* Tarjetas de estadísticas - Responsive Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs">Total Entrenos</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{estadisticas.totalEntrenos}</p>
          </div>
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <Dumbbell className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs">Ejercicios</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{estadisticas.totalEjercicios}</p>
          </div>
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#2d2d2d] rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <Flame className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs">Racha Actual</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{estadisticas.rachaActual} días</p>
          </div>
        </div>

        {/* Días de entrenamiento - Scroll horizontal en móvil */}
        <div className="mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3">Tus Días de Entrenamiento</h2>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
            {diasConfigurados.map(dia => (
              <button
                key={dia.id}
                onClick={() => setDiaSeleccionado(dia.id)}
                className={`flex flex-col items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all flex-shrink-0 ${
                  diaSeleccionado === dia.id
                    ? 'bg-[#e31837] text-white'
                    : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                }`}
              >
                {dia.icon}
                <span className="text-xs sm:text-sm font-medium">{dia.label}</span>
              </button>
            ))}
          </div>
        </div>

        {diaSeleccionado && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Rutina para {diasSemana.find(d => d.id === diaSeleccionado)?.label}
                </h2>
                {configRutina.nombre_rutina && (
                  <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                    {configRutina.nombre_rutina}
                  </span>
                )}
                {configRutina.tipos_entrenamiento.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {getTiposMostrados(configRutina.tipos_entrenamiento).map((tipo, idx) => (
                      <span key={idx} className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${tipo.color} ${tipo.border}`}>
                        {tipo.icon}
                        <span className="ml-0.5 sm:ml-1 hidden sm:inline">{tipo.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={abrirConfigurarRutina}
                  className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1"
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                  Configurar
                </button>
                <button
                  onClick={() => {
                    setEditandoEjercicio(null)
                    setNuevoEjercicio({
                      nombre_ejercicio: '',
                      unidad_medida: 'repeticiones',
                      objetivo: '',
                      series: 3,
                      descanso: 60,
                      notas: ''
                    })
                    setShowAgregarEjercicio(true)
                  }}
                  className="text-[#e31837] hover:text-[#b8102a] text-xs sm:text-sm flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  Agregar
                </button>
              </div>
            </div>

            {ejercicios.filter(e => e.nombre_ejercicio !== 'Configuración de rutina').length === 0 ? (
              <div className="text-center py-12 bg-[#1a1a1a]/50 rounded-xl border border-[#2d2d2d]">
                <Dumbbell className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400">No hay ejercicios para este día</p>
                <button
                  onClick={() => setShowAgregarEjercicio(true)}
                  className="mt-3 text-[#e31837] hover:underline text-sm"
                >
                  Agregar tu primer ejercicio →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {ejercicios.filter(e => e.nombre_ejercicio !== 'Configuración de rutina').map((ejercicio) => (
                  <div
                    key={ejercicio.id}
                    className="bg-[#1a1a1a]/50 border border-[#2d2d2d] rounded-xl p-4 hover:bg-[#2d2d2d]/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold text-base sm:text-lg">{ejercicio.nombre_ejercicio}</h3>
                          <span className="text-xs px-2 py-1 bg-[#e31837]/20 text-[#e31837] rounded-full">
                            {ejercicio.series} series
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">Unidad</span>
                            <p className="text-white text-xs sm:text-sm">
                              {unidadesMedida.find(u => u.value === ejercicio.unidad_medida)?.label || ejercicio.unidad_medida}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Objetivo</span>
                            <p className="text-white text-xs sm:text-sm">{ejercicio.objetivo || '—'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Descanso</span>
                            <p className="text-white text-xs sm:text-sm">{ejercicio.descanso} seg</p>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-gray-500 text-xs">Notas</span>
                            <p className="text-white text-xs sm:text-sm">{ejercicio.notas || '—'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:flex-col lg:flex-row">
                        <button
                          onClick={() => {
                            setEditandoEjercicio(ejercicio)
                            setNuevoEjercicio({
                              nombre_ejercicio: ejercicio.nombre_ejercicio,
                              unidad_medida: ejercicio.unidad_medida,
                              objetivo: ejercicio.objetivo || '',
                              series: ejercicio.series,
                              descanso: ejercicio.descanso,
                              notas: ejercicio.notas || ''
                            })
                            setShowAgregarEjercicio(true)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-400 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarEjercicio(ejercicio.id, ejercicio.nombre_ejercicio)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Configurar Rutina - Responsive */}
      {showConfigurarRutina && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 bg-[#1a1a1a]">
              <h2 className="text-lg sm:text-xl font-bold text-white">Configurar Rutina</h2>
              <button onClick={() => setShowConfigurarRutina(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Nombre de la Rutina</label>
                <input
                  type="text"
                  value={configRutina.nombre_rutina}
                  onChange={(e) => setConfigRutina({...configRutina, nombre_rutina: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Ej: Pierna Fuerte, Espalda y Bíceps, etc."
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Tipo(s) de Entrenamiento</label>
                <p className="text-gray-500 text-xs mb-2">Puedes seleccionar múltiples opciones</p>
                <div className="grid grid-cols-2 gap-2">
                  {tiposEntrenamiento.map(tipo => (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => toggleTipoEntrenamiento(tipo.value)}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-sm ${
                        configRutina.tipos_entrenamiento.includes(tipo.value)
                          ? `${tipo.color} border-[#e31837]`
                          : 'border-[#3d3d3d] bg-[#2d2d2d] text-gray-400'
                      }`}
                    >
                      {tipo.icon}
                      <span className="text-xs sm:text-sm flex-1 text-left">{tipo.label}</span>
                      {configRutina.tipos_entrenamiento.includes(tipo.value) && (
                        <Check className="w-3 h-3" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowConfigurarRutina(false)}
                  className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarConfiguracionRutina}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#e31837] hover:bg-[#b8102a] text-white rounded-lg flex items-center justify-center gap-2 text-sm"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agregar/Editar Ejercicio - Responsive */}
      {showAgregarEjercicio && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {editandoEjercicio ? 'Editar Ejercicio' : 'Agregar Ejercicio'}
              </h2>
              <button onClick={() => setShowAgregarEjercicio(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Nombre del Ejercicio *</label>
                <input
                  type="text"
                  value={nuevoEjercicio.nombre_ejercicio}
                  onChange={(e) => setNuevoEjercicio({...nuevoEjercicio, nombre_ejercicio: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Ej: Press de banca, Sentadillas, etc."
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Unidad de Medida</label>
                <div className="grid grid-cols-3 gap-2">
                  {unidadesMedida.map(unidad => (
                    <button
                      key={unidad.value}
                      type="button"
                      onClick={() => setNuevoEjercicio({...nuevoEjercicio, unidad_medida: unidad.value})}
                      className={`flex items-center justify-center gap-1 sm:gap-2 p-2 rounded-lg border transition-all text-xs sm:text-sm ${
                        nuevoEjercicio.unidad_medida === unidad.value
                          ? 'border-[#e31837] bg-[#e31837]/20 text-[#e31837]'
                          : 'border-[#3d3d3d] bg-[#2d2d2d] text-gray-400'
                      }`}
                    >
                      {unidad.icon}
                      <span className="hidden sm:inline">{unidad.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Objetivo (opcional)</label>
                <input
                  type="text"
                  value={nuevoEjercicio.objetivo}
                  onChange={(e) => setNuevoEjercicio({...nuevoEjercicio, objetivo: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Ej: 12 repeticiones, 30 segundos"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Series</label>
                  <input
                    type="number"
                    min="1"
                    value={nuevoEjercicio.series}
                    onChange={(e) => setNuevoEjercicio({...nuevoEjercicio, series: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Descanso (segundos)</label>
                  <input
                    type="number"
                    min="0"
                    value={nuevoEjercicio.descanso}
                    onChange={(e) => setNuevoEjercicio({...nuevoEjercicio, descanso: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Notas (opcional)</label>
                <textarea
                  value={nuevoEjercicio.notas}
                  onChange={(e) => setNuevoEjercicio({...nuevoEjercicio, notas: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Consejos, técnica, etc."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAgregarEjercicio(false)}
                  className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={editandoEjercicio ? actualizarEjercicio : agregarEjercicio}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#e31837] hover:bg-[#b8102a] text-white rounded-lg flex items-center justify-center gap-2 text-sm"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editandoEjercicio ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RutinasAlumno