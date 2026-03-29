import { useState } from 'react'
import { toast } from 'react-toastify'
import '../styles/register.css'
import { apiRequest } from '../utils/api'

export default function Register({ setShowRegister, setShowAuthLanding }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('user')
  const [adminCode, setAdminCode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !username || !email || !password || !confirmPassword) {
      setError('All fields are required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, username, email, password, role, adminCode }),
      })
      toast.success('Registration successful. Please log in.')
      setShowRegister(false)
    } catch (err) {
      setError(err.message || 'Registration failed')
    }
  }

  return (
    <div className="auth-page register-page">
      <div className="register-container">
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="register-role-toggle">
            <button
              type="button"
              className={role === 'user' ? 'active' : ''}
              onClick={() => setRole('user')}
            >
              Register as User
            </button>
            <button
              type="button"
              className={role === 'admin' ? 'active' : ''}
              onClick={() => setRole('admin')}
            >
              Register as Admin
            </button>
          </div>
          {role === 'admin' ? (
            <input
              type="password"
              placeholder="Admin code"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
            />
          ) : null}
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit">Register</button>
        </form>
        <p className="switch-auth">
          Already have an account? <span onClick={() => setShowRegister(false)}>Login here</span>
        </p>
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
