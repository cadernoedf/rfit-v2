# R-Fit V2

Nova base independente do R-Fit legado. Não alterar os Workers nem o banco antigo a partir deste projeto.

## Estrutura
- `apps/student`: portal do aluno.
- `apps/professor`: portal do professor.
- `apps/shared/css/rfit.css`: única folha de estilos compartilhada e oficial.
- `services/api`: API Cloudflare Worker.
- `database/migrations`: migrações SQL versionadas.
- `docs`: arquitetura, segurança, banco e implantação.
- `tests`: testes iniciais.

## Regra de CSS
Editar sempre `apps/shared/css/rfit.css` no lugar. Não criar versões paralelas nem deixar folhas substituídas referenciadas pelos portais. Cada página deve carregar somente a folha oficial.

## Estado atual
Este repositório ainda é uma estrutura inicial, não uma aplicação pronta para produção. Login, OAuth, autorização, pagamentos, anamnese, treinos, dietas, controle de vencimento e testes completos ainda precisam ser implementados.

## Desenvolvimento
Use Node.js LTS e Wrangler. Nunca versione segredos reais. Consulte `docs/DEPLOYMENT.md` antes de publicar.
