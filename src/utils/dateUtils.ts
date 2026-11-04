/**
 * Utilitários de Formatação de Data e Horário — NutriRede
 * Formatação brasileira oficial (pt-BR) com fuso de Brasília (America/Sao_Paulo),
 * prevenindo categoricamente a inversão de dia/mês (M20/M21) e desvios de fuso horário.
 */

const SP_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte data simples (YYYY-MM-DD), data brasileira (DD/MM/AAAA) ou timestamp ISO para DD/MM/AAAA.
 * Diferencia estritamente:
 * 1. Strings já formatadas em DD/MM/AAAA.
 * 2. Datas puras de calendário (YYYY-MM-DD) sem hora (preserva os dias digitados).
 * 3. Datetime-local puro (YYYY-MM-DDTHH:mm) sem timezone.
 * 4. Timestamps ISO com timezone (Z, +00:00, -03:00, etc.) no fuso de Brasília (America/Sao_Paulo).
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const trimmed = dateStr.trim();

  // 1. Já está no formato brasileiro DD/MM/AAAA
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${day}/${month}/${year}`;
  }

  // 2. Data pura ISO (YYYY-MM-DD) sem hora
  const pureDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDateMatch) {
    const [, year, month, day] = pureDateMatch;
    return `${day}/${month}/${year}`;
  }

  // 3. Datetime-local puro sem timezone (YYYY-MM-DDTHH:mm ou YYYY-MM-DDTHH:mm:ss)
  // Sem sufixo Z e sem offset (+HH:mm ou -HH:mm após o horário)
  const localMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2})?$/);
  if (localMatch) {
    const [, year, month, day] = localMatch;
    return `${day}/${month}/${year}`;
  }

  // 4. Timestamps ISO com timezone explícito (Z, +00:00, -03:00, etc.) -> Fuso America/Sao_Paulo
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
 * Converte strings de data/hora para o formato oficial: DD/MM/AAAA às HH:mm (24 horas).
 * Preserva horários de retirada digitados localmente e converte timestamps ISO para o fuso de Brasília.
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
  const pureDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDateMatch) {
    const [, year, month, day] = pureDateMatch;
    return `${day}/${month}/${year}`;
  }

  // 2. Datetime-local puro sem timezone (YYYY-MM-DDTHH:mm)
  const localMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/);
  if (localMatch) {
    const [, year, month, day, hour, minute] = localMatch;
    return `${day}/${month}/${year} às ${hour}h${minute}`;
  }

  // 3. Timestamps ISO com timezone (Z, +00:00, -03:00, decidedAt, etc.) -> Fuso America/Sao_Paulo
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
