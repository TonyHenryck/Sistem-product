import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { contarVencimentosUrgentes } from '../../lib/vencimentos'
import { buscarHeadcount } from '../../lib/painel'

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      {children}
    </svg>
  )
}

function ChevronBaixo({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${aberto ? 'rotate-180' : 'rotate-90'}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

const ICONE_PAINEL = (
  <Icone>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </Icone>
)
const ICONE_PESSOAS = (
  <Icone>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icone>
)
const ICONE_ALVO = (
  <Icone>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
  </Icone>
)
const ICONE_LISTA = (
  <Icone>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" />
  </Icone>
)
const ICONE_COMPARATIVO = (
  <Icone>
    <rect x="3" y="3" width="8" height="18" rx="1" />
    <rect x="13" y="3" width="8" height="18" rx="1" />
  </Icone>
)
const ICONE_CALENDARIO = (
  <Icone>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Icone>
)
const ICONE_ALERTA = (
  <Icone>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Icone>
)
const ICONE_TROCA = (
  <Icone>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Icone>
)
const ICONE_DINHEIRO = (
  <Icone>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 10v4M18 10v4" />
  </Icone>
)
const ICONE_AUSENCIA = (
  <Icone>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 2 .4" />
    <path d="M17 8l4 4M21 8l-4 4" />
  </Icone>
)
const ICONE_CAIXA = (
  <Icone>
    <path d="M21 8 12 3 3 8l9 5 9-5Z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </Icone>
)
const ICONE_CAMADAS = (
  <Icone>
    <path d="M12 3 2 9l10 6 10-6-10-6Z" />
    <path d="M2 15l10 6 10-6" />
  </Icone>
)
const ICONE_NOTA = (
  <Icone>
    <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
    <path d="M9 13h6M9 17h6M9 9h2" />
  </Icone>
)
const ICONE_CARTEIRA = (
  <Icone>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2h-4a3 3 0 0 0 0 6h4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    <circle cx="16" cy="12" r="1" />
  </Icone>
)
const ICONE_PONTO = (
  <Icone>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </Icone>
)
const ICONE_ESCUDO = (
  <Icone>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </Icone>
)
const ICONE_LAPIS = (
  <Icone>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icone>
)

interface ItemMenu {
  rota: string
  rotulo: string
  icone: ReactNode
  badge?: 'vencimentos' | 'headcount'
}

interface GrupoMenu {
  chave: string
  rotulo: string
  icone: ReactNode
  itens: ItemMenu[]
}

const GRUPOS: GrupoMenu[] = [
  {
    chave: 'paineis',
    rotulo: 'Painéis',
    icone: ICONE_PAINEL,
    itens: [
      { rota: '/', rotulo: 'Operação do mês', icone: ICONE_PAINEL },
      { rota: '/painel/quadro-pessoal', rotulo: 'Quadro de pessoal', icone: ICONE_ALVO },
      { rota: '/painel/linha-do-tempo', rotulo: 'Linha do tempo', icone: ICONE_LISTA },
      { rota: '/painel/historico-comparativo', rotulo: 'Histórico e comparativo', icone: ICONE_COMPARATIVO },
    ],
  },
  {
    chave: 'pessoal',
    rotulo: 'Pessoal',
    icone: ICONE_PESSOAS,
    itens: [
      { rota: '/colaboradores', rotulo: 'Colaboradores', icone: ICONE_PESSOAS, badge: 'headcount' },
      { rota: '/vencimentos', rotulo: 'Férias e vencimentos', icone: ICONE_ALERTA, badge: 'vencimentos' },
      { rota: '/escala', rotulo: 'Escala do mês', icone: ICONE_CALENDARIO },
    ],
  },
  {
    chave: 'movimento',
    rotulo: 'Movimento',
    icone: ICONE_TROCA,
    itens: [
      { rota: '/diarias', rotulo: 'Diárias', icone: ICONE_DINHEIRO },
      { rota: '/faltas', rotulo: 'Faltas', icone: ICONE_AUSENCIA },
      { rota: '/trocas', rotulo: 'Trocas', icone: ICONE_TROCA },
    ],
  },
  {
    chave: 'almoxarifado',
    rotulo: 'Almoxarifado',
    icone: ICONE_CAIXA,
    itens: [
      { rota: '/almoxarifado', rotulo: 'Almoxarifado', icone: ICONE_CAIXA },
      { rota: '/estoque', rotulo: 'Estoque', icone: ICONE_CAMADAS },
      { rota: '/nota-fiscal', rotulo: 'Nota fiscal', icone: ICONE_NOTA },
    ],
  },
  {
    chave: 'financeiro',
    rotulo: 'Financeiro',
    icone: ICONE_CARTEIRA,
    itens: [{ rota: '/fopag', rotulo: 'FOPAG', icone: ICONE_CARTEIRA }],
  },
  {
    chave: 'conformidade',
    rotulo: 'Conformidade',
    icone: ICONE_ESCUDO,
    itens: [
      { rota: '/advertencias', rotulo: 'Advertências', icone: ICONE_ALERTA },
      { rota: '/ponto', rotulo: 'Ponto', icone: ICONE_PONTO },
    ],
  },
  {
    chave: 'meu-trabalho',
    rotulo: 'Meu trabalho',
    icone: ICONE_LAPIS,
    itens: [{ rota: '/diario-rh', rotulo: 'Diário do RH', icone: ICONE_LAPIS }],
  },
]

const GRUPOS_ABERTOS_PADRAO = ['paineis', 'pessoal', 'meu-trabalho']

function estaAtivo(pathname: string, rota: string): boolean {
  if (rota === '/') return pathname === '/'
  return pathname === rota || pathname.startsWith(`${rota}/`)
}

function grupoDaRota(pathname: string): string | undefined {
  return GRUPOS.find((g) => g.itens.some((i) => estaAtivo(pathname, i.rota)))?.chave
}

export function Sidebar() {
  const [recolhida, setRecolhida] = useState(false)
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set(GRUPOS_ABERTOS_PADRAO))
  const [grupoFlutuante, setGrupoFlutuante] = useState<string | null>(null)
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade
  const [contagemVencimentos, setContagemVencimentos] = useState(0)
  const [headcount, setHeadcount] = useState(0)
  const location = useLocation()

  useEffect(() => {
    if (!unidade) return
    contarVencimentosUrgentes(unidade.id).then(setContagemVencimentos)
    buscarHeadcount(unidade.id).then(setHeadcount)
  }, [unidade])

  useEffect(() => {
    const grupoAtivo = grupoDaRota(location.pathname)
    if (grupoAtivo) {
      setGruposAbertos((atual) => (atual.has(grupoAtivo) ? atual : new Set(atual).add(grupoAtivo)))
    }
    setGrupoFlutuante(null)
  }, [location.pathname])

  function alternarGrupo(chave: string) {
    setGruposAbertos((atual) => {
      const novo = new Set(atual)
      if (novo.has(chave)) novo.delete(chave)
      else novo.add(chave)
      return novo
    })
  }

  function badgeDoItem(item: ItemMenu) {
    if (item.badge === 'vencimentos' && contagemVencimentos > 0) {
      return (
        <span className="ml-auto shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
          {contagemVencimentos}
        </span>
      )
    }
    if (item.badge === 'headcount' && headcount > 0) {
      return (
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
          {headcount}
        </span>
      )
    }
    return null
  }

  return (
    <aside
      className={`relative flex h-screen flex-col border-r border-slate-200 bg-white transition-all ${
        recolhida ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand-700 text-xs font-semibold text-white">
          RH
        </span>
        {!recolhida && <span className="truncate text-sm font-semibold text-slate-800">Sistema RH/DP</span>}
      </div>

      <button
        onClick={() => setRecolhida((valor) => !valor)}
        className="flex h-9 items-center justify-center border-b border-slate-200 text-xs text-slate-500 hover:bg-slate-50"
      >
        {recolhida ? '»' : '« Recolher'}
      </button>

      <nav
        className={`flex-1 space-y-1 p-2 text-sm text-slate-600 ${recolhida ? 'overflow-visible' : 'overflow-y-auto'}`}
      >
        {GRUPOS.map((grupo) => {
          const aberto = gruposAbertos.has(grupo.chave)
          const algumAtivo = grupo.itens.some((i) => estaAtivo(location.pathname, i.rota))

          if (recolhida) {
            return (
              <div key={grupo.chave} className="relative">
                <button
                  title={grupo.rotulo}
                  onClick={() => setGrupoFlutuante((atual) => (atual === grupo.chave ? null : grupo.chave))}
                  className={`flex w-full items-center justify-center rounded p-2 ${
                    algumAtivo || grupoFlutuante === grupo.chave
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {grupo.icone}
                </button>

                {grupoFlutuante === grupo.chave && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setGrupoFlutuante(null)} />
                    <div className="absolute left-full top-0 z-20 ml-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                      <p className="px-2 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {grupo.rotulo}
                      </p>
                      {grupo.itens.map((item) => (
                        <NavLink
                          key={item.rota}
                          to={item.rota}
                          end={item.rota === '/'}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded px-2 py-1.5 ${
                              isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                            }`
                          }
                        >
                          {item.icone}
                          <span className="truncate">{item.rotulo}</span>
                          {badgeDoItem(item)}
                        </NavLink>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          }

          return (
            <div key={grupo.chave}>
              <button
                onClick={() => alternarGrupo(grupo.chave)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-50"
              >
                {grupo.icone}
                <span className="flex-1 text-left">{grupo.rotulo}</span>
                <ChevronBaixo aberto={aberto} />
              </button>

              {aberto && (
                <div className="ml-[13px] space-y-0.5 border-l border-slate-100 py-0.5 pl-2.5">
                  {grupo.itens.map((item) => (
                    <NavLink
                      key={item.rota}
                      to={item.rota}
                      end={item.rota === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded px-2 py-1.5 text-sm ${
                          isActive ? 'bg-brand-50 font-medium text-brand-700' : 'hover:bg-slate-50'
                        }`
                      }
                    >
                      {item.icone}
                      <span className="truncate">{item.rotulo}</span>
                      {badgeDoItem(item)}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
