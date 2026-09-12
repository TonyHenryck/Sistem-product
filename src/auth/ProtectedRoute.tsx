import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { session, vinculos, carregando } = useAuth()

  if (carregando) return null

  if (!session || vinculos.length === 0) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
