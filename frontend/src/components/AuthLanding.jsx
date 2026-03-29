import '../styles/auth-landing.css'

export default function AuthLanding({ onLogin, onRegister }) {
  return (
    <div className="auth-landing">
      <div className="auth-landing-card">
        <h1 className="auth-landing-title">Activity Reporting System</h1>
        <p className="auth-landing-subtitle">Activity reporting made effortless.</p>
        <div className="auth-landing-actions">
          <button type="button" onClick={onLogin}>Login</button>
          <button type="button" className="ghost" onClick={onRegister}>Sign Up</button>
        </div>
      </div>
    </div>
  )
}
