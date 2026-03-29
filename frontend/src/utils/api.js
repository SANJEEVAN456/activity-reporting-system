const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '')

const parseJsonSafely = async (response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const data = await parseJsonSafely(response)
  if (!response.ok) {
    const shouldForceLogout = response.status === 401 && data?.message === 'Unauthorized'
    if (shouldForceLogout) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    const errorMessage = data?.message || `Request failed (${response.status})`
    throw new Error(errorMessage)
  }

  return data
}

export async function authApiRequest(path, options = {}) {
  const token = localStorage.getItem('authToken')
  return apiRequest(path, {
    ...options,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      ...(options.headers || {}),
    },
  })
}

export { API_BASE_URL }
