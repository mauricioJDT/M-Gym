// components/auth/Register.jsx
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Dumbbell, User, Lock, Eye, EyeOff, Mail, Phone, UserPlus, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'

const Register = ({ onBackToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nombre_completo: '',
    email: '',
    telefono: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isOnline = navigator.onLine

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isOnline) {
      setError('Sin conexión a internet. Verificá tu red e intentá de nuevo.')
      return
    }

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (formData.password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres')
      return
    }

    if (formData.username.length < 3) {
      setError('El usuario debe tener al menos 3 caracteres')
      return
    }

    if (formData.nombre_completo.length < 3) {
      setError('Ingresá tu nombre completo')
      return
    }

    setLoading(true)

    try {
      // Verificar si el usuario ya existe
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', formData.username)
        .single()

      if (existingUser) {
        setError('El nombre de usuario ya está registrado')
        setLoading(false)
        return
      }

      // Verificar si ya hay una solicitud pendiente para este usuario
      const { data: existingRequest, error: requestError } = await supabase
        .from('solicitudes_registro')
        .select('username, estado')
        .eq('username', formData.username)
        .single()

      if (existingRequest) {
        if (existingRequest.estado === 'pendiente') {
          setError('Ya tienes una solicitud pendiente de aprobación')
        } else if (existingRequest.estado === 'aprobada') {
          setError('Este usuario ya está registrado')
        } else if (existingRequest.estado === 'rechazada') {
          setError('Tu solicitud anterior fue rechazada. Contactá al administrador.')
        }
        setLoading(false)
        return
      }

      // Crear la solicitud de registro
      const { error: insertError } = await supabase
        .from('solicitudes_registro')
        .insert([{
          username: formData.username,
          password: formData.password,
          nombre_completo: formData.nombre_completo,
          email: formData.email || null,
          telefono: formData.telefono || null,
          rol: 'alumno',
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString()
        }])

      if (insertError) throw insertError

      setSuccess(true)
      
      // Limpiar formulario
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        nombre_completo: '',
        email: '',
        telefono: ''
      })

    } catch (err) {
      console.error('Error al registrar:', err)
      setError('Error al enviar la solicitud. Intentá de nuevo más tarde.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-black flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-[#1a1a1a]/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-[#2d2d2d] p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h2>
            <p className="text-gray-400 mb-6">
              Tu solicitud de registro ha sido enviada al administrador.
            </p>
            <button
              onClick={onBackToLogin}
              className="w-full bg-[#e31837] hover:bg-[#b8102a] text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver al inicio de sesión</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-black flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#e31837]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#e31837]/5 rounded-full blur-3xl"></div>
      </div>

      {/* Logo */}
      <div className="absolute top-8 left-8 flex items-center gap-2 z-10">
        <div className="w-10 h-10 bg-[#e31837] rounded-xl flex items-center justify-center">
          <Dumbbell className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-bold text-xl">M-Gym<span className="text-[#e31837]">System</span></span>
      </div>

      {/* Botón volver */}
      <button
        onClick={onBackToLogin}
        className="absolute top-8 right-8 z-10 flex items-center gap-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white px-4 py-2 rounded-lg transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver</span>
      </button>

      {/* Tarjeta de registro */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1a1a1a]/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-[#2d2d2d] p-8">
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#e31837] to-[#b8102a] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <UserPlus className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Registrarse</h2>
            <p className="text-gray-400">Creá tu cuenta para acceder al sistema</p>
            <p className="text-gray-500 text-xs mt-2">Tu solicitud será revisada por el administrador</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Usuario *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-[#e31837]" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/50 transition-all"
                  placeholder="ej: juan.perez"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Nombre Completo *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-[#e31837]" />
                </div>
                <input
                  type="text"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/50 transition-all"
                  placeholder="Juan Pérez"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-[#e31837]" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/50 transition-all"
                  placeholder="juan@ejemplo.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Teléfono</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="w-5 h-5 text-[#e31837]" />
                </div>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/50 transition-all"
                  placeholder="+54 11 1234-5678"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Contraseña *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-[#e31837]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/50 transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#e31837] transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Confirmar Contraseña *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-[#e31837]" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/50 transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#e31837] transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3">
                <p className="text-red-400 text-sm text-center flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isOnline}
              className={`w-full bg-[#e31837] hover:bg-[#b8102a] text-white font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${
                (!isOnline) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Enviar Solicitud</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-xs">
              Al registrarte, aceptas que tu solicitud sea revisada por el administrador
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register