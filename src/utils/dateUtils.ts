/**
 * Utilitários de Formatação de Data e Horário — NutriRede
 * Formatação brasileira oficial (pt-BR) com fuso de Brasília (America/Sao_Paulo),
 * prevenindo categoricamente a inversão de dia/mês (M20/M21) e desvios de fuso horário.
 */

const SP_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte data simples (YYYY-MM-DD), data brasileira (DD/MM/AAAA) ou timestamp ISO para DD/MM/AAAA.
 * Previne estritamente a inversão de mês/dia (ex: 03/11/2026 virar 11/03/2026) e desvios de fuso.
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

  // 2. Data pura ISO (YYYY-MM-DD) ou datetime sem timezone UTC explícito (evita desvio de meia-noite)
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (isoDateMatch && (!trimmed.includes('T') || !trimmed.endsWith('Z'))) {
    const [, year, month, day] = isoDateMatch;
    return `${day}/${month}/${year}`;
  }

  // 3. Timestamps ISO com timezone (ex: 2026-11-03T18:00:00.000Z) -> Converte no fuso de Brasília
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: SP_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).formatToParts(date);

      const day = parts.find((p) => p.type === 'day')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const year = parts.find((p) => p.type === 'year')?.value;

      if (day && month && year) {
        return `${day}/${month}/${year}`;
      }
    }
  } catch {
    // Fallback defensivo
  }

  return trimmed;
}

/**
 * Converte strings de data/hora (inclusive ISO e datetime-local)
 * para o formato oficial: DD/MM/AAAA às HH:mm (24 horas)
 * Previne estritamente a inversão de mês/dia e desvios de fuso.
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

  // Se for apenas data pura ISO YYYY-MM-DD
  const isoDateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnlyMatch) {
    const [, year, month, day] = isoDateOnlyMatch;
    return `${day}/${month}/${year}`;
  }

  // 2. Trata formato datetime-local direto (YYYY-MM-DDTHH:mm) preservando horário exato digitado
  const localMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (localMatch && !trimmed.endsWith('Z') && !trimmed.includes('+') && !trimmed.match(/-\d{2}:\d{2}$/)) {
    const [, year, month, day, hour, minute] = localMatch;
    return `${day}/${month}/${year} às ${hour}h${minute}`;
  }

  // 3. Timestamps ISO com timezone (ex: 2026-11-03T18:00:00.000Z ou decidedAt) -> Brasília (America/Sao_Paulo)
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: SP_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(date);

      const day = parts.find((p) => p.type === 'day')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const year = parts.find((p) => p.type === 'year')?.value;
      const hour = parts.find((p) => p.type === 'hour')?.value;
      const minute = parts.find((p) => p.type === 'minute')?.value;

      if (day && month && year && hour && minute) {
        return `${day}/${month}/${year} às ${hour}h${minute}`;
      }
    }
  } catch {
    // Fallback defensivo
  }

  return trimmed;
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
