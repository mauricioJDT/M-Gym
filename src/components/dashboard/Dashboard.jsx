// components/dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { 
  Dumbbell, LogOut, Users, DollarSign, 
  Settings, Home, ChevronLeft, ChevronRight, Shield, Package,
  ClipboardList, Apple, TrendingUp, UserCheck, Menu, X
} from 'lucide-react'
import { supabase } from '../lib/supabase'
// Admin components
import InicioAdmin from './admin/Inicio'
import AlumnosPersonal from './admin/AlumnosPersonal'
import GestionPagos from './admin/GestionPagos'
import Inventario from './admin/Inventario'
import Configuracion from './admin/Configuracion'
// Alumno components
import InicioAlumno from './alumno/InicioAlumno'
import RutinasAlumno from './alumno/RutinasAlumno'
import DietaAlumno from './alumno/DietaAlumno'
import EstadisticasAlumno from './alumno/EstadisticasAlumno'
import ConfiguracionAlumno from './alumno/ConfiguracionAlumno'
// Entrenador components
import InicioEntrenador from './entrenador/InicioEntrenador'
import AlumnosEntrenador from './entrenador/AlumnosEntrenador'
import RutinasEntrenador from './entrenador/RutinasEntrenador'
import DietaEntrenador from './entrenador/DietaEntrenador'
import EstadisticasEntrenador from './entrenador/EstadisticasEntrenador'
import ConfiguracionEntrenador from './entrenador/ConfiguracionEntrenador'

