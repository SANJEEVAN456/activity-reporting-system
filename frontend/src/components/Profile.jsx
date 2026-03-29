import '../styles/profile.css'

export default function Profile({ user }) {
  return (
    <div className="profile-card">
      <div className="profile-details">
        <h3>{user?.name}</h3>
        <p>Email: {user?.email}</p>
        <p>Role: Admin</p>
      </div>
    </div>
  )
}
