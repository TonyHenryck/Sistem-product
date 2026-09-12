# Mapa: telas do sistema antigo -> tabelas novas

As ~40 funcoes `render*` do sistema HTML e onde cada uma passa a buscar dado.

| Tela antiga | Tabelas | Observacao |
|---|---|---|
| renderColab / renderFicha / renderIdent | colaborador, colaborador_dado_sensivel, cat_funcao, cat_beneficio | dado bancario agora e tabela a parte |
| renderPessoas / renderLinha | colaborador + joins | linha do tempo derivada, sem tabela propria |
| renderEscala / renderDia / renderDiaDet / renderCobertura | colaborador, cat_escala, cat_horario, troca_turno, ferias_afastamento, falta | escala e calculada a partir do tipo, nao armazenada dia a dia |
| renderPrevisto | cat_escala + colaborador | projecao |
| renderDiario (diarias) | diaria, diaria_beneficiario | pagamento de quem cobriu |
| renderPend | pendencia_pagamento | |
| renderOcor | ocorrencia | |
| renderAdv | advertencia | |
| renderPonto | ponto_competencia | saldo do sistema vs conferido |
| renderFaltas | falta | descontar e perde_dsr sao campos distintos |
| renderTrocas | troca_turno | duas pernas, devolucao pendente |
| renderParental | colaborador (parental, filhos, dependentes) | |
| renderBenef | cat_beneficio, colaborador | |
| renderVenc / renderCompletude / renderGargalos | v_vencimento, colaborador | views |
| renderAvaliacoes | colaborador (aval_35, aval_80, decisao_exp) | |
| renderTreino / renderParticip | treinamento, participacao | RDC 216/2004 |
| renderFopag / renderStat | envio_fopag, pendencia_pagamento, diaria | |
| renderInfo | info_pendente | |
| renderFin / renderPainelRH / renderPainel | v_custo_mes, v_absenteismo_mes, custo_lancamento | |
| renderEstoque / renderComp | item_estoque, compra | material de escritorio e operacao |
| renderAlmox / renderCatalogo / renderMov / renderContagem / renderPainelAlmox | produto, movimento_estoque, contagem, contagem_item | generos alimenticios |
| renderReq | requisicao | |
| renderDocs / anexos | anexo + Supabase Storage | sai do base64 |
| renderBackup | dispensado | backup e responsabilidade do Supabase |

## O que muda de conceito

- `DB.cfg` vira `config_regra`, uma linha por parametro.
- Referencia por nome vira referencia por `uuid`. Os campos `*_nome`
  existem so para quem nao esta no quadro (prestador eventual).
- Listas fixas no JS viram tabelas `cat_*`, editaveis por tela.
- `renderBackup` deixa de existir: o dado nao mora mais no navegador.
