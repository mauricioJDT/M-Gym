import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, X, Save, Edit, Trash2, 
  Calculator, Trash, AlertCircle, 
  CheckCircle, ChevronRight, ChevronDown,
  Utensils, Scale, Flame, Apple, Calendar, 
  Clock, Coffee, Sun, Moon, TrendingUp, Award
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'

const PlanDieta = ({ user }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alimentos, setAlimentos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [alimentosPorCategoria, setAlimentosPorCategoria] = useState({})
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [plato, setPlato] = useState([])
  const [showPlatoModal, setShowPlatoModal] = useState(false)
  const [alimentoSeleccionado, setAlimentoSeleccionado] = useState(null)
  const [gramosSeleccionados, setGramosSeleccionados] = useState(100)
  const [totalCaloriasPlato, setTotalCaloriasPlato] = useState(0)
  const [showCerrarPlatoModal, setShowCerrarPlatoModal] = useState(false)
  const [tiposComida, setTiposComida] = useState([])
  const [tipoComidaSeleccionado, setTipoComidaSeleccionado] = useState(null)
  const [notasPlato, setNotasPlato] = useState('')
  const [registrosComidas, setRegistrosComidas] = useState([])
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date())
  const [registrosPorComida, setRegistrosPorComida] = useState({})
  const [formData, setFormData] = useState({
    nombre: '',
    calorias_por_100g: '',
    categoria_id: ''
  })
  const [showFiltrosMovil, setShowFiltrosMovil] = useState(false)

  const isOnline = useOnlineStatus()

  const getLocalDate = (date = new Date()) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getIconoPorCategoria = () => <Apple className="w-4 h-4" />

  const getColorPorCategoria = (categoriaNombre) => {
    const colores = {
      'Pescados': 'text-blue-400', 'Mariscos': 'text-cyan-400', 'Aves': 'text-yellow-400',
      'Carnes': 'text-red-400', 'Hortalizas': 'text-green-400', 'Legumbres': 'text-lime-400',
      'Cereales': 'text-amber-400', 'Pastas': 'text-orange-400', 'Frutas': 'text-pink-400',
      'Frutos Secos': 'text-amber-600', 'Panadería': 'text-yellow-600', 'Aceites y Salsas': 'text-emerald-400',
      'Lácteos': 'text-sky-400', 'Quesos': 'text-indigo-400', 'Dulces': 'text-rose-400',
      'Postres': 'text-fuchsia-400', 'Embutidos': 'text-orange-700', 'Enlatados': 'text-gray-400',
      'Bebidas': 'text-teal-400'
    }
    return colores[categoriaNombre] || 'text-gray-400'
  }

  const getIconoPorTipoComida = (tipoNombre) => {
    const iconos = {
      'Desayuno': <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />,
      'Almuerzo': <Sun className="w-4 h-4 sm:w-5 sm:h-5" />,
      'Merienda': <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />,
      'Comida': <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
    }
    return iconos[tipoNombre] || <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
  }

  useEffect(() => {
    cargarDatos()
    cargarTiposComida()
  }, [])

  useEffect(() => {
    if (user && tiposComida.length > 0) {
      cargarRegistrosDelDia()
    }
  }, [fechaSeleccionada, user, tiposComida])

  useEffect(() => {
    const total = plato.reduce((sum, item) => {
      const calorias = (item.calorias_por_100g * item.gramos) / 100
      return sum + calorias
    }, 0)
    setTotalCaloriasPlato(total)
  }, [plato])

  const getAlimentosFiltradosPorCategoria = (categoriaId) => {
    const alimentosCat = alimentosPorCategoria[categoriaId] || []
    if (searchTerm === '') return alimentosCat
    return alimentosCat.filter(alimento =>
      alimento.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const cargarTiposComida = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_comida')
        .select('*')
        .order('orden', { ascending: true })

      if (error) throw error
      setTiposComida(data || [])
    } catch (error) {
      console.error('Error cargando tipos de comida:', error)
    }
  }

  const cargarRegistrosDelDia = async () => {
    const fechaLocal = getLocalDate(fechaSeleccionada)
    
    try {
      const { data, error } = await supabase
        .from('registro_comidas')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('fecha', fechaLocal)

      if (error) throw error

      setRegistrosComidas(data || [])
      
      const porComida = {}
      tiposComida.forEach(tipo => {
        const registro = data?.find(r => r.tipo_comida_id === tipo.id)
        porComida[tipo.id] = registro || {
          alimentos: [],
          total_calorias: 0,
          notas: ''
        }
      })
      setRegistrosPorComida(porComida)
    } catch (error) {
      console.error('Error cargando registros:', error)
    }
  }

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias_alimentos')
        .select('*')
        .order('nombre', { ascending: true })

      if (categoriasError) throw categoriasError
      setCategorias(categoriasData || [])

      const expandidas = {}
      categoriasData?.forEach(cat => {
        expandidas[cat.id] = true
      })
      setCategoriasExpandidas(expandidas)

      const { data: alimentosData, error: alimentosError } = await supabase
        .from('alimentos')
        .select('*, categorias_alimentos(nombre)')
        .order('nombre', { ascending: true })

      if (alimentosError) throw alimentosError
      setAlimentos(alimentosData || [])

      const agrupados = {}
      categoriasData?.forEach(cat => {
        agrupados[cat.id] = alimentosData?.filter(a => a.categoria_id === cat.id) || []
      })
      setAlimentosPorCategoria(agrupados)

    } catch (error) {
      console.error('Error cargando datos:', error)
      setErrorMessage('Error al cargar los datos')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const guardarPlato = async () => {
    if (!tipoComidaSeleccionado) {
      setErrorMessage('Selecciona un tipo de comida')
      return
    }

    if (plato.length === 0) {
      setErrorMessage('Agrega al menos un alimento al plato')
      return
    }

    if (!isOnline) {
      setErrorMessage('Sin conexión a internet')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setSaving(true)
    const fechaLocal = getLocalDate(fechaSeleccionada)

    const alimentosData = plato.map(item => ({
      id: item.id,
      nombre: item.nombre,
      gramos: item.gramos,
      calorias_por_100g: item.calorias_por_100g,
      calorias_totales: (item.calorias_por_100g * item.gramos) / 100
    }))

    try {
      const existingRegistro = registrosComidas.find(
        r => r.tipo_comida_id === tipoComidaSeleccionado
      )

      if (existingRegistro) {
        const alimentosActualizados = [...existingRegistro.alimentos, ...alimentosData]
        const totalCalorias = alimentosActualizados.reduce((sum, a) => sum + a.calorias_totales, 0)

        const { error } = await supabase
          .from('registro_comidas')
          .update({
            alimentos: alimentosActualizados,
            total_calorias: Math.round(totalCalorias),
            notas: notasPlato || existingRegistro.notas,
            updated_at: new Date()
          })
          .eq('id', existingRegistro.id)

        if (error) throw error
        setSuccessMessage(`Plato guardado en ${tiposComida.find(t => t.id === tipoComidaSeleccionado)?.nombre}`)
      } else {
        const { error } = await supabase
          .from('registro_comidas')
          .insert([{
            usuario_id: user.id,
            fecha: fechaLocal,
            tipo_comida_id: tipoComidaSeleccionado,
            alimentos: alimentosData,
            total_calorias: Math.round(totalCaloriasPlato),
            notas: notasPlato
          }])

        if (error) throw error
        setSuccessMessage(`Plato guardado en ${tiposComida.find(t => t.id === tipoComidaSeleccionado)?.nombre}`)
      }

      setTimeout(() => setSuccessMessage(''), 3000)
      
      setPlato([])
      setTipoComidaSeleccionado(null)
      setNotasPlato('')
      setShowCerrarPlatoModal(false)
      
      await cargarRegistrosDelDia()
    } catch (error) {
      console.error('Error guardando plato:', error)
      setErrorMessage('Error al guardar el plato')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const eliminarRegistroComida = async (registro) => {
    const tipoComida = tiposComida.find(t => t.id === registro.tipo_comida_id)
    if (!window.confirm(`¿Eliminar este registro de ${tipoComida?.nombre}?`)) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('registro_comidas')
        .delete()
        .eq('id', registro.id)

      if (error) throw error
      setSuccessMessage('Registro eliminado')
      setTimeout(() => setSuccessMessage(''), 3000)
      await cargarRegistrosDelDia()
    } catch (error) {
      console.error('Error eliminando registro:', error)
      setErrorMessage('Error al eliminar el registro')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const cambiarFecha = (dias) => {
    const nuevaFecha = new Date(fechaSeleccionada)
    nuevaFecha.setDate(nuevaFecha.getDate() + dias)
    setFechaSeleccionada(nuevaFecha)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isOnline) {
      setErrorMessage('Sin conexión a internet')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    if (!formData.nombre.trim()) {
      setErrorMessage('El nombre del alimento es obligatorio')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    if (!formData.calorias_por_100g || formData.calorias_por_100g <= 0) {
      setErrorMessage('Las calorías deben ser mayores a 0')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    if (!formData.categoria_id) {
      setErrorMessage('Selecciona una categoría')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (editando) {
        const { error } = await supabase
          .from('alimentos')
          .update({
            nombre: formData.nombre,
            calorias_por_100g: parseInt(formData.calorias_por_100g),
            categoria_id: parseInt(formData.categoria_id)
          })
          .eq('id', editando.id)

        if (error) throw error
        setSuccessMessage('Alimento actualizado correctamente')
      } else {
        const { error } = await supabase
          .from('alimentos')
          .insert([{
            nombre: formData.nombre,
            calorias_por_100g: parseInt(formData.calorias_por_100g),
            categoria_id: parseInt(formData.categoria_id)
          }])

        if (error) throw error
        setSuccessMessage('Alimento agregado correctamente')
      }

      setTimeout(() => setSuccessMessage(''), 3000)
      cerrarModal()
      cargarDatos()
    } catch (error) {
      console.error('Error guardando alimento:', error)
      if (error.code === '23505') {
        setErrorMessage('Ya existe un alimento con ese nombre')
      } else {
        setErrorMessage('Error al guardar el alimento')
      }
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const eliminarAlimento = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar "${nombre}" de la lista de alimentos?`)) return

    if (!isOnline) {
      setErrorMessage('Sin conexión a internet')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('alimentos')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSuccessMessage('Alimento eliminado')
      setTimeout(() => setSuccessMessage(''), 3000)
      cargarDatos()
    } catch (error) {
      console.error('Error eliminando alimento:', error)
      setErrorMessage('Error al eliminar el alimento')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const abrirModal = (alimento = null) => {
    if (alimento) {
      setEditando(alimento)
      setFormData({
        nombre: alimento.nombre,
        calorias_por_100g: alimento.calorias_por_100g,
        categoria_id: alimento.categoria_id
      })
    } else {
      setEditando(null)
      setFormData({
        nombre: '',
        calorias_por_100g: '',
        categoria_id: categorias[0]?.id || ''
      })
    }
    setShowModal(true)
  }

  const cerrarModal = () => {
    setShowModal(false)
    setEditando(null)
  }

  const toggleCategoria = (categoriaId) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [categoriaId]: !prev[categoriaId]
    }))
  }

  const agregarAlPlato = (alimento) => {
    setAlimentoSeleccionado(alimento)
    setGramosSeleccionados(100)
    setShowPlatoModal(true)
  }

  const confirmarAgregarPlato = () => {
    if (gramosSeleccionados <= 0) {
      setErrorMessage('La cantidad debe ser mayor a 0 gramos')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    const existe = plato.find(item => item.id === alimentoSeleccionado.id)
    if (existe) {
      setPlato(plato.map(item =>
        item.id === alimentoSeleccionado.id
          ? { ...item, gramos: item.gramos + gramosSeleccionados }
          : item
      ))
    } else {
      setPlato([...plato, {
        ...alimentoSeleccionado,
        gramos: gramosSeleccionados
      }])
    }
    setShowPlatoModal(false)
    setAlimentoSeleccionado(null)
    setGramosSeleccionados(100)
  }

  const eliminarDelPlato = (id) => {
    setPlato(plato.filter(item => item.id !== id))
  }

  const actualizarGramosPlato = (id, nuevosGramos) => {
    if (nuevosGramos <= 0) {
      eliminarDelPlato(id)
    } else {
      setPlato(plato.map(item =>
        item.id === id ? { ...item, gramos: nuevosGramos } : item
      ))
    }
  }

  const limpiarPlato = () => {
    if (window.confirm('¿Limpiar todo el plato?')) {
      setPlato([])
    }
  }

  const abrirCerrarPlato = () => {
    if (plato.length === 0) {
      setErrorMessage('Agrega alimentos al plato primero')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }
    setShowCerrarPlatoModal(true)
  }

  const totalCaloriasDia = Object.values(registrosPorComida).reduce(
    (sum, registro) => sum + (registro.total_calorias || 0), 0
  )

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#e31837]/10 rounded-lg">
              <Utensils className="w-5 h-5 text-[#e31837]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Plan de Dieta</h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">Controla tus alimentos y calorías por categoría</p>
            </div>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-[#e31837] hover:bg-[#b8102a] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Alimento</span>
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

        {/* Selector de fecha Responsive */}
        <div className="mb-6 bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => cambiarFecha(-1)}
              className="w-full sm:w-auto px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-lg text-white transition-all text-sm"
            >
              ← Día anterior
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-white text-sm sm:text-lg font-medium text-center">
                {fechaSeleccionada.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <button
              onClick={() => cambiarFecha(1)}
              className="w-full sm:w-auto px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-lg text-white transition-all text-sm"
            >
              Día siguiente →
            </button>
          </div>
        </div>

        {/* Resumen del día Responsive */}
        <div className="mb-6 bg-gradient-to-r from-[#e31837]/20 to-[#1a1a1a] border border-[#e31837]/30 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-center sm:text-left">
              <p className="text-gray-300 text-sm">Total del día</p>
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-400" />
                <p className="text-2xl sm:text-3xl font-bold text-white">{Math.round(totalCaloriasDia)}</p>
                <span className="text-gray-400">calorías</span>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-gray-300 text-sm">Meta diaria</p>
              <p className="text-xl font-bold text-white">2000</p>
              <p className="text-gray-400 text-sm">kcal</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-[#2d2d2d] rounded-full h-2">
            <div 
              className="bg-[#e31837] h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalCaloriasDia / 2000) * 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo: Lista de alimentos por categoría */}
          <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl overflow-hidden">
            <div className="bg-[#0f0f0f] px-4 sm:px-6 py-4 border-b border-[#2d2d2d]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#e31837]/10 rounded-lg">
                    <Utensils className="w-5 h-5 text-[#e31837]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Lista de Alimentos</h2>
                    <p className="text-gray-400 text-xs sm:text-sm">Calorías por cada 100 gramos</p>
                  </div>
                </div>
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar alimento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white text-sm focus:outline-none focus:border-[#e31837]"
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[550px]">
              {categorias.map((categoria) => {
                const alimentosCat = getAlimentosFiltradosPorCategoria(categoria.id)
                if (alimentosCat.length === 0 && searchTerm !== '') return null
                if (alimentosCat.length === 0 && searchTerm === '') return null
                
                return (
                  <div key={categoria.id} className="border-b border-[#2d2d2d] last:border-b-0">
                    <button
                      onClick={() => toggleCategoria(categoria.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#0f0f0f]/80 hover:bg-[#1a1a1a] transition-all"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`p-1.5 rounded-lg bg-white/5 ${getColorPorCategoria(categoria.nombre)}`}>
                          {getIconoPorCategoria()}
                        </div>
                        <span className="text-white font-medium text-sm">{categoria.nombre}</span>
                        <span className="text-gray-500 text-xs">({alimentosCat.length})</span>
                      </div>
                      <div className="text-gray-400">
                        {categoriasExpandidas[categoria.id] ? 
                          <ChevronDown className="w-4 h-4" /> : 
                          <ChevronRight className="w-4 h-4" />
                        }
                      </div>
                    </button>
                    
                    {categoriasExpandidas[categoria.id] && (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[400px]">
                          <thead className="bg-[#0f0f0f]">
                            <tr>
                              <th className="text-left px-3 sm:px-4 py-2 text-gray-500 text-xs font-medium">Alimento</th>
                              <th className="text-center px-3 sm:px-4 py-2 text-gray-500 text-xs font-medium">Calorías</th>
                              <th className="text-center px-3 sm:px-4 py-2 text-gray-500 text-xs font-medium">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alimentosCat.map((alimento) => (
                              <tr key={alimento.id} className="border-t border-[#2d2d2d] hover:bg-[#2d2d2d]/30 transition-all">
                                <td className="px-3 sm:px-4 py-2">
                                  <span className="text-white text-sm">{alimento.nombre}</span>
                                 </td>
                                <td className="px-3 sm:px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Flame className="w-3 h-3 text-orange-400" />
                                    <span className="text-white text-sm">{alimento.calorias_por_100g}</span>
                                  </div>
                                 </td>
                                <td className="px-3 sm:px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                                    <button
                                      onClick={() => agregarAlPlato(alimento)}
                                      className="p-1 text-green-400 hover:text-green-300 transition-all"
                                      title="Agregar al plato"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => abrirModal(alimento)}
                                      className="p-1 text-blue-400 hover:text-blue-300 transition-all"
                                      title="Editar"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => eliminarAlimento(alimento.id, alimento.nombre)}
                                      className="p-1 text-red-400 hover:text-red-300 transition-all"
                                      title="Eliminar"
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
                    )}
                  </div>
                )
              })}
              
              {alimentos.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Apple className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p>No hay alimentos registrados</p>
                  <button
                    onClick={() => abrirModal()}
                    className="mt-3 text-[#e31837] hover:underline text-sm"
                  >
                    Agregar tu primer alimento →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho: Mi Plato y Registros del día */}
          <div className="space-y-6">
            {/* Mi Plato */}
            <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl overflow-hidden">
              <div className="bg-[#0f0f0f] px-4 sm:px-6 py-4 border-b border-[#2d2d2d]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#e31837]/10 rounded-lg">
                      <Calculator className="w-5 h-5 text-[#e31837]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Mi Plato</h2>
                      <p className="text-gray-400 text-xs sm:text-sm">Agrega alimentos y calcula calorías</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {plato.length > 0 && (
                      <>
                        <button
                          onClick={limpiarPlato}
                          className="text-red-400 hover:text-red-300 text-xs sm:text-sm flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg bg-red-400/10"
                        >
                          <Trash className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Limpiar</span>
                        </button>
                        <button
                          onClick={abrirCerrarPlato}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg"
                        >
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Cerrar Plato</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-6">
                {plato.length > 0 && (
                  <div className="bg-gradient-to-r from-orange-500/10 to-[#1a1a1a] border border-orange-500/30 rounded-xl p-3 sm:p-4 mb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="text-center sm:text-left">
                        <p className="text-gray-400 text-sm">Total del plato actual</p>
                        <div className="flex items-center gap-2">
                          <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                          <p className="text-2xl sm:text-3xl font-bold text-white">{Math.round(totalCaloriasPlato)}</p>
                          <span className="text-gray-400">calorías</span>
                        </div>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="text-gray-400 text-sm">{plato.length} alimentos</p>
                        <p className="text-gray-500 text-xs">
                          {plato.reduce((sum, item) => sum + item.gramos, 0)} gramos totales
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {plato.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Utensils className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                    <p>Tu plato está vacío</p>
                    <p className="text-sm mt-2">Agrega alimentos desde la lista de la izquierda</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {plato.map((item) => {
                      const caloriasItem = (item.calorias_por_100g * item.gramos) / 100
                      return (
                        <div key={item.id} className="bg-[#0f0f0f]/50 rounded-lg p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="text-gray-400">
                                <Apple className="w-4 h-4" />
                              </div>
                              <h3 className="text-white font-medium">{item.nombre}</h3>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3">
                              <div className="flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-400" />
                                <span className="text-orange-400 text-sm font-medium">{Math.round(caloriasItem)}</span>
                                <span className="text-gray-500 text-xs">kcal</span>
                              </div>
                              <button
                                onClick={() => eliminarDelPlato(item.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Scale className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <input
                              type="range"
                              min="0"
                              max="500"
                              value={item.gramos}
                              onChange={(e) => actualizarGramosPlato(item.id, parseInt(e.target.value))}
                              className="flex-1 h-1.5 bg-[#2d2d2d] rounded-lg appearance-none cursor-pointer accent-[#e31837]"
                            />
                            <span className="text-white text-sm w-16 text-right">{item.gramos} g</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Registros del día - Responsive */}
            <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl overflow-hidden">
              <div className="bg-[#0f0f0f] px-4 sm:px-6 py-4 border-b border-[#2d2d2d]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#e31837]/10 rounded-lg">
                    <Clock className="w-5 h-5 text-[#e31837]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Comidas del Día</h2>
                    <p className="text-gray-400 text-xs sm:text-sm">Registro de lo que has comido</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {tiposComida.map((tipo) => {
                    const registro = registrosPorComida[tipo.id]
                    const tieneRegistro = registro && registro.alimentos && registro.alimentos.length > 0
                    
                    return (
                      <div key={tipo.id} className="bg-[#0f0f0f]/50 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="text-[#e31837]">
                              {getIconoPorTipoComida(tipo.nombre)}
                            </div>
                            <h3 className="text-white font-medium text-sm sm:text-base">{tipo.nombre}</h3>
                          </div>
                          {tieneRegistro && (
                            <button
                              onClick={() => eliminarRegistroComida(registro)}
                              className="text-red-400 hover:text-red-300"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        {tieneRegistro ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <Flame className="w-4 h-4 text-orange-400" />
                              <span className="text-white font-bold">{Math.round(registro.total_calorias)}</span>
                              <span className="text-gray-400 text-xs">calorías</span>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {registro.alimentos.map((alimento, idx) => (
                                <div key={idx} className="text-xs text-gray-300 flex justify-between">
                                  <span className="truncate">{alimento.nombre}</span>
                                  <span className="text-gray-400 flex-shrink-0 ml-2">{alimento.gramos}g</span>
                                </div>
                              ))}
                            </div>
                            {registro.notas && (
                              <p className="text-xs text-gray-500 mt-2 break-words">{registro.notas}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-500 text-sm">Sin registrar</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de agregar/editar alimento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-md">
            <div className="border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {editando ? 'Editar Alimento' : 'Agregar Alimento'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Nombre del alimento</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Ej: Manzana, Pollo, Arroz"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Categoría</label>
                <select
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  required
                >
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Calorías por 100g</label>
                <input
                  type="number"
                  step="1"
                  value={formData.calorias_por_100g}
                  onChange={(e) => setFormData({...formData, calorias_por_100g: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Ej: 52"
                  required
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

      {/* Modal de agregar al plato */}
      {showPlatoModal && alimentoSeleccionado && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-md">
            <div className="border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Agregar al Plato</h2>
                <p className="text-gray-400 text-sm">{alimentoSeleccionado.nombre}</p>
              </div>
              <button onClick={() => setShowPlatoModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Cantidad (gramos)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="500"
                    value={gramosSeleccionados}
                    onChange={(e) => setGramosSeleccionados(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-[#2d2d2d] rounded-lg appearance-none cursor-pointer accent-[#e31837]"
                  />
                  <input
                    type="number"
                    value={gramosSeleccionados}
                    onChange={(e) => setGramosSeleccionados(parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white text-center text-sm focus:outline-none focus:border-[#e31837]"
                  />
                  <span className="text-gray-400">g</span>
                </div>
              </div>
              <div className="bg-[#0f0f0f]/50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Calorías estimadas</span>
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-white text-xl font-bold">
                      {Math.round((alimentoSeleccionado.calorias_por_100g * gramosSeleccionados) / 100)}
                    </span>
                    <span className="text-gray-400">kcal</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowPlatoModal(false)} className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg text-sm">
                  Cancelar
                </button>
                <button onClick={confirmarAgregarPlato} className="flex-1 px-4 py-2 bg-[#e31837] hover:bg-[#b8102a] text-white rounded-lg flex items-center justify-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  Agregar al Plato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cerrar plato */}
      {showCerrarPlatoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-md">
            <div className="border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-white">Guardar Plato</h2>
              <button onClick={() => setShowCerrarPlatoModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Tipo de comida</label>
                <div className="grid grid-cols-2 gap-2">
                  {tiposComida.map((tipo) => (
                    <button
                      key={tipo.id}
                      type="button"
                      onClick={() => setTipoComidaSeleccionado(tipo.id)}
                      className={`p-2 sm:p-3 rounded-lg border transition-all flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm ${
                        tipoComidaSeleccionado === tipo.id
                          ? 'border-[#e31837] bg-[#e31837]/10 text-white'
                          : 'border-[#2d2d2d] bg-[#0f0f0f] text-gray-400 hover:border-[#e31837]/50'
                      }`}
                    >
                      {getIconoPorTipoComida(tipo.nombre)}
                      <span>{tipo.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-1">Notas (opcional)</label>
                <textarea
                  value={notasPlato}
                  onChange={(e) => setNotasPlato(e.target.value)}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] resize-none text-sm"
                  rows="3"
                  placeholder="Ej: Desayuno liviano, Almuerzo completo..."
                />
              </div>

              <div className="bg-[#0f0f0f]/50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total del plato</span>
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-white text-xl font-bold">{Math.round(totalCaloriasPlato)}</span>
                    <span className="text-gray-400">kcal</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-gray-500">{plato.length} alimentos</span>
                  <span className="text-gray-500">{plato.reduce((sum, item) => sum + item.gramos, 0)} gramos</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowCerrarPlatoModal(false)} className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg text-sm">
                  Cancelar
                </button>
                <button onClick={guardarPlato} disabled={saving} className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 text-sm">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle className="w-4 h-4" /><span>Guardar</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlanDieta