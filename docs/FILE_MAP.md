# R-Fit V2 — mapa oficial de arquivos

> Regra de organização: uma responsabilidade por arquivo, pastas por domínio e um único CSS global oficial. Não criar cópias de telas para fazer variantes.

## Aplicação

- `apps/shared/css/rfit.css` — **único CSS global oficial**, com tokens, componentes e regras responsivas.
- `apps/shared/js/api-client.js` — cliente HTTP compartilhado; ponto único para chamadas same-origin.
- `apps/student/index.html` — entrada técnica do portal do aluno; encaminha para o login dedicado.
- `apps/student/pages/login.html` — tela de login do aluno e acesso Google do professor.
- `apps/student/pages/dashboard.html` — estrutura da área autenticada do aluno.
- `apps/student/js/login.js` — comportamento exclusivo do formulário de login.
- `apps/student/js/dashboard.js` — sessão, saudação e saída do aluno.
- `apps/professor/index.html` — entrada técnica do portal profissional; encaminha para o dashboard dedicado.
- `apps/professor/pages/dashboard.html` — estrutura da área autenticada do professor.
- `apps/professor/js/dashboard.js` — validação da sessão profissional e saída.

## API

- `services/api/src/index.js` — roteador central, proteção de páginas e fallback de assets.
- `services/api/src/routes/auth.routes.js` — login, OAuth Google, sessão e logout.
- `services/api/src/routes/health.routes.js` — verificação de saúde do Worker e D1.

## Dados

- `database/migrations/0001_initial_schema.sql` — estrutura inicial do banco.
- `database/migrations/0002_test_student_account.sql` — definição da conta de demonstração com hash de senha. Aplicar apenas no banco `rfit-v2-db`.

## Documentação

- `docs/ARCHITECTURE.md` — limites e responsabilidades das camadas.
- `docs/FILE_MAP.md` — este mapa.
- `docs/CODE_STANDARDS.md` — convenções de código e comentários.
- `docs/API.md` e `docs/DATABASE.md` — contrato da API e consultas.
- `docs/DEPLOYMENT.md`, `docs/ENVIRONMENT.md`, `docs/PORTABILITY.md` — publicação e portabilidade.

## Regras obrigatórias

1. Nunca duplicar o CSS global nem criar arquivos `style-v2.css`, `new.css` ou equivalentes.
2. HTML estrutura a tela; JS daquela tela controla seus eventos; o cliente compartilhado controla chamadas HTTP; API valida identidade e permissões.
3. Rotas privadas precisam de validação no servidor. Esconder botão ou redirecionar com JavaScript não é controle de segurança.
4. Cada consulta SQL deve documentar finalidade, tabelas, parâmetros e exigência de autorização.
5. Antes de excluir/renomear arquivo, pesquisar referências e atualizar imports, rotas e esta documentação.
6. A estrutura está em evolução e ainda precisa de testes de integração antes de produção.
