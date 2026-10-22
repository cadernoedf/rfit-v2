# Contrato de configuração por ambiente

## Regra
Código versionado não guarda configuração específica de produção nem segredos. Cada ambiente deve ter configuração explícita e validada; não adivinhar URLs nem cair silenciosamente para produção.

## Separação
- Configuração pública do frontend: valores que podem ser expostos no navegador.
- Configuração do servidor: URLs permitidas, providers ativos e opções operacionais.
- Segredos: credenciais privadas mantidas no secret manager do host.
- Binding de banco: declarado no adaptador de infraestrutura, nunca escolhido pelo usuário final.

## Ambientes
- local: desenvolvimento e dados fictícios.
- test: testes automatizados e banco isolado.
- staging: ensaio de deploy e migração.
- production: dados reais, acessos mínimos e monitoramento.

## Requisitos de implementação
- Validar variáveis obrigatórias no arranque.
- Falhar de forma clara quando faltar configuração crítica.
- Nunca usar valores padrão de segredo.
- Não imprimir valores secretos nos logs.
- Não expor credenciais ou strings de conexão no cliente.
- Manter CORS allowlist por ambiente.
- Manter URLs de callback OAuth e webhooks por ambiente.
- Usar HTTPS fora do ambiente local.
