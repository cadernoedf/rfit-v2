# R-Fit V2

Nova base independente do R-Fit. O portal antigo, seus Workers e seu banco não fazem parte deste projeto.

## Estado atual
- Estrutura modular inicial.
- Migração SQL `0001_initial_schema.sql`.
- Frontends separados para aluno e professor.
- API Worker separada por rotas, serviços e middleware.
- **Ainda não é uma aplicação pronta para produção.** Cadastro, login, OAuth, pagamento, autorização completa, WhatsApp e geração de planos precisam ser implementados e testados antes de uso real.

## Estrutura
- `apps/student`: portal do aluno.
- `apps/professor`: portal do professor.
- `services/api`: API Cloudflare Worker.
- `database/migrations`: migrações SQL versionadas.
- `docs`: arquitetura, segurança, banco e implantação.
- `tests`: testes iniciais.

## Desenvolvimento
Use Node.js LTS e Wrangler instalado localmente. Nunca coloque segredos em arquivos versionados.
Consulte `docs/DEPLOYMENT.md` antes de publicar.
