/**
 * Utilitários de Formatação de Data e Horário — NutriRede
 * Formatação brasileira oficial (pt-BR) com prevenção estrita de desvio de fuso horário
 * e correção definitiva de inversão mês/dia (M20/M21).
 */

/**
 * Converte data simples (YYYY-MM-DD), data brasileira (DD/MM/AAAA) ou timestamp ISO para DD/MM/AAAA
 * Previne inversão de mês/dia (ex: 03/11/2026 virar 11/03/2026) e desvio de fuso horário em datas puras.
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const trimmed = dateStr.trim();

  // 1. Já está no formato brasileiro DD/MM/AAAA (ex: "03/11/2026" ou "03/11/2026 às 14h30")
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${day}/${month}/${year}`;
  }

  // 2. Data pura ISO (YYYY-MM-DD) ou datetime sem timezone UTC explícito
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    // Se for data pura (sem hora) ou com T00:00:00, preserva diretamente os dias digitados
    if (!trimmed.includes('T') || trimmed.includes('T00:00:00')) {
      return `${day}/${month}/${year}`;
    }
  }

  // 3. Fallback para Date com fuso local
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return trimmed;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Converte strings de data/hora (inclusive ISO e datetime-local)
 * para o formato oficial: DD/MM/AAAA às HH:mm (24 horas)
 * Previne inversão mês/dia e preserva horários locais.
 */
export function formatDateTimeBR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const trimmed = dateStr.trim();

  // 1. Já está no formato brasileiro com horário (ex: "03/11/2026 às 14:30" ou "03/11/2026 às 14h30")
  const brDateTimeMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*(?:às\s*)?(\d{2})[:h](\d{2})/);
  if (brDateTimeMatch) {
    const [, day, month, year, hour, minute] = brDateTimeMatch;
    return `${day}/${month}/${year} às ${hour}h${minute}`;
  }

  // Se já for apenas DD/MM/AAAA brasileiro
  const brDateOnlyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDateOnlyMatch) {
    const [, day, month, year] = brDateOnlyMatch;
    return `${day}/${month}/${year}`;
  }

  // 2. Trata formato datetime-local direto (YYYY-MM-DDTHH:mm) preservando horário exato digitado
  const localMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (localMatch && !trimmed.endsWith('Z') && !trimmed.includes('+') && !trimmed.match(/-\d{2}:\d{2}$/)) {
    const [, year, month, day, hour, minute] = localMatch;
    return `${day}/${month}/${year} às ${hour}h${minute}`;
  }

  // 3. Timestamps ISO com timezone (ex: 2026-11-03T18:00:00.000Z)
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return trimmed;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} às ${hour}h${minute}`;
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
