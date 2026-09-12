# Sistema RH/DP + Almoxarifado

Contexto para o agente. Leia antes de qualquer tarefa.

## O que e

Sistema de gestao de unidade operacional (cozinha industrial hospitalar).
Substitui um sistema HTML offline de ~40 telas que guardava tudo no
localStorage do navegador. Uso interno primeiro, produto depois.

Unidade piloto: Nutrimax, Imperatriz/MA. Tres locais operacionais: CD,
Maternidade e UPA. Cerca de 41 colaboradores em escalas PAR / IMPAR /
DIARISTA, mais prestadores eventuais. O usuario e Assistente
Administrativo de RH e reporta a matriz em Sao Luis.

## Stack

- Banco e auth: Supabase (Postgres + RLS + Storage)
- Front: React + Vite + TypeScript
- Estilo: Tailwind
- Graficos: Recharts
- Deploy: Vercel

## Regras que nao se negociam

1. **Multiempresa desde sempre.** Toda tabela tem `empresa_id` e, quando
   faz sentido, `unidade_id`. Nunca escreva "Nutrimax", "Imperatriz", "CD",
   "Maternidade" ou "UPA" no codigo. Isso vem do banco.
2. **Regra de negocio configuravel vai para `config_regra`.** Valor de
   diaria, percentual de encargos, teto de salario-familia, dia limite da
   FOPAG. Nao chumbe numero em funcao.
3. **RLS sempre ligada.** Nenhuma query do front usa service role. A chave
   service role existe so nos scripts de `scripts/`.
4. **Dado sensivel e separado.** CPF, PIX, banco, agencia e conta vivem em
   `colaborador_dado_sensivel`, visivel so para papel gestor ou admin.
   Nunca traga esses campos num select generico de listagem.
5. **Nada de dado pessoal em prompt de IA externa.** Quando o modulo de
   agente for construido, envie identificador e nao nome/CPF.
6. **Data no banco e `date` (aaaa-mm-dd). Na tela e sempre dd/mm/aaaa.**
   Centralize num helper de formatacao, nao espalhe `toLocaleDateString`.
7. **Competencia e `char(7)` no formato aaaa-mm.**
8. **Migration para toda mudanca de schema.** Nunca altere tabela pelo
   painel do Supabase sem gerar o arquivo em `supabase/migrations/`.
9. **Soft delete quando o registro tem valor documental** (colaborador,
   advertencia, falta). Use `ativo` ou campo de status, nao DELETE.

## Preferencias do usuario

- Interface limpa e direta, feita para leitura rapida. Sem enfeite.
- Respostas curtas no chat. Prefira mostrar o diff a explicar o diff.
- Portugues do Brasil em toda a interface e nos comentarios.

## Estrutura

```
supabase/migrations/   schema, RLS e seed (ja prontos, rodar em ordem)
scripts/               export do localStorage e import para o banco
seed/produtos.csv      146 generos do almoxarifado, com codigo da empresa
docs/                  mapa de migracao das telas, roadmap e prompts
```

## Ordem de construcao

Fase 1 e onde tudo se apoia. Nao pule para o painel antes dela.

1. Auth, layout, cadastro de colaborador, escala e ponto
2. Vencimentos e alertas (ASO, experiencia 45/90, contrato, ferias)
3. Almoxarifado, compras e importacao de XML de nota fiscal
4. Painel de indicadores
5. Agente de IA e PWA

## Armadilhas conhecidas do dominio

- O sistema de ponto da empresa (FACEPONTO) cadastra quem faz 12 horas
  como jornada de 8 horas. O saldo que ele devolve nao fecha. Por isso
  existem `saldo_sistema` e `saldo_conferido` separados em
  `ponto_competencia`, com a divergencia calculada.
- Colaborador com unidade "Multiplas" atende mais de um local. No banco
  isso e `local_id = null` com `atende_multiplos = true`.
- Escala PAR trabalha em dia par, IMPAR em dia impar, DIARISTA de segunda
  a sabado. Turno noturno cruza a meia-noite (`vira_o_dia` em
  `cat_horario`).
- Troca de turno tem duas pernas: quem folgou e quem assumiu. A devolucao
  fica pendente ate ser registrada, e pendencia aberta e problema real.
- Falta pode ou nao derrubar o DSR da semana. Sao dois campos distintos:
  `descontar` e `perde_dsr`.
- Treinamento exige comprovacao nominal por causa da RDC 216/2004. A
  tabela `participacao` e obrigatoria, nao acessoria.
- A matriz confirma o recebimento da FOPAG. "Enviado" e diferente de
  "Confirmado pela matriz".

## Primeira tarefa

Ler `docs/prompts.md` e comecar pela tarefa 1.
