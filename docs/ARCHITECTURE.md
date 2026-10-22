# Arquitetura

- `apps/student`: interface do aluno.
- `apps/professor`: interface administrativa.
- `services/api`: API Cloudflare Worker.
- `database/migrations`: esquema SQL versionado para D1.
- `docs`: documentação.
- `tests`: testes automatizados.

Os portais devem permanecer separados no código e a API deve verificar a identidade e as permissões no servidor. Separação visual não substitui autorização server-side.
