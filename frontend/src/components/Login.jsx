import { useState } from 'react'
import { toast } from 'react-toastify'
import '../styles/login.css'
import { apiRequest } from '../utils/api'

const INVALID_LOGIN_MESSAGE = 'Enter username/email and password correctly.'
const INVALID_EMAIL_MESSAGE = 'Username or email is incorrect.'
const INVALID_PASSWORD_MESSAGE = 'Password is incorrect.'
const NOT_REGISTERED_MESSAGE = 'User is not registered. Please register first.'
const ADMIN_NOT_REGISTERED_MESSAGE = 'Admin is not registered. Please register first.'

export default function Login({ setIsLoggedIn, setUser, setShowRegister, setRole, setShowAuthLanding, onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetStep, setResetStep] = useState(false)
  const [secretCode, setSecretCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [loginRole, setLoginRole] = useState('user')

  const isAdminMode = loginRole === 'admin'
  const openAdminRegister = () => {
    setShowRegister(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (showSuccessAnim) return
    setError('')
    if (!email || !password) {
      setError(INVALID_LOGIN_MESSAGE)
      return
    }
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          role: isAdminMode ? 'admin' : 'user',
        }),
      })

      const { token, user } = response
      setShowSuccessAnim(true)
      setTimeout(() => {
        localStorage.setItem('authToken', token)
        localStorage.setItem('authUser', JSON.stringify(user))
        setRole(user.role || 'user')
        setUser(user)
        setIsLoggedIn(true)
        onLoginSuccess?.(user)
        toast.success(user.role === 'admin' ? 'Logged in as admin' : 'Login successful')
        setShowSuccessAnim(false)
      }, 2000)
    } catch (err) {
      const message = String(err.message || '').toLowerCase()
      if (message.includes('not registered') || message.includes('register first')) {
        setError(isAdminMode ? ADMIN_NOT_REGISTERED_MESSAGE : NOT_REGISTERED_MESSAGE)
        return
      }
      if (message.includes('account type')) {
        setError(INVALID_EMAIL_MESSAGE)
        return
      }
      if (message.includes('password')) {
        setError(INVALID_PASSWORD_MESSAGE)
        return
      }
      if (message.includes('disabled')) {
        setError('Your account is disabled. Please contact admin.')
        return
      }
      setError(INVALID_LOGIN_MESSAGE)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!forgotEmail) return
    if (isAdminMode && !secretCode.trim()) {
      setError('Secret code is required.')
      return
    }
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: forgotEmail,
          verifyOnly: true,
          role: isAdminMode ? 'admin' : 'user',
          secretCode: isAdminMode ? secretCode.trim() : undefined,
        }),
      })
      setResetStep(true)
    } catch (err) {
      const message = String(err.message || '')
      if (message.toLowerCase().includes('secret')) {
        setError('Invalid secret code.')
        return
      }
      if (isAdminMode) {
        setError('Admin email not found.')
        return
      }
      setError('User ID not found.')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (!newPassword || !confirmNewPassword) return
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match')
      return
    }
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: forgotEmail,
          newPassword,
          role: isAdminMode ? 'admin' : 'user',
          secretCode: isAdminMode ? secretCode.trim() : undefined,
        }),
      })
      toast.success(isAdminMode ? 'Admin password updated. Please log in.' : 'Password updated. Please log in.')
      setShowForgot(false)
      setResetStep(false)
    } catch (err) {
      setError(err.message || 'Failed to update password')
    }
  }

  return (
    <div className="auth-page login-page">
      {showSuccessAnim ? (
        <div className="login-success-overlay" aria-live="polite">
          <lottie-player src="/login-success.json" background="transparent" speed="1" loop autoplay />
          <p className="login-success-text">Login successful</p>
        </div>
      ) : null}
      <div className={`login-container ${isAdminMode ? 'admin-mode' : 'user-mode'}`}>
        <div className="login-header">
          <h2>{isAdminMode ? 'Admin Login' : 'User Login'}</h2>
        </div>
        <div className="login-role-toggle" role="tablist" aria-label="Login role">
          <button type="button" role="tab" aria-selected={loginRole === 'user'} className={`role-card ${loginRole === 'user' ? 'active' : ''}`} onClick={() => setLoginRole('user')}>
            <span className="role-label">User</span>
          </button>
          <button type="button" role="tab" aria-selected={loginRole === 'admin'} className={`role-card ${loginRole === 'admin' ? 'active' : ''}`} onClick={() => setLoginRole('admin')}>
            <span className="role-label">Admin</span>
          </button>
        </div>

        {!showForgot ? (
          <form onSubmit={handleSubmit}>
            <input type="text" placeholder={isAdminMode ? 'Admin Username or Email' : 'Username or Email'} value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={showSuccessAnim}>Login</button>
          </form>
        ) : (
          <form onSubmit={resetStep ? handleResetPassword : handleForgotSubmit}>
            {!resetStep ? (
              <>
                <input type="email" placeholder={isAdminMode ? 'Admin Email' : 'Enter User ID (Email)'} value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                {isAdminMode ? <input type="password" placeholder="Secret Code" value={secretCode} onChange={(e) => setSecretCode(e.target.value)} /> : null}
                {error && <p className="error">{error}</p>}
                <button type="submit">Verify</button>
              </>
            ) : (
              <>
                <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <input type="password" placeholder="Confirm New Password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                {error && <p className="error">{error}</p>}
                <button type="submit">Update Password</button>
              </>
            )}
          </form>
        )}
        <p className="switch-auth auth-divider forgot-divider">
          <span onClick={() => { setShowForgot(!showForgot); setResetStep(false); setError('') }}>
            {showForgot ? 'Back to Login' : 'Forgot password?'}
          </span>
        </p>
        {!isAdminMode ? (
          <p className="switch-auth auth-divider register-divider">
            New user? <span onClick={() => setShowRegister(true)}>Register here</span>
          </p>
        ) : (
          <p className="switch-auth auth-divider register-divider">
            New admin? <span onClick={openAdminRegister}>Register here</span>
          </p>
        )}
        <p className="switch-auth back-home">
          <span
            onClick={() => {
              setShowAuthLanding?.(true)
            }}
          >
            Back to Home
          </span>
        </p>
      </div>
    </div>
  )
}
