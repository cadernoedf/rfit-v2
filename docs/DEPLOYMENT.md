# Implantação e troca de domínio/hospedagem

## Configuração
1. Configuração pública de frontend e API deve ficar centralizada, sem segredos.
2. Segredos ficam no mecanismo de secrets do provedor.
3. A configuração de deploy contém valores operacionais; não duplicar valores no código.
4. Confirmar variáveis e binding D1 no ambiente-alvo antes do deploy.

## Checklist de migração
- [ ] Backup de banco e arquivos.
- [ ] Confirmar domínio, DNS, TLS/HTTPS e origem da API.
- [ ] Configurar variáveis públicas e secrets no novo ambiente.
- [ ] Configurar CORS/origens permitidas se frontend e API tiverem domínios diferentes.
- [ ] Confirmar cookies/sessões com flags Secure, HttpOnly e SameSite apropriadas.
- [ ] Aplicar migrações somente ao banco correto.
- [ ] Configurar storage de fotos e permissões privadas.
- [ ] Executar testes unitários, integração e smoke test.
- [ ] Testar login, autorização por papel, assinatura, leitura/escrita e recuperação de sessão.
- [ ] Verificar cache de assets e republicar a versão correta.
- [ ] Manter rollback documentado antes de trocar tráfego.

## Limites
Plug-and-play significa configuração centralizada e passos reproduzíveis; não significa que toda hospedagem seja idêntica. Adaptadores de banco, autenticação, storage, funções agendadas e pagamentos podem exigir alterações específicas. Não anunciar migração concluída até testar o novo ambiente.
