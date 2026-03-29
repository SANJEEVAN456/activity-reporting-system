import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'
import AuthLanding from './components/AuthLanding'

const DEFAULT_ROUTE = '/'
const PUBLIC_ROUTES = new Set(['/', '/login', '/register'])

function getCurrentRoute() {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return DEFAULT_ROUTE
  return hash.startsWith('/') ? hash : `/${hash}`
}

function navigateTo(route) {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`
  window.location.hash = normalizedRoute
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('user')
  const [route, setRoute] = useState(() => getCurrentRoute())
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const syncRoute = () => {
      setRoute(getCurrentRoute())
    }
    const handleUnauthorized = () => {
      setIsLoggedIn(false)
      setUser(null)
      setRole('user')
      navigateTo('/login')
    }

    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    syncRoute()

    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const userRaw = localStorage.getItem('authUser')
    const needsAuth = !PUBLIC_ROUTES.has(route)

    if (!token || !userRaw) {
      setIsLoggedIn(false)
      setUser(null)
      setRole('user')
      if (needsAuth) {
        navigateTo('/login')
      }
      return
    }

    try {
      const parsedUser = JSON.parse(userRaw)
      if (!parsedUser?.email) throw new Error('Invalid user')

      setUser(parsedUser)
      setRole(parsedUser.role || 'user')
      setIsLoggedIn(true)

      if (route === '/login' || route === '/register') {
        navigateTo(parsedUser.role === 'admin' ? '/admin' : '/dashboard')
      }
    } catch {
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      setIsLoggedIn(false)
      setUser(null)
      setRole('user')
      if (needsAuth) {
        navigateTo('/login')
      }
    }
  }, [route])

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.06,
      duration: 1.8,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 0.75,
      touchMultiplier: 0.9,
    })

    let frameId
    const raf = (time) => {
      lenis.raf(time)
      frameId = requestAnimationFrame(raf)
    }

    frameId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frameId)
      lenis.destroy()
    }
  }, [])

  return (
    <>
      {route === '/' ? (
        <AuthLanding
          onLogin={() => navigateTo('/login')}
          onRegister={() => navigateTo('/register')}
        />
      ) : route === '/register' ? (
        <Register
          setShowRegister={(value) => navigateTo(value ? '/register' : '/login')}
          setShowAuthLanding={(value) => {
            if (value) navigateTo('/')
          }}
        />
      ) : route === '/login' || !isLoggedIn ? (
        <Login
          setShowRegister={(value) => navigateTo(value ? '/register' : '/login')}
          setUser={setUser}
          setIsLoggedIn={setIsLoggedIn}
          setRole={setRole}
          setShowAuthLanding={(value) => {
            if (value) navigateTo('/')
          }}
          onLoginSuccess={(loggedInUser) => navigateTo(loggedInUser.role === 'admin' ? '/admin' : '/dashboard')}
        />
      ) : role === 'admin' ? (
        <AdminDashboard
          user={user}
          setIsLoggedIn={setIsLoggedIn}
          theme={theme}
          setTheme={setTheme}
          currentView={route === '/admin/profile' ? 'profile' : 'dashboard'}
          onNavigate={navigateTo}
        />
      ) : (
        <Dashboard
          user={user}
          setIsLoggedIn={setIsLoggedIn}
          theme={theme}
          setTheme={setTheme}
          currentView={route === '/dashboard/profile' ? 'profile' : 'dashboard'}
          onNavigate={navigateTo}
        />
      )}
      <ToastContainer position="top-right" autoClose={2000} />
    </>
  )
}

export default App
