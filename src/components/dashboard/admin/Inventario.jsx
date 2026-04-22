import React, { useState, useEffect, useCallback } from 'react'
import {
  Package, Plus, Edit, Trash2, Search, X, Save, 
  Dumbbell, Weight, Watch, Shirt, Tag,
  AlertCircle, TrendingUp, TrendingDown, WifiOff,
  Layers, DollarSign, MapPin, Truck, ChevronDown, ChevronUp
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'

const Inventario = () => {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', icono: 'Package', descripcion: '' })
  const [formData, setFormData] = useState({
    nombre: '',
    categoria_id: '',
    cantidad: 0,
    cantidad_minima: 0,
    ubicacion: '',
    descripcion: '',
    precio_compra: '',
    precio_venta: '',
    proveedor: ''
  })

  const isOnline = useOnlineStatus()

  const iconosDisponibles = [
    { nombre: 'Dumbbell', icono: <Dumbbell className="w-4 h-4" /> },
    { nombre: 'Weight', icono: <Weight className="w-4 h-4" /> },
    { nombre: 'Package', icono: <Package className="w-4 h-4" /> },
    { nombre: 'Watch', icono: <Watch className="w-4 h-4" /> },
    { nombre: 'Shirt', icono: <Shirt className="w-4 h-4" /> },
    { nombre: 'Tag', icono: <Tag className="w-4 h-4" /> },
    { nombre: 'Layers', icono: <Layers className="w-4 h-4" /> },
    { nombre: 'Truck', icono: <Truck className="w-4 h-4" /> }
  ]

  const cargarCategorias = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_inventario')
        .select('*')
        .order('nombre')
      
      if (error) throw error
      setCategorias(data || [])
      if (data && data.length > 0 && !categoriaSeleccionada) {
        setCategoriaSeleccionada(data[0].id)
      }
    } catch (error) {
      console.error('Error cargando categorías:', error)
    }
  }, [categoriaSeleccionada])

  const cargarProductos = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*, categorias_inventario(nombre, icono)')
        .order('nombre')
      
      if (error) throw error
      setProductos(data || [])
    } catch (error) {
      setErrorMessage('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOnline) {
      cargarCategorias()
      cargarProductos()
    }
  }, [isOnline, cargarCategorias, cargarProductos])

  const registrarLog = async (accion, entidad, entidadId, detalle) => {
    try {
      await supabase.from('logs_actividad').insert([{
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isOnline) {
      setErrorMessage('No hay conexión a internet.')
      return
    }
    
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    
    try {
      if (editando) {
        const { error } = await supabase
          .from('inventario')
          .update({
            nombre: formData.nombre,
            categoria_id: formData.categoria_id,
            cantidad: parseInt(formData.cantidad) || 0,
            cantidad_minima: parseInt(formData.cantidad_minima) || 0,
            ubicacion: formData.ubicacion,
            descripcion: formData.descripcion,
            precio_compra: parseFloat(formData.precio_compra) || 0,
            precio_venta: parseFloat(formData.precio_venta) || 0,
            proveedor: formData.proveedor,
            ultima_actualizacion: new Date().toISOString()
          })
          .eq('id', editando.id)
        
        if (error) throw error
        
        await registrarLog('editar', 'producto', editando.id, `Producto editado: ${formData.nombre}`)
        setSuccessMessage('Producto actualizado correctamente')
      } else {
        const { data, error } = await supabase
          .from('inventario')
          .insert([{
            nombre: formData.nombre,
            categoria_id: formData.categoria_id,
            cantidad: parseInt(formData.cantidad) || 0,
            cantidad_minima: parseInt(formData.cantidad_minima) || 0,
            ubicacion: formData.ubicacion,
            descripcion: formData.descripcion,
            precio_compra: parseFloat(formData.precio_compra) || 0,
            precio_venta: parseFloat(formData.precio_venta) || 0,
            proveedor: formData.proveedor,
            fecha_ingreso: new Date().toISOString().split('T')[0]
          }])
          .select()
        
        if (error) throw error
        
        await registrarLog('crear', 'producto', data[0]?.id, `Producto creado: ${formData.nombre}`)
        setSuccessMessage('Producto creado correctamente')
      }
      
      setTimeout(() => setSuccessMessage(''), 3000)
      cerrarModal()
      cargarProductos()
    } catch (error) {
      setErrorMessage('Error al guardar el producto.')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const eliminarProducto = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar producto "${nombre}"?`)) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('inventario')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await registrarLog('eliminar', 'producto', id, `Producto eliminado: ${nombre}`)
      setSuccessMessage('Producto eliminado')
      setTimeout(() => setSuccessMessage(''), 3000)
      cargarProductos()
    } catch (error) {
      setErrorMessage('Error al eliminar.')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const agregarCategoria = async () => {
    if (!nuevaCategoria.nombre.trim()) {
      setErrorMessage('Ingrese un nombre para la categoría')
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('categorias_inventario')
        .insert([{ nombre: nuevaCategoria.nombre, icono: nuevaCategoria.icono, descripcion: nuevaCategoria.descripcion }])
        .select()
      
      if (error) throw error
      
      await registrarLog('crear', 'categoria', data[0]?.id, `Categoría creada: ${nuevaCategoria.nombre}`)
      setSuccessMessage('Categoría creada correctamente')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowCategoriaModal(false)
      setNuevaCategoria({ nombre: '', icono: 'Package', descripcion: '' })
      cargarCategorias()
    } catch (error) {
      if (error.code === '23505') {
        setErrorMessage('Ya existe una categoría con ese nombre')
      } else {
        setErrorMessage('Error al crear la categoría')
      }
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const eliminarCategoria = async (id, nombre) => {
    const productosEnCategoria = productos.filter(p => p.categoria_id === id)
    if (productosEnCategoria.length > 0) {
      setErrorMessage(`No se puede eliminar la categoría "${nombre}" porque tiene ${productosEnCategoria.length} productos asociados.`)
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }
    
    if (!window.confirm(`¿Eliminar categoría "${nombre}"?`)) return
    
    try {
      const { error } = await supabase
        .from('categorias_inventario')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await registrarLog('eliminar', 'categoria', id, `Categoría eliminada: ${nombre}`)
      setSuccessMessage('Categoría eliminada')
      setTimeout(() => setSuccessMessage(''), 3000)
      cargarCategorias()
    } catch (error) {
      setErrorMessage('Error al eliminar la categoría.')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const abrirModal = (producto = null) => {
    if (producto) {
      setEditando(producto)
      setFormData({
        nombre: producto.nombre,
        categoria_id: producto.categoria_id,
        cantidad: producto.cantidad,
        cantidad_minima: producto.cantidad_minima,
        ubicacion: producto.ubicacion || '',
        descripcion: producto.descripcion || '',
        precio_compra: producto.precio_compra || '',
        precio_venta: producto.precio_venta || '',
        proveedor: producto.proveedor || ''
      })
    } else {
      setEditando(null)
      setFormData({
        nombre: '',
        categoria_id: categorias[0]?.id || '',
        cantidad: 0,
        cantidad_minima: 0,
        ubicacion: '',
        descripcion: '',
        precio_compra: '',
        precio_venta: '',
        proveedor: ''
      })
    }
    setModalOpen(true)
  }

  const cerrarModal = () => {
    setModalOpen(false)
    setEditando(null)
  }

  const productosFiltrados = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (producto.proveedor && producto.proveedor.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const productosPorCategoria = (categoriaId) => {
    return productosFiltrados.filter(p => p.categoria_id === categoriaId)
  }

  const getIconoPorNombre = (iconoNombre) => {
    const icono = iconosDisponibles.find(i => i.nombre === iconoNombre)
    return icono ? icono.icono : <Package className="w-4 h-4" />
  }

  const getColorStock = (cantidad, minima) => {
    if (cantidad <= 0) return 'text-red-400 bg-red-500/10'
    if (cantidad <= minima) return 'text-yellow-400 bg-yellow-500/10'
    return 'text-green-400 bg-green-500/10'
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header fijo - Responsive */}
      <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#e31837]/10 rounded-lg">
              <Package className="w-5 h-5 text-[#e31837]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Inventario</h1>
              <p className="text-gray-400 text-xs sm:text-sm">Gestión de máquinas, pesas, suplementos y más</p>
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

        {/* Barra de búsqueda y botones - Responsive */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar producto o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowCategoriaModal(true)}
              className="bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>Agregar Categoría</span>
            </button>
            <button
              onClick={() => abrirModal()}
              disabled={!isOnline}
              className="bg-[#e31837] hover:bg-[#b8102a] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Producto</span>
            </button>
          </div>
        </div>

        {/* Listado por categorías */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#e31837]/30 border-t-[#e31837] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {categorias.map(categoria => {
              const productosCat = productosPorCategoria(categoria.id)
              if (productosCat.length === 0 && searchTerm === '') return null
              if (searchTerm !== '' && productosCat.length === 0) return null
              
              return (
                <div key={categoria.id} className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl overflow-hidden">
                  {/* Header de categoría */}
                  <div className="bg-[#0f0f0f] px-4 sm:px-6 py-3 border-b border-[#2d2d2d]">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#e31837]/10 rounded-lg text-[#e31837]">
                          {getIconoPorNombre(categoria.icono)}
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-bold text-white">{categoria.nombre}</h2>
                          <p className="text-gray-400 text-xs">{productosCat.length} productos</p>
                        </div>
                      </div>
                      <button
                        onClick={() => eliminarCategoria(categoria.id, categoria.nombre)}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-all"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Tabla de productos - Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-[#1a1a1a]/50">
                        <tr>
                          <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Producto</th>
                          <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Cantidad</th>
                          <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase hidden lg:table-cell">Ubicación</th>
                          <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Precio Venta</th>
                          <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase hidden xl:table-cell">Proveedor</th>
                          <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosCat.map((producto) => (
                          <tr key={producto.id} className="border-b border-[#2d2d2d] hover:bg-[#2d2d2d]/50 transition-all">
                            <td className="px-4 sm:px-6 py-3">
                              <div>
                                <p className="text-white text-sm font-medium">{producto.nombre}</p>
                                {producto.descripcion && (
                                  <p className="text-gray-500 text-xs hidden sm:block">{producto.descripcion.substring(0, 50)}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getColorStock(producto.cantidad, producto.cantidad_minima)}`}>
                                  {producto.cantidad <= producto.cantidad_minima && producto.cantidad > 0 && <AlertCircle className="w-3 h-3" />}
                                  {producto.cantidad === 0 && <TrendingDown className="w-3 h-3" />}
                                  {producto.cantidad > producto.cantidad_minima && <TrendingUp className="w-3 h-3" />}
                                  {producto.cantidad} uds
                                </span>
                                {producto.cantidad <= producto.cantidad_minima && producto.cantidad > 0 && (
                                  <span className="text-yellow-500 text-[10px]">Stock bajo</span>
                                )}
                                {producto.cantidad === 0 && (
                                  <span className="text-red-400 text-[10px]">Sin stock</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3 hidden lg:table-cell">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-400 text-sm">{producto.ubicacion || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-green-400" />
                                <span className="text-white text-sm font-medium">${producto.precio_venta?.toLocaleString() || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3 hidden xl:table-cell">
                              <div className="flex items-center gap-1">
                                <Truck className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-400 text-sm">{producto.proveedor || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => abrirModal(producto)}
                                  className="p-1 text-gray-400 hover:text-blue-400 transition-all"
                                  title="Editar producto"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => eliminarProducto(producto.id, producto.nombre)}
                                  className="p-1 text-gray-400 hover:text-red-400 transition-all"
                                  title="Eliminar producto"
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

                  {/* Tarjetas de productos - Móvil */}
                  <div className="md:hidden divide-y divide-[#2d2d2d]">
                    {productosCat.map((producto) => (
                      <div key={producto.id} className="p-4 hover:bg-[#2d2d2d]/30 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-white font-medium">{producto.nombre}</p>
                            {producto.descripcion && (
                              <p className="text-gray-500 text-xs mt-0.5">{producto.descripcion.substring(0, 40)}</p>
                            )}
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getColorStock(producto.cantidad, producto.cantidad_minima)}`}>
                            {producto.cantidad} uds
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div className="flex items-center gap-1 text-gray-400">
                            <MapPin className="w-3 h-3" />
                            <span>{producto.ubicacion || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-400">
                            <DollarSign className="w-3 h-3" />
                            <span>${producto.precio_venta?.toLocaleString() || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 col-span-2">
                            <Truck className="w-3 h-3" />
                            <span>{producto.proveedor || 'Sin proveedor'}</span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-3 pt-2 border-t border-[#2d2d2d]/50">
                          <button
                            onClick={() => abrirModal(producto)}
                            className="p-1.5 text-gray-400 hover:text-blue-400 transition-all rounded-lg flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            <span className="text-xs">Editar</span>
                          </button>
                          <button
                            onClick={() => eliminarProducto(producto.id, producto.nombre)}
                            className="p-1.5 text-gray-400 hover:text-red-400 transition-all rounded-lg flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-xs">Eliminar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            
            {productosFiltrados.length === 0 && (
              <div className="text-center py-12 text-gray-400 bg-[#1a1a1a]/50 rounded-xl">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p>No hay productos registrados</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de producto */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-[#2d2d2d] sticky top-0 bg-[#1a1a1a]">
              <h2 className="text-xl font-bold text-white">{editando ? 'Editar Producto' : 'Agregar Producto'}</h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Nombre del producto *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Categoría *</label>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Cantidad</label>
                  <input
                    type="number"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Stock mínimo</label>
                  <input
                    type="number"
                    value={formData.cantidad_minima}
                    onChange={(e) => setFormData({...formData, cantidad_minima: e.target.value})}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Ubicación</label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Ej: Estante A, Sala 1, Depósito"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Descripción del producto"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Precio de compra</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData.precio_compra}
                      onChange={(e) => setFormData({...formData, precio_compra: e.target.value})}
                      className="w-full pl-8 pr-4 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Precio de venta</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData.precio_venta}
                      onChange={(e) => setFormData({...formData, precio_venta: e.target.value})}
                      className="w-full pl-8 pr-4 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Proveedor</label>
                <input
                  type="text"
                  value={formData.proveedor}
                  onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={cerrarModal} className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-[#e31837] hover:bg-[#b8102a] text-white rounded-lg flex items-center justify-center gap-2 text-sm">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Save className="w-4 h-4" /><span>{editando ? 'Actualizar' : 'Crear'}</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de categoría */}
      {showCategoriaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-[#2d2d2d]">
              <h2 className="text-xl font-bold text-white">Agregar Categoría</h2>
              <button onClick={() => setShowCategoriaModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Nombre de la categoría</label>
                <input
                  type="text"
                  value={nuevaCategoria.nombre}
                  onChange={(e) => setNuevaCategoria({...nuevaCategoria, nombre: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Ej: Máquinas, Pesas, Suplementos"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Icono</label>
                <div className="grid grid-cols-4 gap-2">
                  {iconosDisponibles.map((icono) => (
                    <button
                      key={icono.nombre}
                      type="button"
                      onClick={() => setNuevaCategoria({...nuevaCategoria, icono: icono.nombre})}
                      className={`p-2 rounded-lg border transition-all ${
                        nuevaCategoria.icono === icono.nombre
                          ? 'bg-[#e31837]/20 border-[#e31837] text-[#e31837]'
                          : 'bg-[#2d2d2d] border-[#3d3d3d] text-gray-400 hover:text-white'
                      }`}
                    >
                      {icono.icono}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Descripción (opcional)</label>
                <textarea
                  value={nuevaCategoria.descripcion}
                  onChange={(e) => setNuevaCategoria({...nuevaCategoria, descripcion: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  placeholder="Descripción de la categoría"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowCategoriaModal(false)} className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg text-sm">
                  Cancelar
                </button>
                <button onClick={agregarCategoria} className="flex-1 px-4 py-2 bg-[#e31837] hover:bg-[#b8102a] text-white rounded-lg text-sm">
                  Crear Categoría
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventario