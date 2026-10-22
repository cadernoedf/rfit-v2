/* ==========================================================================
   R-FIT V2 | CLIENTE HTTP DO PORTAL DO ALUNO
   01. Configuração central da API
   02. Verificação de saúde do Worker e do D1
   Regra: as chamadas HTTP deste portal ficam centralizadas neste arquivo.
   Não duplicar fetches em componentes; criar funções nomeadas nesta seção.
   ========================================================================== */

/* 01. CONFIGURAÇÃO CENTRAL DA API */
const API_BASE_URL = ''; // Mesmo domínio do portal; evita endpoints duplicados.

/* 02. VERIFICAÇÃO DA API
   Endpoint: GET /api/health
   Origem dos dados: Worker Cloudflare + consulta SELECT 1 no D1.
   Resposta esperada: { ok, service, database }.
*/
export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('API indisponível');
  }

  return response.json();
}
