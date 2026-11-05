/**
 * Configuração de Navegação do NutriRede (M48)
 * 
 * Permite alternar entre o Menu Lateral Profissional (Desktop recolhível + Mobile Drawer)
 * e o layout de cabeçalho tradicional como salvaguarda e proteção contra regressão.
 */

export const NAVIGATION_CONFIG = {
  /**
   * Habilita a navegação por Menu Lateral responsivo (M48).
   * Se for alterado para false, o sistema restaura imediatamente o cabeçalho clássico.
   */
  ENABLE_SIDEBAR_NAV: true,

  /**
   * Chave do LocalStorage para salvar a preferência de expansão/recolhimento no desktop.
   */
  STORAGE_KEY_COLLAPSED: 'nutrirede_sidebar_collapsed',
};
