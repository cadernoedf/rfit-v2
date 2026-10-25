# Camada de dados R-Fit

Toda consulta SQL nova deve ficar em `services/api/src/services/data/`, separada por domínio (por exemplo `plans.repository.js`, `students.repository.js`, `settings.repository.js`). Rotas validam autorização e entrada; serviços aplicam regras de negócio; repositórios executam SQL no binding `RFIT_DB`. Não acoplar telas ao provedor de banco. Migrações versionadas ficam em `/database/migrations`.
