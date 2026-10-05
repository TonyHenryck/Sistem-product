import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { Login } from './pages/Login'
import { Painel } from './pages/painel/Painel'
import { QuadroPessoal } from './pages/painel/QuadroPessoal'
import { LinhaDoTempo } from './pages/painel/LinhaDoTempo'
import { HistoricoComparativo } from './pages/painel/HistoricoComparativo'
import { IndicadoresDecisao } from './pages/painel/IndicadoresDecisao'
import { DiarioBordo } from './pages/diarioBordo/DiarioBordo'
import { ColaboradoresLista } from './pages/colaboradores/ColaboradoresLista'
import { ColaboradorFicha } from './pages/colaboradores/ColaboradorFicha'
import { Escala } from './pages/escala/Escala'
import { EscalaIndividual } from './pages/escala/EscalaIndividual'
import { Diarias } from './pages/diarias/Diarias'
import { Faltas } from './pages/faltas/Faltas'
import { Trocas } from './pages/trocas/Trocas'
import { Advertencias } from './pages/advertencias/Advertencias'
import { Vencimentos } from './pages/vencimentos/Vencimentos'
import { Ponto } from './pages/ponto/Ponto'
import { Fopag } from './pages/fopag/Fopag'
import { Almoxarifado } from './pages/almoxarifado/Almoxarifado'
import { Estoque } from './pages/estoque/Estoque'
import { NotaFiscal } from './pages/notaFiscal/NotaFiscal'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/colaboradores/:id/escala-individual" element={<EscalaIndividual />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Painel />} />
              <Route path="/painel/quadro-pessoal" element={<QuadroPessoal />} />
              <Route path="/painel/linha-do-tempo" element={<LinhaDoTempo />} />
              <Route path="/painel/historico-comparativo" element={<HistoricoComparativo />} />
              <Route path="/painel/indicadores-decisao" element={<IndicadoresDecisao />} />
              <Route path="/diario-rh" element={<DiarioBordo />} />
              <Route path="/colaboradores" element={<ColaboradoresLista />} />
              <Route path="/colaboradores/novo" element={<ColaboradorFicha />} />
              <Route path="/colaboradores/:id" element={<ColaboradorFicha />} />
              <Route path="/escala" element={<Escala />} />
              <Route path="/vencimentos" element={<Vencimentos />} />
              <Route path="/diarias" element={<Diarias />} />
              <Route path="/faltas" element={<Faltas />} />
              <Route path="/trocas" element={<Trocas />} />
              <Route path="/ponto" element={<Ponto />} />
              <Route path="/fopag" element={<Fopag />} />
              <Route path="/almoxarifado" element={<Almoxarifado />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/nota-fiscal" element={<NotaFiscal />} />
              <Route path="/advertencias" element={<Advertencias />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
