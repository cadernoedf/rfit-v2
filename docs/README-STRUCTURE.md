# Mapa de responsabilidade — R-Fit V2

| Camada | Responsabilidade | Não deve conter |
|---|---|---|
| HTML | Estrutura semântica e imports de assets | SQL, segredos, regras de negócio |
| CSS oficial | Todo estilo compartilhado do produto | CSS concorrente por versão |
| Frontend JS | Estado de interface e interação | Credenciais privadas, autorização confiável |
| API routes | HTTP, validação inicial e resposta | SQL complexo e regras de negócio duplicadas |
| Middleware | Sessão, autenticação, autorização, limites | UI ou estilos |
| Services | Regras de negócio independentes do host | SDK de provedor acoplado diretamente |
| Repositories | Persistência via contrato de dados | Decisões de UI |
| Adapters | Integração com provedor específico | Regras de negócio gerais |
| Migrations | Evolução versionada do esquema | Dados reais ou segredos |
| Tests | Verificar comportamento e contratos | Acesso a produção por padrão |

Toda nova funcionalidade deve indicar seu arquivo principal, seu contrato, dependências e testes. Se uma função mudar de lugar, atualizar os imports e este mapa na mesma alteração.
