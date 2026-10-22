# Implantação

1. Instale Node.js LTS.
2. Instale dependências com `npm install`.
3. Confira `wrangler.toml` e confirme o ID do D1 V2.
4. Aplique migrações somente ao banco V2: `npx wrangler d1 migrations apply rfit-v2-db --remote`.
5. Rode testes: `npm test`.
6. Teste localmente: `npm run dev`.
7. Publique somente depois de revisar segurança e funcionalidades: `npm run deploy`.

Não execute migrações contra `rfit-db` ou qualquer banco legado.
