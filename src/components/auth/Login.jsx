// components/auth/Login.jsx (versión actualizada)
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Dumbbell, User, Lock, Eye, EyeOff, LogIn, WifiOff, UserPlus } from 'lucide-react'
import Register from './Register'

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const isOnline = navigator.onLine

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isOnline) {
      setError('Sin conexión a internet. Verificá tu red e intentá de nuevo.')
      return
    }
    
    setLoading(true)

    try {
      const { data, error: supabaseError } = await supabase
        .from('users')
        .select('id, username, nombre_completo, rol, password')
        .eq('username', username)
        .single()

      if (supabaseError || !data) {
        setError('Usuario o contraseña incorrectos')
        setLoading(false)
        return
      }

      if (data.password !== password) {
        setError('Usuario o contraseña incorrectos')
        setLoading(false)
        return
      }

      const userSession = {
        id: data.id,
        username: data.username,
        nombre_completo: data.nombre_completo,
        rol: data.rol
      }
      
      localStorage.setItem('user', JSON.stringify(userSession))
      onLogin(userSession)

    } catch (err) {
      setError('Error de conexión con el servidor')
      setLoading(false)
    }
  }

  if (showRegister) {
    return <Register onBackToLogin={() => setShowRegister(false)} />
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
        <span className="text-white font-bold text-xl">M-<span className="text-[#e31837]">Gym</span></span>
      </div>

      {/* Indicador de conexión */}
      {!isOnline && (
        <div className="absolute top-8 right-8 z-10 flex items-center gap-2 bg-red-500/20 border border-red-500/50 rounded-lg px-3 py-2">
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm font-medium">Sin conexión</span>
        </div>
      )}

      {/* Tarjeta de login */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1a1a1a]/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-[#2d2d2d] p-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[#e31837] to-[#b8102a] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Dumbbell className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Bienvenido</h2>
            <p className="text-gray-400">Ingresa a tu cuenta de M-Gym</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Usuario (admin)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-[#e31837]" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/50 transition-all"
                  placeholder="Ingresá tu usuario"
                  disabled={!isOnline}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Contraseña (admin)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-[#e31837]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/50 transition-all"
                  placeholder="••••••••"
                  disabled={!isOnline}
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

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
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
                  <LogIn className="w-5 h-5" />
                  <span>Ingresar</span>
                </>
              )}
            </button>
          </form>

          {/* Botón de registro */}
          <div className="mt-4">
            <button
              onClick={() => setShowRegister(true)}
              className="w-full bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Registrarse</span>
            </button>
          </div>

          {/* Mensaje sin conexión */}
          {!isOnline && (
            <div className="mt-4 text-center">
              <p className="text-yellow-500 text-xs flex items-center justify-center gap-1">
                <WifiOff className="w-3 h-3" />
                No hay conexión a internet. Conectate para iniciar sesión.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-xs">Sistema de gestión para gimnasios</p>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">"La disciplina supera al talento"</p>
        </div>
      </div>
    </div>
  )
}

export default Login