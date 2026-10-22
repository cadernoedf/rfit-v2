# R-Fit V2 — Contrato de portabilidade plug-and-play

## Objetivo obrigatório
A aplicação deve ser preparada desde o início para que domínio e provedor possam mudar sem reescrever as regras de negócio. A portabilidade é validada por testes; não é uma promessa automática para serviços proprietários.

## Princípios
1. Código de domínio independente do provedor.
2. Configuração por ambiente, com validação no arranque.
3. Interfaces/adaptadores para banco, autenticação, arquivos, pagamentos, e-mail, WhatsApp e tarefas agendadas.
4. Contratos de API documentados e versionados.
5. Nenhum domínio de produção hard-coded em módulos de negócio.
6. Nenhum segredo no frontend, Git ou logs.
7. Migrações e exportação de dados documentadas.
8. Testes de contrato para cada adaptador e smoke tests pós-deploy.

## Configuração pública versus segredo
Frontend pode receber apenas configuração pública, como URL base da API e identificador do ambiente. Chaves privadas, tokens de pagamento, segredos JWT, credenciais de banco e chaves de storage ficam no secret manager do ambiente de execução.

Variáveis sugeridas para o servidor:
- APP_ENV
- PUBLIC_APP_URL
- API_PUBLIC_URL
- CORS_ALLOWED_ORIGINS
- DATABASE_PROVIDER
- AUTH_PROVIDER
- STORAGE_PROVIDER
- PAYMENT_PROVIDER
- EMAIL_PROVIDER
- WHATSAPP_PROVIDER

Os nomes são um contrato de configuração pretendido; devem ser implementados e validados antes de uso. Não criar valores secretos padrão.

## Adaptadores obrigatórios
- DatabaseRepository: operações de dados por interfaces, SQL isolado nos adaptadores.
- AuthProvider: sessão, login, OAuth e verificação de identidade.
- ObjectStorage: upload, leitura autorizada, exclusão e URL temporária para fotos.
- PaymentProvider: criar cobrança, consultar estado, validar webhook e reembolsar quando suportado.
- NotificationProvider: envio de e-mail e WhatsApp, estado e idempotência.
- SchedulerProvider: tarefas de vencimento, notificações e rotinas periódicas.

A lógica de assinatura, regras de acesso, planos, treino, dieta e perfil deve chamar interfaces de aplicação; não deve importar SDK de um provedor diretamente.

## Troca de provedor: procedimento obrigatório
1. Fazer backup verificável do banco, arquivos e configurações necessárias.
2. Implementar o adaptador novo sem apagar o antigo.
3. Rodar os mesmos testes de contrato contra o novo adaptador.
4. Exportar e importar dados com mapeamento de tipos, IDs, datas e relações.
5. Comparar contagens e amostras de dados, verificando integridade referencial.
6. Testar login, papéis, planos, expiração, fotos, pagamentos e notificações em ambiente de staging.
7. Fazer ensaio de rollback e confirmar como voltar ao provedor anterior.
8. Trocar configuração de ambiente e tráfego numa janela controlada.
9. Monitorar erros, latência e integridade após a troca.
10. Desativar o provedor anterior apenas após aceite explícito e backup final.

## Critério de aceite
Uma troca só é considerada concluída quando testes automatizados e smoke tests passam no novo ambiente, os dados são reconciliados e rollback foi validado. Alterar apenas o domínio não prova portabilidade de banco, autenticação, storage ou pagamentos.
