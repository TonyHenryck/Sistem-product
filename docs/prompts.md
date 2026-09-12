# Sequencia de tarefas para o Claude Code

Uma tarefa por vez. Revise o diff antes de seguir. Nao junte tarefas.

## Tarefa 1 — esqueleto e conexao

Criar projeto Vite + React + TypeScript + Tailwind. Cliente Supabase
tipado a partir do schema (`supabase gen types typescript`). Tela de login
por e-mail e senha. Layout com sidebar recolhivel. Helper de formatacao de
data em dd/mm/aaaa e de moeda em R$. Rota protegida que so abre com sessao
valida e vinculo em `usuario_unidade`.

Criterio de pronto: logar, ver o nome da unidade no topo, deslogar.

## Tarefa 2 — colaboradores

Listagem com filtro por funcao, area, local e escala. Cards ou tabela,
o que ficar mais legivel. Ficha completa com abas. Dado bancario numa aba
separada, carregada sob demanda e so para papel gestor ou admin. Criar,
editar e desligar (soft delete via `ativo`).

Criterio de pronto: os colaboradores importados aparecem e sao editaveis.

## Tarefa 3 — escala

Calendario mensal por local. Cor por tipo de escala, vinda de
`cat_escala.cor`. Considerar troca de turno, ferias e afastamento ao
montar o dia. Visao de cobertura mostrando furo de escala. Turno noturno
cruza a meia-noite, trate a virada.

## Tarefa 4 — diarias, faltas e trocas

Tres telas de lancamento. Na diaria, quem cobriu pode ser do quadro
(`cobriu_id`) ou de fora (`cobriu_nome` + `diaria_beneficiario`). Valor
padrao vem de `config_regra` conforme o turno. Na falta, `descontar` e
`perde_dsr` sao perguntas separadas. Na troca, alertar devolucao pendente.

## Tarefa 5 — vencimentos e alertas

Tela unica lendo `v_vencimento`, agrupada por urgencia (vencido, 30 dias,
60 dias). Incluir ASO, experiencia 45 e 90 dias, fim de contrato de
prestador e ferias a programar. Badge com a contagem no menu lateral.

## Tarefa 6 — ponto

Importacao do relatorio do FACEPONTO (CSV ou colar e processar). Gravar em
`saldo_sistema`, permitir digitar `saldo_conferido` e listar so as
divergencias. Lembrar: quem faz 12 horas esta cadastrado la como 8.

## Tarefa 7 — FOPAG

Checklist da competencia com contador ate o dia limite (vem de
`config_regra`). Reune pendencias de pagamento e diarias em aberto.
Exportar o resumo para a matriz. Status "Enviado" e diferente de
"Confirmado pela matriz".

## Tarefa 8 — almoxarifado e compras

Catalogo de produto, movimento de entrada e saida, contagem fisica com
diferenca calculada, requisicao por setor. Saldo vem de `v_saldo_produto`.
Alerta de estoque minimo em `item_estoque`.

## Tarefa 9 — importacao de nota fiscal

Upload por arrastar e soltar. Ler XML de NFe e preencher `nota_fiscal` e
`nota_item`. Tela de conferencia obrigatoria antes de virar movimento de
estoque e lancamento de custo. Chave de acesso duplicada e bloqueada pelo
banco, trate o erro com mensagem clara. PDF e foto ficam para depois.

## Tarefa 10 — painel

Cards de headcount, absenteismo, custo do mes, cobertura de escala e
documentos vencendo. Serie mensal de custo. Ler das views. Visual limpo,
sem enfeite, legivel em 5 segundos.

## Depois

PWA para contagem de estoque no celular. Agente de IA para consulta e
redacao de documentos. Landing page quando for virar produto.
