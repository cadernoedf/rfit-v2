# Padrões obrigatórios de código

## Comentários e localização
- Todo arquivo começa com descrição da finalidade e um índice de seções.
- Cada função pública documenta finalidade, parâmetros, retorno, dependências, tabelas consultadas e autorização exigida quando aplicável.
- Comentários explicam contexto e decisões; não descrevem o óbvio linha a linha.
- Quando uma função muda, atualizar o comentário na mesma alteração.

## Uma fonte oficial
- Um único CSS: apps/shared/css/rfit.css.
- Não criar arquivos final, v2, backup, old ou estilos paralelos para corrigir o principal.
- Não manter código morto, duplicado, riscado ou comentários com código desativado.
- Se uma função for substituída, atualizar todos os chamadores e remover a antiga após verificar referências.
- Não usar herança de CSS como mecanismo de versionamento. Classes e componentes compartilhados são permitidos quando intencionais e documentados.

## HTML
- index.html funciona como shell semântico; importar CSS com link href e JS com script src.
- Evitar estilos inline e JavaScript inline.
- Não inserir segredos nem lógica de negócio em HTML.
- Carregar cada asset oficial apenas uma vez.

## JavaScript e API
- Preferir módulos ES e imports explícitos.
- Centralizar chamadas HTTP em cliente API e centralizar endpoint configurável.
- Validar entrada no servidor; não confiar em dados do navegador.
- Evitar SQL nas rotas: usar services e repositories.
- Tratar erros sem expor segredos, SQL ou dados privados.

## Banco
Cada query documenta:
1. Nome e finalidade da consulta.
2. Tabelas e colunas utilizadas.
3. Parâmetros e filtros.
4. Identidade e autorização necessárias.
5. Formato esperado da resposta.
6. Índices/migrações relacionados quando relevante.

Usar SQL parametrizado, migrações versionadas e testes. Não alterar diretamente migrações já aplicadas a ambientes compartilhados.
