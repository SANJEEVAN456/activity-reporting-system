import '../styles/navbar.css'

export default function Navbar({ user, onProfileClick, theme, onToggleTheme, onLogout }) {
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <div className="profile-icon" onClick={onProfileClick}>
          {initial}
        </div>
      </div>
      <div className="navbar-bottom">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <span className="theme-icon" aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
        </button>
        <button type="button" className="navbar-logout" onClick={onLogout} aria-label="Logout" title="Logout">
          <span className="logout-icon" aria-hidden="true">↪</span>
        </button>
      </div>
    </nav>
  )
}
