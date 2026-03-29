import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import '../styles/profile.css'
import { authApiRequest } from '../utils/api'

const EMPTY_PROFILE = {
  name: '',
  email: '',
  username: '',
  profilePicture: '',
  role: 'admin',
  active: true,
  joinedAt: '',
  lastLoginAt: null,
  twoFactorEnabled: false,
  loginHistory: [],
}

function formatDateTime(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleString()
}

function getRoleLabel(role) {
  if (role === 'super-admin') return 'Super Admin'
  return 'Admin'
}

function getStatusLabel(active) {
  return active ? 'Active' : 'Disabled'
}

export default function AdminProfilePage({ user, onBack }) {
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)

  const [newUserName, setNewUserName] = useState('')
  const [newUserUsername, setNewUserUsername] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserConfirm, setNewUserConfirm] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [meData, usersData] = await Promise.all([
        authApiRequest('/api/auth/me'),
        authApiRequest('/api/admin/users'),
      ])

      const nextProfile = { ...EMPTY_PROFILE, ...(meData.user || {}) }
      setProfile(nextProfile)
      localStorage.setItem('authUser', JSON.stringify(nextProfile))
      setUsers(usersData.users || [])
    } catch (err) {
      toast.error(err.message || 'Failed to load admin profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const addUser = async () => {
    if (!newUserName || !newUserUsername || !newUserEmail || !newUserPassword || !newUserConfirm) return
    if (newUserPassword !== newUserConfirm) {
      toast.error('Passwords do not match')
      return
    }

    try {
      await authApiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName,
          username: newUserUsername,
          email: newUserEmail,
          password: newUserPassword,
          role: 'user',
          active: true,
        }),
      })
      toast.success('User added')
      setNewUserName('')
      setNewUserUsername('')
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserConfirm('')
      await loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to add user')
    }
  }

  const deleteUser = async (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this user? Their submitted activities and events will be moved to archived reports.'
    )
    if (!confirmed) return

    try {
      await authApiRequest(`/api/admin/users/${id}`, { method: 'DELETE' })
      toast.success('User deleted')
      await loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to delete user')
    }
  }

  const saveProfile = async () => {
    if (!profile.name || !profile.email) return

    try {
      setSavingProfile(true)
      const data = await authApiRequest('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          username: profile.username,
          profilePicture: profile.profilePicture,
          twoFactorEnabled: profile.twoFactorEnabled,
        }),
      })
      const nextProfile = { ...EMPTY_PROFILE, ...(data.user || {}) }
      setProfile(nextProfile)
      localStorage.setItem('authUser', JSON.stringify(nextProfile))
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const saveSecurity = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Enter the new password in both fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setSavingSecurity(true)
      const data = await authApiRequest('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          twoFactorEnabled: profile.twoFactorEnabled,
        }),
      })
      const nextProfile = { ...EMPTY_PROFILE, ...(data.user || {}) }
      setProfile(nextProfile)
      localStorage.setItem('authUser', JSON.stringify(nextProfile))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Security settings updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update security settings')
    } finally {
      setSavingSecurity(false)
    }
  }

  const avatarLabel = profile.name || user?.name || 'Admin'
  const avatarInitial = avatarLabel.charAt(0).toUpperCase()

  return (
    <div className="profile-page">
      <div className="profile-page-card admin-profile-shell">
        <h2>Admin Profile</h2>

        <div className="admin-profile-hero">
          {profile.profilePicture ? (
            <img className="admin-profile-avatar" src={profile.profilePicture} alt={avatarLabel} />
          ) : (
            <div className="admin-profile-avatar admin-profile-avatar-fallback">{avatarInitial}</div>
          )}
          <div className="admin-profile-hero-copy">
            <h3>{avatarLabel}</h3>
            <p>{profile.email || user?.email || '-'}</p>
            <span className={`admin-profile-role role-${profile.role || 'admin'}`}>{getRoleLabel(profile.role)}</span>
          </div>
        </div>

        {loading ? <p>Loading profile...</p> : null}

        <div className="admin-profile-grid">
          <section className="admin-profile-panel">
            <h3 className="profile-section-title">Basic Information</h3>
            <label className="admin-profile-field">
              <span>Admin Name</span>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label className="admin-profile-field">
              <span>Email Address</span>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
              />
            </label>
            <label className="admin-profile-field">
              <span>Role (Admin / Super Admin)</span>
              <input type="text" value={getRoleLabel(profile.role)} readOnly />
            </label>
            <label className="admin-profile-field">
              <span>Profile Picture (optional)</span>
              <input
                type="url"
                placeholder="Paste image URL"
                value={profile.profilePicture}
                onChange={(e) => setProfile((prev) => ({ ...prev, profilePicture: e.target.value }))}
              />
            </label>
            <button type="button" className="admin-profile-btn" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </section>

          <section className="admin-profile-panel">
            <h3 className="profile-section-title">Account Details</h3>
            <label className="admin-profile-field">
              <span>Username</span>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))}
              />
            </label>
            <label className="admin-profile-field">
              <span>Last Login Time</span>
              <input type="text" value={formatDateTime(profile.lastLoginAt)} readOnly />
            </label>
            <label className="admin-profile-field">
              <span>Account Status (Active / Disabled)</span>
              <input type="text" value={getStatusLabel(profile.active)} readOnly />
            </label>
            <label className="admin-profile-field">
              <span>Joined</span>
              <input type="text" value={formatDateTime(profile.joinedAt)} readOnly />
            </label>
          </section>

          <section className="admin-profile-panel">
            <h3 className="profile-section-title">Security</h3>
            <label className="admin-profile-field">
              <span>Change Password</span>
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label className="admin-profile-field">
              <span>New Password</span>
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <label className="admin-profile-field">
              <span>Confirm New Password</span>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
            <label className="admin-profile-toggle">
              <span>Two-Factor Authentication (optional)</span>
              <input
                type="checkbox"
                checked={profile.twoFactorEnabled}
                onChange={(e) => setProfile((prev) => ({ ...prev, twoFactorEnabled: e.target.checked }))}
              />
            </label>
            <button type="button" className="admin-profile-btn" onClick={saveSecurity} disabled={savingSecurity}>
              {savingSecurity ? 'Updating...' : 'Update Security'}
            </button>
          </section>

          <section className="admin-profile-panel">
            <h3 className="profile-section-title">Login History (optional)</h3>
            <div className="admin-login-history">
              {profile.loginHistory?.length ? (
                profile.loginHistory.map((entry, index) => (
                  <div key={`${entry.loggedInAt || 'entry'}-${index}`} className="admin-login-history-item">
                    <strong>{formatDateTime(entry.loggedInAt)}</strong>
                    <span>{entry.ip || 'IP unavailable'}</span>
                    <span>{entry.userAgent || 'Device details unavailable'}</span>
                  </div>
                ))
              ) : (
                <p>No login history available yet.</p>
              )}
            </div>
          </section>
        </div>

        <div className="user-profile-section">
          <h3 className="profile-section-title">User Section</h3>
          <div className="user-profile-form">
            <input type="text" placeholder="User name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
            <input type="text" placeholder="Username" value={newUserUsername} onChange={(e) => setNewUserUsername(e.target.value)} />
            <input type="email" placeholder="User email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
            <input
              type="password"
              placeholder="User password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
            />
            <input type="password" placeholder="Confirm password" value={newUserConfirm} onChange={(e) => setNewUserConfirm(e.target.value)} />
            <button type="button" className="admin-profile-btn" onClick={addUser}>
              Add User
            </button>
          </div>
          <div className="user-profile-list">
            {users.length === 0 ? (
              <p>No users yet.</p>
            ) : (
              users.map((u) => (
                <div key={u.id} className="user-profile-item">
                  <div className="user-profile-row">
                    <div className="user-profile-meta">
                      <span>{u.name}</span>
                      <span>@{u.username || 'user'}</span>
                      <span>{u.email}</span>
                      <span className={u.active ? 'status-active' : 'status-inactive'}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="user-profile-actions">
                      <button type="button" className="admin-profile-btn danger" onClick={() => deleteUser(u.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="profile-actions">
          <button type="button" className="ghost" onClick={onBack}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  )
}
