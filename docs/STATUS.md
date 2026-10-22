# Status do R-Fit V2

## Isolamento
- Repositório: `cadernoedf/rfit-v2`.
- Worker novo: `rfit-v2`.
- D1 novo: `rfit-v2-db`.
- Recursos legados `rfit`, `rfit-api`, `rfit-db` permanecem fora do escopo.

## Visual
- Os dois portais usam apenas `apps/shared/css/rfit.css`.
- Folhas de estilo antigas e suas referências foram removidas.
- Os HTMLs pré-carregam o CSS principal para reduzir flash de estilo.

## Fase atual
Base inicial com portais de apresentação e endpoint de saúde. Autenticação, OAuth, cadastro, cobrança, anamnese, planos personalizados, controle de acesso e testes de ponta a ponta ainda faltam.

## Segurança
Não usar com dados reais nem divulgar como pronto para alunos antes de concluir autenticação, autorização server-side, pagamentos, privacidade e testes.
