import { useEffect, useRef, useState } from 'react'

// Anima um numero subindo do valor anterior ate o novo - sem lib externa,
// so requestAnimationFrame. Usado nos cards de indicador do painel.
export function useContagemAnimada(valorFinal: number, duracaoMs = 800): number {
  const [valorExibido, setValorExibido] = useState(valorFinal)
  const valorAnterior = useRef(valorFinal)

  useEffect(() => {
    const inicio = valorAnterior.current
    const diferenca = valorFinal - inicio
    if (diferenca === 0) return

    let frame: number
    const tempoInicio = performance.now()

    function passo(agora: number) {
      const progresso = Math.min((agora - tempoInicio) / duracaoMs, 1)
      const suavizado = 1 - (1 - progresso) * (1 - progresso)
      setValorExibido(Math.round(inicio + diferenca * suavizado))
      if (progresso < 1) frame = requestAnimationFrame(passo)
      else valorAnterior.current = valorFinal
    }

    frame = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(frame)
  }, [valorFinal, duracaoMs])

  return valorExibido
}
