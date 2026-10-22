# Mapa oficial de arquivos

- `apps/student/`: portal do aluno.
- `apps/professor/`: portal do professor.
- `apps/shared/css/rfit.css`: **única folha de estilos oficial dos dois portais**. Alterar este arquivo no lugar; não criar folhas alternativas nem manter CSS substituído.
- `services/api/src/index.js`: entrada do Worker.
- `services/api/src/routes/`: rotas HTTP.
- `services/api/src/middleware/`: futuro middleware de autenticação e autorização.
- `services/api/src/services/`: regras de negócio.
- `database/migrations/`: migrações D1 versionadas.
- `tests/`: testes automatizados.

## Regra de manutenção visual
Toda mudança de visual deve editar `apps/shared/css/rfit.css` e os HTMLs que o referenciam. Não criar `style-v2.css`, `final.css`, temas paralelos ou CSS legado. Remover referências e arquivos substituídos na mesma mudança. Os HTMLs pré-carregam a folha oficial para reduzir flash sem estilo.
