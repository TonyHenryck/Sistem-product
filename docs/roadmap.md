# Roadmap

## Interno (agora)

- Fase 1: auth, colaborador, escala, diaria, falta, troca
- Fase 2: vencimentos, ponto, FOPAG
- Fase 3: almoxarifado, compras, nota fiscal
- Fase 4: painel
- Fase 5: PWA e agente de IA

Criterio para desligar o sistema HTML antigo: fases 1 e 2 rodando com dado
real por um mes completo, incluindo um fechamento de FOPAG.

## Produto (depois)

O que ja esta pronto para isso:

- `empresa_id` e `unidade_id` em todas as tabelas
- RLS por unidade, com papel por vinculo
- catalogos e regras por empresa, nao no codigo

O que vai faltar quando chegar a hora:

- cadastro de empresa e convite de usuario pela interface
- tela de configuracao das regras por cliente
- cobranca e controle de assinatura
- onboarding e importacao inicial de quadro por planilha
- landing page e material comercial

Nada disso vale ser construido antes de existir o segundo cliente.
