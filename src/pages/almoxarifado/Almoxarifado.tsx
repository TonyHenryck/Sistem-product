import { useState } from 'react'
import { CatalogoTab } from './CatalogoTab'
import { MovimentosTab } from './MovimentosTab'
import { ContagemTab } from './ContagemTab'
import { RequisicoesTab } from './RequisicoesTab'

type Aba = 'catalogo' | 'movimentos' | 'contagem' | 'requisicoes'

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: 'catalogo', rotulo: 'Catálogo' },
  { chave: 'movimentos', rotulo: 'Movimentos' },
  { chave: 'contagem', rotulo: 'Contagem física' },
  { chave: 'requisicoes', rotulo: 'Requisições' },
]

export function Almoxarifado() {
  const [aba, setAba] = useState<Aba>('catalogo')

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Almoxarifado</h1>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            onClick={() => setAba(a.chave)}
            className={`px-3 py-2 text-sm ${
              aba === a.chave
                ? 'border-b-2 border-slate-800 font-medium text-slate-800'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === 'catalogo' && <CatalogoTab />}
      {aba === 'movimentos' && <MovimentosTab />}
      {aba === 'contagem' && <ContagemTab />}
      {aba === 'requisicoes' && <RequisicoesTab />}
    </div>
  )
}
