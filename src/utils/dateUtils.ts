/**
 * Utilitários de Formatação de Data e Horário — NutriRede
 * Formatação brasileira (pt-BR) com prevenção de desvio de fuso horário.
 */

/**
 * Converte strings de data/hora (inclusive ISO e datetime-local)
 * para o formato oficial: DD/MM/AAAA às HH:mm (24 horas)
 */
export function formatDateTimeBR(dateStr?: string | null): string {
  if (!dateStr) return '-';

  // Trata formato datetime-local direto (YYYY-MM-DDTHH:mm) preservando horário exato digitado
  const localMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (localMatch) {
    const [, year, month, day, hour, minute] = localMatch;
    return `${day}/${month}/${year} às ${hour}h${minute}`;
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} às ${hour}h${minute}`;
}

/**
 * Converte data simples (YYYY-MM-DD) ou timestamp ISO para DD/MM/AAAA
 * Previne o desvio de fuso horário em datas puras (ex: 01/03/2027 não vira 28/02/2027)
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '-';

  // 1. Data pura (YYYY-MM-DD) digitada pelo usuário ou persistida sem fuso
  const pureMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureMatch) {
    const [, year, month, day] = pureMatch;
    return `${day}/${month}/${year}`;
  }

  // 2. Timestamps com hora/fuso
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Retorna as duas datas da janela formatadas individualmente
 */
export function formatPickupWindowBR(
  startStr?: string | null,
  endStr?: string | null
): { start: string; end: string } {
  return {
    start: formatDateTimeBR(startStr),
    end: formatDateTimeBR(endStr)
  };
}
