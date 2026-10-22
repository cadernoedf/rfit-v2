# Migração de dados entre provedores

## Regras
- Nunca migrar diretamente em produção sem ensaio em staging.
- Criar backup e verificar que pode ser restaurado.
- Preservar IDs quando possível; caso mudem, manter tabela de mapeamento.
- Preservar relações, timestamps, status, consentimentos e registros de auditoria.
- Exportar fotos e arquivos de storage separadamente do banco.
- Não copiar segredos, tokens de sessão expirados ou dados desnecessários.
- Validar requisitos legais e de privacidade antes de transferir dados pessoais.

## Validação pós-importação
- Contagem de linhas por tabela.
- Integridade de chaves estrangeiras.
- Amostras determinísticas de registros.
- Totais e status de pagamentos reconciliados com o provedor de pagamento.
- Verificação de arquivos, permissões e URLs privadas.
- Testes de acesso por aluno e professor.
- Teste de backup/restore no novo provedor.

## Rollback
Documentar o ponto de corte, como suspender gravações, como sincronizar alterações finais e como retornar ao ambiente anterior. Não desativar o provedor antigo antes da aprovação final.
