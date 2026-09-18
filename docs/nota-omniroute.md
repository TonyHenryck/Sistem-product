# Nota: OmniRoute e consumo de tokens do Claude

> Nota tecnica pessoal (infra de IA do usuario), sem relacao com regras de
> negocio do sistema RH/DP. Registrada em 18/09/2026 a partir de uma
> conversa externa (ChatGPT) sobre instalacao do OmniRoute.

## Contexto

Instalacao do [OmniRoute](https://github.com) (roteador/proxy de LLMs) via
`npm install -g omniroute`, na tentativa de reduzir o consumo de
tokens/cota do Claude.

## Status da instalacao

- OmniRoute v3.8.50 instalado
- Dashboard e API rodando juntos na porta `20128`
- Banco SQLite funcionando
- Claude Web conectado e testado (Claude Opus 5 respondeu)
- `GET /api/monitoring/health` retornou `200 OK`

## Pendencia (nao aplicada)

Servidor exposto em `0.0.0.0` sem API key. Correcao sugerida, mas nao
aplicada ainda por seguranca (evitar mexer em config que ja estava
funcionando):

```
OMNIROUTE_SERVER_HOST=127.0.0.1
```

Colocar em `C:\Users\NUTRICAO NUTRIMAX\.omniroute\.env`.

## Conclusao importante

**OmniRoute nao aumenta a cota/franquia do Claude.** Ele apenas:

- agrupa varios provedores/fontes e alterna entre eles;
- faz fallback para outro modelo quando um provedor atinge limite;
- em alguns casos comprime o que e enviado;
- permite usar modelos gratuitos/alternativos quando disponiveis.

Se so o Claude estiver conectado, o fluxo e simplesmente
`Voce -> OmniRoute -> Claude`, sem nenhum ganho de cota.

## Descoberta no Analytics do OmniRoute

Painel mostrou **0 tokens, 0 requisicoes, 0 provedores em uso** (so um
registro antigo isolado de "71 tokens"). Ou seja, o OmniRoute nao estava
sendo usado de fato.

O consumo de Claude que o usuario percebia vem do **conector do Lovable**,
que fala direto com o Claude:

```
Claude -> conector do Lovable -> Lovable
```

O OmniRoute so entraria nessa conta se algum programa fosse configurado
para chamar `http://localhost:20128/v1` explicitamente — o que nao estava
acontecendo.

## Recomendacao registrada

Nao mexer mais no OmniRoute por enquanto. Para ele realmente ajudar a nao
esbarrar tao rapido no limite do Claude, seria preciso configurar
**varios provedores + fallback/auto**, e nao apenas Claude -> OmniRoute ->
Claude. Decidir esse objetivo antes de configurar mais.
