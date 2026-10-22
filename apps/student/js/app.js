/* ==========================================================================
   R-FIT V2 | JAVASCRIPT DO PORTAL DO ALUNO
   01. Imports
   02. Inicialização
   03. Ação de verificação da API
   ========================================================================== */

/* 01. IMPORTS */
import { getHealth } from './api-client.js';

/* 02. INICIALIZAÇÃO */
document.addEventListener('DOMContentLoaded', () => {
  /* 03. AÇÃO DE VERIFICAÇÃO DA API */
  const healthLink = document.querySelector('a[href="/api/health"]');

  healthLink?.addEventListener('click', async (event) => {
    event.preventDefault();

    try {
      const result = await getHealth();
      window.alert(`API: ${result.status}; banco: ${result.database}`);
    } catch {
      window.alert('Não foi possível verificar a API agora.');
    }
  });
});
