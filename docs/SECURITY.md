# Segurança

- Nunca versionar chaves, tokens, senhas ou variáveis secretas.
- Guardar segredos via `wrangler secret put`.
- Validar autorização no servidor em cada rota protegida.
- Não confiar em papel, plano ou validade enviados pelo navegador.
- Usar consultas SQL parametrizadas.
- Preservar os recursos antigos e fazer backup antes de qualquer migração.
- Não inserir dados pessoais reais durante desenvolvimento.
