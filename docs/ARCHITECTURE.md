# Arquitetura e organização oficial do R-Fit V2

## Objetivos
- Separação por responsabilidade e domínio.
- Código legível com comentários de seção, funções nomeadas e contratos documentados.
- Uma única fonte oficial por função; sem cópias antigas, arquivos paralelos de versão ou estilos concorrentes.
- Configuração de ambiente centralizada para facilitar troca de domínio e hospedagem.

## Estrutura-alvo

    apps/
      shared/css/rfit.css       # ÚNICA folha CSS oficial
      shared/js/config/         # configuração pública não secreta
      student/index.html        # shell do portal do aluno
      student/js/app.js         # inicialização da área do aluno
      student/js/api-client.js  # chamadas HTTP do aluno
      student/js/pages/         # controladores por tela
      student/js/components/    # componentes específicos do aluno
      professor/index.html      # shell do portal do professor
      professor/js/app.js       # inicialização da área profissional
      professor/js/api-client.js
      professor/js/pages/
      professor/js/components/
    services/api/src/
      index.js                  # entrada e roteamento do Worker
      routes/                   # endpoints HTTP
      middleware/               # autenticação, autorização e validação
      services/                 # regras de negócio
      repositories/             # acesso a D1 e SQL centralizado
      validators/               # validação de entrada
      utils/
    database/migrations/        # migrações SQL numeradas
    database/seeds/             # dados de desenvolvimento não sensíveis
    docs/                       # documentação técnica e operacional
    tests/unit/
    tests/integration/
    tests/e2e/

## Regras de index.html
- A index contém somente estrutura HTML semântica, metadados, links de assets e o ponto de montagem da tela.
- CSS carregado com link rel="stylesheet" href="..."; o atributo é href, não src.
- JavaScript externo carregado com script type="module" src="...".
- Imagens usam src ou srcset; não carregar estilos inline ou blocos grandes de JavaScript na index.
- Não incluir estilos, URLs de API e caminhos duplicados espalhados em várias páginas.
- Precarregar apenas assets críticos; não usar preload indiscriminadamente.
- Cada página carrega o CSS oficial uma única vez.

## Plug-and-play de hospedagem
- Usar caminhos relativos para assets estáticos quando viável.
- Centralizar endpoint de API e nome do ambiente em configuração pública única.
- Segredos somente em secrets do provedor, nunca no frontend ou Git.
- Configurações específicas do host ficam na configuração de deploy, não no código de negócio.
- Evitar dependência de domínio fixo, cookies com domínio fixo e URLs absolutas hard-coded.
- Separar origem do frontend e API por configuração; documentar CORS quando forem domínios diferentes.
- Guardar uploads em armazenamento configurável, sem depender de caminhos locais do host.
- Executar build/testes e smoke tests após trocar domínio ou provedor.

## Organização de acesso a dados
Rotas HTTP não devem conter SQL complexo diretamente. A rota valida request, middleware verifica identidade/permissões, serviço aplica regra de negócio e repository executa SQL parametrizado. Toda consulta documenta tabelas, finalidade, filtros, dados retornados e autorização exigida.

## Migrações
- Não alterar migrações já aplicadas a ambientes compartilhados; criar uma migração numerada nova.
- Testar primeiro em banco local/teste.
- Nunca apontar migração para banco legado.
- Segredos e dados pessoais reais não entram em seeds.
