import React, { useState, useEffect } from 'react'
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('inicio')

  useEffect(() => {
    // Cargar usuario y última pestaña activa al iniciar
    const savedUser = localStorage.getItem('user')
    const savedTab = localStorage.getItem('activeTab')
    
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    
    if (savedTab) {
      setActiveTab(savedTab)
    }
    
    setLoading(false)
  }, [])

  // Guardar la pestaña activa cuando cambie
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    localStorage.setItem('activeTab', tab)
  }

  const handleLogin = (userData) => {
    setUser(userData)
    // No resetear la pestaña al hacer login, mantener la última que estaba
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('activeTab')
    setUser(null)
    setActiveTab('inicio')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#e31837]/30 border-t-[#e31837] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return <Dashboard user={user} onLogout={handleLogout} initialTab={activeTab} onTabChange={handleTabChange} />
}

export default App