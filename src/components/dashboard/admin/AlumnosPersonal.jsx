import React, { useState, useEffect, useCallback } from 'react'
import { 
  Users, Search, X, UserPlus, Edit, Trash2, Shield, UserCheck, Activity, WifiOff, Save, ChevronDown, ChevronUp, Mail, Phone, AlertCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import SolicitudesRegistro from './SolicitudesRegistro'

const AlumnosPersonal = ({ onUsuarioCambiado }) => {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalErrorMessage, setModalErrorMessage] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre_completo: '',
    rol: 'alumno',
    email: '',
    telefono: ''
  })
  const [showSolicitudes, setShowSolicitudes] = useState(false)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0)
  const [verificando, setVerificando] = useState(false)

  const isOnline = navigator.onLine

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

  const cargarSolicitudesPendientes = async () => {
    try {
      const { count, error } = await supabase
        .from('solicitudes_registro')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
      
      if (!error) {
        setSolicitudesPendientes(count || 0)
      }
    } catch (error) {
      console.error('Error cargando contador de solicitudes:', error)
    }
  }

  const cargarUsuarios = useCallback(async () => {
    if (!isOnline) {
      setErrorMessage('Sin conexión a internet.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('id', { ascending: false })
      
      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      setErrorMessage('Error al cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }, [isOnline])

  useEffect(() => {
    if (isOnline) {
      cargarUsuarios()
      cargarSolicitudesPendientes()
    }
  }, [isOnline, cargarUsuarios])

  const verificarUsernameExistente = async (username, userIdExcluir = null) => {
    try {
      let query = supabase
        .from('users')
        .select('id, username')
        .eq('username', username)
      
      if (userIdExcluir) {
        query = query.neq('id', userIdExcluir)
      }
      
      const { data, error } = await query.maybeSingle()
      
      if (error) throw error
      
      return !!data
    } catch (error) {
      console.error('Error verificando username:', error)
      return false
    }
  }

  const verificarEmailExistente = async (email, userIdExcluir = null) => {
    if (!email || email.trim() === '') return false
    
    try {
      let query = supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
      
      if (userIdExcluir) {
        query = query.neq('id', userIdExcluir)
      }
      
      const { data, error } = await query.maybeSingle()
      
      if (error) throw error
      
      return !!data
    } catch (error) {
      console.error('Error verificando email:', error)
      return false
    }
  }

  const verificarUsernameEnTiempoReal = async (username) => {
    if (!username || username.trim() === '') {
      setModalErrorMessage('')
      return
    }
    
    const existe = await verificarUsernameExistente(username, editando ? editando.id : null)
    
    if (existe) {
      setModalErrorMessage(`El nombre de usuario "${username}" ya está en uso. Elegí otro.`)
    } else {
      setModalErrorMessage('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isOnline) {
      setModalErrorMessage('No hay conexión a internet.')
      return
    }
    
    if (!formData.username.trim()) {
      setModalErrorMessage('El nombre de usuario es obligatorio.')
      return
    }
    
    if (!editando && !formData.password.trim()) {
      setModalErrorMessage('La contraseña es obligatoria para usuarios nuevos.')
      return
    }
    
    if (!formData.nombre_completo.trim()) {
      setModalErrorMessage('El nombre completo es obligatorio.')
      return
    }
    
    setVerificando(true)
    setLoading(true)
    setModalErrorMessage('')
    
    try {
      const usernameExiste = await verificarUsernameExistente(
        formData.username, 
        editando ? editando.id : null
      )
      
      if (usernameExiste) {
        setModalErrorMessage(`El nombre de usuario "${formData.username}" ya está en uso. Por favor, elegí otro.`)
        setVerificando(false)
        setLoading(false)
        return
      }
      
      if (formData.email && formData.email.trim() !== '') {
        const emailExiste = await verificarEmailExistente(
          formData.email, 
          editando ? editando.id : null
        )
        
        if (emailExiste) {
          setModalErrorMessage(`El email "${formData.email}" ya está registrado por otro usuario.`)
          setVerificando(false)
          setLoading(false)
          return
        }
      }
      
      if (editando) {
        const updateData = {
          username: formData.username,
          nombre_completo: formData.nombre_completo,
          email: formData.email || null,
          telefono: formData.telefono || null,
          rol: formData.rol
        }
        
        if (formData.password && formData.password.trim() !== '') {
          updateData.password = formData.password
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editando.id)
        
        if (error) {
          if (error.code === '23505') {
            if (error.message.includes('username')) {
              setModalErrorMessage(`El nombre de usuario "${formData.username}" ya está en uso.`)
            } else if (error.message.includes('email')) {
              setModalErrorMessage(`El email "${formData.email}" ya está registrado.`)
            } else {
              setModalErrorMessage('Ya existe un usuario con esos datos.')
            }
          } else {
            throw error
          }
          return
        }
        
        await registrarLog('editar', 'usuario', editando.id, `Usuario editado: ${formData.username} - ${formData.nombre_completo}`)
        setSuccessMessage('Usuario actualizado correctamente')
      } else {
        const { data, error } = await supabase
          .from('users')
          .insert([{
            username: formData.username,
            password: formData.password,
            nombre_completo: formData.nombre_completo,
            rol: formData.rol,
            email: formData.email || null,
            telefono: formData.telefono || null,
            created_at: new Date().toISOString()
          }])
          .select()
        
        if (error) {
          if (error.code === '23505') {
            if (error.message.includes('username')) {
              setModalErrorMessage(`El nombre de usuario "${formData.username}" ya existe. Elegí otro.`)
            } else if (error.message.includes('email')) {
              setModalErrorMessage(`El email "${formData.email}" ya está registrado.`)
            } else {
              setModalErrorMessage('Ya existe un usuario con esos datos. Verificá que el nombre de usuario y email sean únicos.')
            }
          } else {
            throw error
          }
          return
        }
        
        await registrarLog('crear', 'usuario', data[0]?.id, `Usuario creado: ${formData.username} - ${formData.nombre_completo}`)
        setSuccessMessage('Usuario creado correctamente')
      }
      
      setTimeout(() => setSuccessMessage(''), 3000)
      cerrarModal()
      await cargarUsuarios()
      if (onUsuarioCambiado) onUsuarioCambiado()
    } catch (error) {
      console.error('Error completo:', error)
      setModalErrorMessage('Error al guardar el usuario. Verificá los datos e intentá nuevamente.')
    } finally {
      setVerificando(false)
      setLoading(false)
    }
  }

  const eliminarUsuario = async (id, username, nombre) => {
    if (username === 'admin') {
      setErrorMessage('No se puede eliminar al administrador principal.')
      return
    }

    if (!window.confirm(`¿Estás seguro de que querés eliminar al usuario "${username}"?`)) return
    
    setLoading(true)
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await registrarLog('eliminar', 'usuario', id, `Usuario eliminado: ${username} - ${nombre}`)
      setSuccessMessage('Usuario eliminado correctamente')
      setTimeout(() => setSuccessMessage(''), 3000)
      await cargarUsuarios()
      if (onUsuarioCambiado) onUsuarioCambiado()
    } catch (error) {
      setErrorMessage('Error al eliminar el usuario.')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const abrirModal = (usuario = null) => {
    if (usuario && usuario.username === 'admin') {
      setErrorMessage('No se puede editar al administrador principal.')
      return
    }

    setModalErrorMessage('')
    
    if (usuario) {
      setEditando(usuario)
      setFormData({
        username: usuario.username,
        password: '',
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol,
        email: usuario.email || '',
        telefono: usuario.telefono || ''
      })
    } else {
      setEditando(null)
      setFormData({
        username: '',
        password: '',
        nombre_completo: '',
        rol: 'alumno',
        email: '',
        telefono: ''
      })
    }
    setModalOpen(true)
  }

  const cerrarModal = () => {
    setModalOpen(false)
    setEditando(null)
    setModalErrorMessage('')
  }

  const handleSolicitudProcesada = () => {
    cargarUsuarios()
    cargarSolicitudesPendientes()
    if (onUsuarioCambiado) onUsuarioCambiado()
  }

  const getRolColor = (rol) => {
    switch(rol) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'entrenador': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'alumno': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getRolIcon = (rol) => {
    switch(rol) {
      case 'admin': return <Shield className="w-4 h-4" />
      case 'entrenador': return <UserCheck className="w-4 h-4" />
      case 'alumno': return <Activity className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  const usuariosFiltrados = usuarios.filter(usuario =>
    usuario.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (usuario.email && usuario.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header fijo */}
      <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border-b border-[#2d2d2d] px-4 sm:px-6 py-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#e31837]/10 rounded-lg">
              <Users className="w-5 h-5 text-[#e31837]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Alumnos y Personal</h1>
              <p className="text-gray-400 text-xs sm:text-sm">Gestiona todos los usuarios del sistema</p>
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

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowSolicitudes(!showSolicitudes)}
              className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                showSolicitudes 
                  ? 'bg-[#e31837] text-white' 
                  : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Solicitudes</span>
              {solicitudesPendientes > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {solicitudesPendientes}
                </span>
              )}
              {showSolicitudes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => abrirModal()}
              disabled={!isOnline}
              className="bg-[#e31837] hover:bg-[#b8102a] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Agregar Usuario</span>
            </button>
          </div>
        </div>

        {/* Sección de Solicitudes de Registro */}
        {showSolicitudes && (
          <div className="mb-6">
            <SolicitudesRegistro onSolicitudProcesada={handleSolicitudProcesada} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#e31837]/30 border-t-[#e31837] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#2d2d2d] rounded-xl overflow-hidden">
            {/* Vista de tabla para desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-[#0f0f0f] border-b border-[#2d2d2d]">
                  <tr>
                    <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase">#</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Usuario</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Nombre</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase hidden lg:table-cell">Email</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase hidden xl:table-cell">Teléfono</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Rol</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-gray-400 text-xs font-semibold uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((usuario, index) => (
                    <tr key={usuario.id} className="border-b border-[#2d2d2d] hover:bg-[#2d2d2d]/50 transition-all">
                      <td className="px-4 sm:px-6 py-3 text-gray-400 text-sm">{index + 1}</td>
                      <td className="px-4 sm:px-6 py-3">
                        <span className={`text-sm font-mono ${usuario.username === 'admin' ? 'text-[#e31837] font-semibold' : 'text-white'}`}>
                          @{usuario.username}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-white text-sm">{usuario.nombre_completo}</td>
                      <td className="px-4 sm:px-6 py-3 text-gray-400 text-sm hidden lg:table-cell">{usuario.email || '—'}</td>
                      <td className="px-4 sm:px-6 py-3 text-gray-400 text-sm hidden xl:table-cell">{usuario.telefono || '—'}</td>
                      <td className="px-4 sm:px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getRolColor(usuario.rol)}`}>
                          {getRolIcon(usuario.rol)}
                          {usuario.rol === 'admin' ? 'Admin' : usuario.rol === 'entrenador' ? 'Entrenador' : 'Alumno'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => abrirModal(usuario)}
                            disabled={usuario.username === 'admin' || !isOnline}
                            className={`p-1 transition-all ${usuario.username === 'admin' || !isOnline ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-blue-400'}`}
                            title={usuario.username === 'admin' ? 'No se puede editar al administrador' : 'Editar usuario'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarUsuario(usuario.id, usuario.username, usuario.nombre_completo)}
                            disabled={usuario.username === 'admin' || !isOnline}
                            className={`p-1 transition-all ${usuario.username === 'admin' || !isOnline ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-400'}`}
                            title={usuario.username === 'admin' ? 'No se puede eliminar al administrador' : 'Eliminar usuario'}
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

            {/* Vista de tarjetas para móvil */}
            <div className="md:hidden divide-y divide-[#2d2d2d]">
              {usuariosFiltrados.map((usuario) => (
                <div key={usuario.id} className="p-4 hover:bg-[#2d2d2d]/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-white font-medium">{usuario.nombre_completo}</p>
                      <p className={`text-xs font-mono ${usuario.username === 'admin' ? 'text-[#e31837]' : 'text-gray-400'}`}>
                        @{usuario.username}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getRolColor(usuario.rol)}`}>
                      {getRolIcon(usuario.rol)}
                      {usuario.rol === 'admin' ? 'Admin' : usuario.rol === 'entrenador' ? 'Entrenador' : 'Alumno'}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mt-2 text-xs">
                    {usuario.email && (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="break-all">{usuario.email}</span>
                      </div>
                    )}
                    {usuario.telefono && (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{usuario.telefono}</span>
                      </div>
                    )}
                    {!usuario.email && !usuario.telefono && (
                      <div className="text-gray-500 text-xs">Sin información de contacto</div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-3 pt-2 border-t border-[#2d2d2d]/50">
                    <button
                      onClick={() => abrirModal(usuario)}
                      disabled={usuario.username === 'admin' || !isOnline}
                      className={`p-1.5 transition-all rounded-lg flex items-center gap-1 ${
                        usuario.username === 'admin' || !isOnline 
                          ? 'text-gray-600 cursor-not-allowed' 
                          : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                      }`}
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-xs">Editar</span>
                    </button>
                    <button
                      onClick={() => eliminarUsuario(usuario.id, usuario.username, usuario.nombre_completo)}
                      disabled={usuario.username === 'admin' || !isOnline}
                      className={`p-1.5 transition-all rounded-lg flex items-center gap-1 ${
                        usuario.username === 'admin' || !isOnline 
                          ? 'text-gray-600 cursor-not-allowed' 
                          : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs">Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {usuariosFiltrados.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p>No hay usuarios registrados</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de agregar/editar usuario */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#2d2d2d] px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editando ? 'Editar Usuario' : 'Agregar Usuario'}</h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {modalErrorMessage && (
              <div className="m-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {modalErrorMessage}
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">
                  Usuario *
                  {editando && <span className="text-xs text-gray-500 ml-2">(puede cambiarlo)</span>}
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    const newUsername = e.target.value.toLowerCase().replace(/\s/g, '')
                    setFormData({...formData, username: newUsername})
                    if (newUsername.length > 2) {
                      verificarUsernameEnTiempoReal(newUsername)
                    } else {
                      setModalErrorMessage('')
                    }
                  }}
                  className={`w-full px-3 py-2 bg-[#2d2d2d] border rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm ${
                    modalErrorMessage && modalErrorMessage.includes('nombre de usuario') 
                      ? 'border-red-500' 
                      : 'border-[#3d3d3d]'
                  }`}
                  required
                  placeholder="ej: juan.perez"
                  autoComplete="off"
                />
                <p className="text-gray-500 text-xs mt-1">Solo minúsculas, sin espacios</p>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">
                  Contraseña {!editando && '*'}
                  {editando && <span className="text-xs text-gray-500 ml-2">(dejar vacío para no cambiar)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  required={!editando}
                  placeholder={editando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Teléfono</label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Rol *</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({...formData, rol: e.target.value})}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-white focus:outline-none focus:border-[#e31837] text-sm"
                >
                  <option value="alumno">Alumno</option>
                  <option value="entrenador">Entrenador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={cerrarModal} className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={loading || verificando} className="flex-1 px-4 py-2 bg-[#e31837] hover:bg-[#b8102a] text-white rounded-lg flex items-center justify-center gap-2 text-sm">
                  {(loading || verificando) ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Save className="w-4 h-4" /><span>{editando ? 'Actualizar' : 'Crear'}</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AlumnosPersonal