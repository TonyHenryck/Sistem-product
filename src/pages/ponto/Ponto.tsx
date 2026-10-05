import { useState } from 'react'
import { PontoMensalTab } from './PontoMensalTab'
import { PontoDiarioTab } from './PontoDiarioTab'

type Aba = 'mensal' | 'diario'

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: 'mensal', rotulo: 'Mensal' },
  { chave: 'diario', rotulo: 'Diário (FACEPONTO)' },
]

export function Ponto() {
  const [aba, setAba] = useState<Aba>('mensal')

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-100">Ponto</h1>

      <div className="mb-4 flex gap-1 border-b border-white/10">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            onClick={() => setAba(a.chave)}
            className={`px-3 py-2 text-sm ${
              aba === a.chave
                ? 'border-b-2 border-slate-100 font-medium text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === 'mensal' && <PontoMensalTab />}
      {aba === 'diario' && <PontoDiarioTab />}
    </div>
  )
}