const Dashboard = ({ user, onLogout, initialTab = 'inicio', onTabChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedSidebar = localStorage.getItem('sidebarOpen')
    const isMobile = window.innerWidth < 768
    if (isMobile) return false
    return savedSidebar !== null ? JSON.parse(savedSidebar) : true
  })
  const [activeTab, setActiveTab] = useState(initialTab)
  const [filtroPagos, setFiltroPagos] = useState(null)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile && !sidebarOpen) {
        setSidebarOpen(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarOpen])

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen))
  }, [sidebarOpen])

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
    if (onTabChange) {
      onTabChange(activeTab)
    }
  }, [activeTab, onTabChange])

  const cargarSolicitudesPendientes = useCallback(async () => {
    if (user.rol !== 'admin') return
    try {
      const { count } = await supabase
        .from('solicitudes_registro')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
      
      setSolicitudesPendientes(count || 0)
    } catch (error) {
      console.error('Error cargando contador de solicitudes:', error)
    }
  }, [user.rol])

  useEffect(() => {
    const handleCambiarPestaña = (event) => {
      if (event.detail && event.detail.tab) {
        setActiveTab(event.detail.tab)
        if (event.detail.filtro) {
          setFiltroPagos(event.detail.filtro)
        }
      }
    }
    
    window.addEventListener('cambiarPestaña', handleCambiarPestaña)
    
    if (user.rol === 'admin') {
      cargarSolicitudesPendientes()
    }
    
    const handleRecargar = () => {
      if (user.rol === 'admin') {
        cargarSolicitudesPendientes()
      }
    }
    window.addEventListener('recargarDashboard', handleRecargar)
    
    return () => {
      window.removeEventListener('cambiarPestaña', handleCambiarPestaña)
      window.removeEventListener('recargarDashboard', handleRecargar)
    }
  }, [user.rol, cargarSolicitudesPendientes])

  const recargarDashboard = () => {
    window.dispatchEvent(new CustomEvent('recargarDashboard'))
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Menu items según el rol (para desktop)
  const getMenuItems = () => {
    if (user.rol === 'admin') {
      return [
        { id: 'divider-admin', label: '━━━ PANEL ADMIN ━━━', icon: null, tipo: 'divider' },
        { id: 'inicio', label: 'Inicio', icon: <Shield className="w-5 h-5" />, tipo: 'admin' },
        { id: 'pagos', label: 'Gestión de Pagos', icon: <DollarSign className="w-5 h-5" />, tipo: 'admin' },
        { id: 'inventario', label: 'Inventario', icon: <Package className="w-5 h-5" />, tipo: 'admin' },
        { id: 'alumnos', label: 'Alumnos y Personal', icon: <Users className="w-5 h-5" />, badge: solicitudesPendientes, tipo: 'admin' },
        { id: 'configuracion', label: 'Configuración del Sistema', icon: <Settings className="w-5 h-5" />, tipo: 'admin' },
        { id: 'divider-alumno', label: '━━━ VISTA ALUMNO ━━━', icon: null, tipo: 'divider' },
        { id: 'alumno_inicio', label: 'Mi Panel', icon: <Home className="w-5 h-5" />, tipo: 'alumno' },
        { id: 'alumno_rutinas', label: 'Mis Rutinas', icon: <ClipboardList className="w-5 h-5" />, tipo: 'alumno' },
        { id: 'alumno_dieta', label: 'Plan de Dieta', icon: <Apple className="w-5 h-5" />, tipo: 'alumno' },
        { id: 'alumno_estadisticas', label: 'Mis Estadísticas', icon: <TrendingUp className="w-5 h-5" />, tipo: 'alumno' },
        { id: 'alumno_configuracion', label: 'Configuración', icon: <Settings className="w-5 h-5" />, tipo: 'alumno' },
        { id: 'divider-entrenador', label: '━━━ VISTA ENTRENADOR ━━━', icon: null, tipo: 'divider' },
        { id: 'entrenador_inicio', label: 'Panel Entrenador', icon: <UserCheck className="w-5 h-5" />, tipo: 'entrenador' },
        { id: 'entrenador_alumnos', label: 'Mis Alumnos', icon: <Users className="w-5 h-5" />, tipo: 'entrenador' },
        { id: 'entrenador_rutinas', label: 'Gestionar Rutinas', icon: <ClipboardList className="w-5 h-5" />, tipo: 'entrenador' },
        { id: 'entrenador_dietas', label: 'Gestionar Dietas', icon: <Apple className="w-5 h-5" />, tipo: 'entrenador' },
        { id: 'entrenador_estadisticas', label: 'Estadísticas', icon: <TrendingUp className="w-5 h-5" />, tipo: 'entrenador' },
        { id: 'entrenador_configuracion', label: 'Configuración', icon: <Settings className="w-5 h-5" />, tipo: 'entrenador' },
      ]
    } else if (user.rol === 'entrenador') {
      return [
        { id: 'inicio', label: 'Mi Panel', icon: <Home className="w-5 h-5" /> },
        { id: 'mis_alumnos', label: 'Mis Alumnos', icon: <Users className="w-5 h-5" /> },
        { id: 'rutinas', label: 'Gestionar Rutinas', icon: <ClipboardList className="w-5 h-5" /> },
        { id: 'dietas', label: 'Gestionar Dietas', icon: <Apple className="w-5 h-5" /> },
        { id: 'estadisticas', label: 'Estadísticas', icon: <TrendingUp className="w-5 h-5" /> },
        { id: 'configuracion', label: 'Configuración', icon: <Settings className="w-5 h-5" /> },
      ]
    } else {
      return [
        { id: 'inicio', label: 'Inicio', icon: <Home className="w-5 h-5" /> },
        { id: 'rutinas', label: 'Rutinas', icon: <ClipboardList className="w-5 h-5" /> },
        { id: 'dieta', label: 'Plan de Dieta', icon: <Apple className="w-5 h-5" /> },
        { id: 'estadisticas', label: 'Estadísticas', icon: <TrendingUp className="w-5 h-5" /> },
        { id: 'configuracion', label: 'Configuración', icon: <Settings className="w-5 h-5" /> },
      ]
    }
  }

  // Obtener items para el navbar móvil - ADMIN ve TODAS las secciones agrupadas por rol con texto debajo de cada grupo
  const getMobileNavItems = () => {
    if (user.rol === 'admin') {
      return [
        // ===== GRUPO ADMIN (Color ROJO) =====
        {
          type: 'group',
          label: 'Opciones de Admin',
          color: 'red',
          items: [
            { id: 'inicio', label: 'Inicio', icon: <Shield className="w-5 h-5" />, color: 'red' },
            { id: 'pagos', label: 'Pagos', icon: <DollarSign className="w-5 h-5" />, color: 'red' },
            { id: 'inventario', label: 'Inventario', icon: <Package className="w-5 h-5" />, color: 'red' },
            { id: 'alumnos', label: 'Alumnos', icon: <Users className="w-5 h-5" />, badge: solicitudesPendientes, color: 'red' },
            { id: 'configuracion', label: 'Config.', icon: <Settings className="w-5 h-5" />, color: 'red' },
          ]
        },
        // Divisor entre ADMIN y ALUMNO
        { type: 'divider' },
        // ===== GRUPO ALUMNO (Color AZUL) =====
        {
          type: 'group',
          label: 'Opciones de Alumno',
          color: 'blue',
          items: [
            { id: 'alumno_inicio', label: 'Mi Panel', icon: <Home className="w-5 h-5" />, color: 'blue' },
            { id: 'alumno_rutinas', label: 'Rutinas', icon: <ClipboardList className="w-5 h-5" />, color: 'blue' },
            { id: 'alumno_dieta', label: 'Dieta', icon: <Apple className="w-5 h-5" />, color: 'blue' },
            { id: 'alumno_estadisticas', label: 'Stats', icon: <TrendingUp className="w-5 h-5" />, color: 'blue' },
            { id: 'alumno_configuracion', label: 'Config.', icon: <Settings className="w-5 h-5" />, color: 'blue' },
          ]
        },
        // Divisor entre ALUMNO y ENTRENADOR
        { type: 'divider' },
        // ===== GRUPO ENTRENADOR (Color VERDE) =====
        {
          type: 'group',
          label: 'Opciones de Entrenador',
          color: 'green',
          items: [
            { id: 'entrenador_inicio', label: 'Panel', icon: <UserCheck className="w-5 h-5" />, color: 'green' },
            { id: 'entrenador_alumnos', label: 'Alumnos', icon: <Users className="w-5 h-5" />, color: 'green' },
            { id: 'entrenador_rutinas', label: 'Rutinas', icon: <ClipboardList className="w-5 h-5" />, color: 'green' },
            { id: 'entrenador_dietas', label: 'Dietas', icon: <Apple className="w-5 h-5" />, color: 'green' },
            { id: 'entrenador_estadisticas', label: 'Stats', icon: <TrendingUp className="w-5 h-5" />, color: 'green' },
            { id: 'entrenador_configuracion', label: 'Config.', icon: <Settings className="w-5 h-5" />, color: 'green' },
          ]
        },
      ]
    } else if (user.rol === 'entrenador') {
      return [
        {
          type: 'group',
          label: 'Opciones de Entrenador',
          color: 'green',
          items: [
            { id: 'inicio', label: 'Inicio', icon: <Home className="w-5 h-5" />, color: 'green' },
            { id: 'mis_alumnos', label: 'Alumnos', icon: <Users className="w-5 h-5" />, color: 'green' },
            { id: 'rutinas', label: 'Rutinas', icon: <ClipboardList className="w-5 h-5" />, color: 'green' },
            { id: 'dietas', label: 'Dietas', icon: <Apple className="w-5 h-5" />, color: 'green' },
            { id: 'estadisticas', label: 'Stats', icon: <TrendingUp className="w-5 h-5" />, color: 'green' },
            { id: 'configuracion', label: 'Config.', icon: <Settings className="w-5 h-5" />, color: 'green' },
          ]
        },
      ]
    } else {
      return [
        {
          type: 'group',
          label: 'Opciones de Alumno',
          color: 'blue',
          items: [
            { id: 'inicio', label: 'Inicio', icon: <Home className="w-5 h-5" />, color: 'blue' },
            { id: 'rutinas', label: 'Rutinas', icon: <ClipboardList className="w-5 h-5" />, color: 'blue' },
            { id: 'dieta', label: 'Dieta', icon: <Apple className="w-5 h-5" />, color: 'blue' },
            { id: 'estadisticas', label: 'Stats', icon: <TrendingUp className="w-5 h-5" />, color: 'blue' },
            { id: 'configuracion', label: 'Config.', icon: <Settings className="w-5 h-5" />, color: 'blue' },
          ]
        },
      ]
    }
  }

  const menuItems = getMenuItems()
  const mobileNavItems = getMobileNavItems()

  const getItemStyle = (item) => {
    const baseStyle = "w-full flex items-center gap-3 px-4 py-3 transition-all"
    const activeStyle = activeTab === item.id
      ? 'bg-[#e31837]/10 border-r-2 border-[#e31837] text-[#e31837]'
      : 'text-gray-400 hover:bg-[#2d2d2d] hover:text-white'
    
    let roleStyle = ''
    if (item.tipo === 'alumno' && user.rol === 'admin') {
      roleStyle = 'border-l-2 border-l-blue-500/30 bg-blue-500/5'
    } else if (item.tipo === 'entrenador' && user.rol === 'admin') {
      roleStyle = 'border-l-2 border-l-green-500/30 bg-green-500/5'
    }
    
    return `${baseStyle} ${activeStyle} ${roleStyle}`
  }

  const renderContent = () => {
    if (user.rol === 'admin') {
      switch(activeTab) {
        case 'inicio':
          return <InicioAdmin user={user} />
        case 'pagos':
          return <GestionPagos filtroInicial={filtroPagos} onPagoRegistrado={recargarDashboard} />
        case 'inventario':
          return <Inventario />
        case 'alumnos':
          return <AlumnosPersonal onUsuarioCambiado={recargarDashboard} />
        case 'configuracion':
          return <Configuracion />
        case 'alumno_inicio':
          return <InicioAlumno user={user} />
        case 'alumno_rutinas':
          return <RutinasAlumno user={user} />
        case 'alumno_dieta':
          return <DietaAlumno user={user} />
        case 'alumno_estadisticas':
          return <EstadisticasAlumno user={user} />
        case 'alumno_configuracion':
          return <ConfiguracionAlumno user={user} />
        case 'entrenador_inicio':
          return <InicioEntrenador user={user} />
        case 'entrenador_alumnos':
          return <AlumnosEntrenador user={user} />
        case 'entrenador_rutinas':
          return <RutinasEntrenador user={user} />
        case 'entrenador_dietas':
          return <DietaEntrenador user={user} />
        case 'entrenador_estadisticas':
          return <EstadisticasEntrenador user={user} />
        case 'entrenador_configuracion':
          return <ConfiguracionEntrenador user={user} />
        default:
          return <InicioAdmin user={user} />
      }
    } else if (user.rol === 'entrenador') {
      switch(activeTab) {
        case 'inicio':
          return <InicioEntrenador user={user} />
        case 'mis_alumnos':
          return <AlumnosEntrenador user={user} />
        case 'rutinas':
          return <RutinasEntrenador user={user} />
        case 'dietas':
          return <DietaEntrenador user={user} />
        case 'estadisticas':
          return <EstadisticasEntrenador user={user} />
        case 'configuracion':
          return <ConfiguracionEntrenador user={user} />
        default:
          return <InicioEntrenador user={user} />
      }
    } else {
      switch(activeTab) {
        case 'inicio':
          return <InicioAlumno user={user} />
        case 'rutinas':
          return <RutinasAlumno user={user} />
        case 'dieta':
          return <DietaAlumno user={user} />
        case 'estadisticas':
          return <EstadisticasAlumno user={user} />
        case 'configuracion':
          return <ConfiguracionAlumno user={user} />
        default:
          return <InicioAlumno user={user} />
      }
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-black">
      {/* Sidebar - Solo visible en desktop (md en adelante) */}
      <div className={`
        hidden md:flex md:relative z-40 h-full bg-[#0f0f0f]/95 backdrop-blur-md border-r border-[#2d2d2d] 
        transition-all duration-300 flex-col flex-shrink-0 shadow-2xl
        ${sidebarOpen ? 'w-72' : 'w-20'}
      `}>
        {/* Header del Sidebar con botón de colapsar */}
        <div className="p-4 border-b border-[#2d2d2d] flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 bg-[#e31837] rounded-lg flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold truncate">M-Gym</span>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                user.rol === 'admin' ? 'bg-red-500/20 text-red-400' : 
                user.rol === 'entrenador' ? 'bg-green-500/20 text-green-400' : 
                'bg-blue-500/20 text-blue-400'
              }`}>
                {user.rol === 'admin' ? 'Admin' : user.rol === 'entrenador' ? 'Entrenador' : 'Alumno'}
              </span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-[#2d2d2d] transition-all flex-shrink-0 ml-auto"
            aria-label={sidebarOpen ? "Colapsar menú" : "Expandir menú"}
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          {menuItems.map((item, idx) => {
            if (item.tipo === 'divider') {
              return sidebarOpen ? (
                <div key={idx} className="px-4 py-2 mt-2">
                  <p className="text-gray-600 text-xs tracking-wider font-semibold">{item.label}</p>
                </div>
              ) : null
            }
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  setFiltroPagos(null)
                }}
                className={getItemStyle(item)}
                title={!sidebarOpen ? item.label : ''}
              >
                {item.icon}
                {sidebarOpen && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                    {item.tipo === 'alumno' && user.rol === 'admin' && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">Alumno</span>
                    )}
                    {item.tipo === 'entrenador' && user.rol === 'admin' && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">Entrenador</span>
                    )}
                  </div>
                )}
                {!sidebarOpen && item.badge > 0 && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Info usuario y logout */}
        <div className="p-4 border-t border-[#2d2d2d]">
          {sidebarOpen && (
            <div className="mb-3 px-2 py-2 bg-[#1a1a1a]/50 rounded-lg">
              <p className="text-white text-sm font-medium truncate">{user.nombre_completo}</p>
              <p className="text-gray-500 text-xs truncate">@{user.username}</p>
              <p className={`text-xs mt-1 capitalize ${
                user.rol === 'admin' ? 'text-red-400' : 
                user.rol === 'entrenador' ? 'text-green-400' : 'text-blue-400'
              }`}>
                {user.rol}
              </p>
            </div>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-[#2d2d2d] hover:text-white transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Salir</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto h-full w-full flex flex-col">
        {/* Navbar superior para móviles - Grupos de opciones con texto debajo de cada grupo */}
        <div className="md:hidden sticky top-0 z-30 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-[#2d2d2d]">
          {/* Logo y usuario */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#e31837] rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg">M-Gym</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                user.rol === 'admin' ? 'bg-red-500/20 text-red-400' : 
                user.rol === 'entrenador' ? 'bg-green-500/20 text-green-400' : 
                'bg-blue-500/20 text-blue-400'
              }`}>
                {user.rol === 'admin' ? 'Admin' : user.rol === 'entrenador' ? 'Entrenador' : 'Alumno'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-[#2d2d2d] text-gray-400 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          
          {/* Navegación móvil con grupos separados por rayas y texto debajo de cada grupo */}
          <div className="overflow-x-auto overflow-y-hidden scrollbar-hide border-t border-[#2d2d2d]">
            <div className="flex flex-nowrap items-stretch px-2 py-2 gap-2 min-w-max">
              {mobileNavItems.map((item, idx) => {
                // Renderizar divisor (raya vertical)
                if (item.type === 'divider') {
                  return (
                    <div key={`divider-${idx}`} className="flex-shrink-0 w-px bg-gradient-to-b from-transparent via-[#2d2d2d] to-transparent mx-1 self-stretch"></div>
                  )
                }
                
                // Renderizar grupo de opciones
                if (item.type === 'group') {
                  const groupColor = item.color === 'red' ? 'red' : item.color === 'blue' ? 'blue' : 'green'
                  const textColorClass = groupColor === 'red' ? 'text-red-400' : groupColor === 'blue' ? 'text-blue-400' : 'text-green-400'
                  const borderColorClass = groupColor === 'red' ? 'border-red-500/50' : groupColor === 'blue' ? 'border-blue-500/50' : 'border-green-500/50'
                  const bgActiveClass = groupColor === 'red' ? 'bg-red-500/10' : groupColor === 'blue' ? 'bg-blue-500/10' : 'bg-green-500/10'
                  const indicatorColorClass = groupColor === 'red' ? 'bg-red-400' : groupColor === 'blue' ? 'bg-blue-400' : 'bg-green-400'
                  
                  return (
                    <div key={`group-${idx}`} className="flex flex-col items-center gap-1 flex-shrink-0">
                      {/* Opciones del grupo */}
                      <div className="flex gap-1">
                        {item.items.map((subItem) => {
                          const isActive = activeTab === subItem.id
                          
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => {
                                setActiveTab(subItem.id)
                                setFiltroPagos(null)
                              }}
                              className={`relative flex flex-col items-center px-3 py-2 rounded-lg transition-all ${isActive ? `${bgActiveClass} border ${borderColorClass}` : ''}`}
                            >
                              <div className="relative">
                                <div className={isActive ? textColorClass : 'text-gray-400'}>
                                  {subItem.icon}
                                </div>
                                {subItem.badge > 0 && (
                                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                                    {subItem.badge}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[9px] mt-1 font-medium text-center whitespace-nowrap ${isActive ? textColorClass : 'text-gray-400'}`}>
                                {subItem.label}
                              </span>
                              {isActive && (
                                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 rounded-full ${indicatorColorClass}`} />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      {/* Texto debajo del grupo */}
                      <span className={`text-[9px] font-medium tracking-wider ${textColorClass}`}>
                        {item.label}
                      </span>
                    </div>
                  )
                }
                
                return null
              })}
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        {renderContent()}
      </div>
    </div>
  )
}

export default Dashboard