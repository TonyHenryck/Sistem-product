import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { ColaboradoresLista } from './pages/colaboradores/ColaboradoresLista'
import { ColaboradorFicha } from './pages/colaboradores/ColaboradorFicha'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/colaboradores" element={<ColaboradoresLista />} />
              <Route path="/colaboradores/novo" element={<ColaboradorFicha />} />
              <Route path="/colaboradores/:id" element={<ColaboradorFicha />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
