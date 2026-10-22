# Banco de dados

A migração `0001_initial_schema.sql` define a estrutura inicial e os quatro planos de catálogo. Os preços estão inicializados em zero intencionalmente: definir preços reais exige decisão comercial. Não habilitar checkout antes de configurar preço, provedor, validação de webhook e idempotência.

Antes de cada migração: revisar o SQL, testar em banco local, aplicar em banco de teste, conferir índices e constraints e registrar versão e plano de rollback.