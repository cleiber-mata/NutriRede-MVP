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

/**
 * Retorna a data civil atual de Brasília no formato YYYY-MM-DD.
 * Garante que a data civil de Brasília seja respeitada independentemente do fuso do navegador ou servidor.
 */
export function getTodayCivilDateBR(refDate: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(refDate);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Retorna o horário civil atual de Brasília no formato HH:mm (24h).
 */
export function getCurrentTimeBR(refDate: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(refDate);

  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';

  return `${hour}:${minute}`;
}

/**
 * Verifica se a data civil de validade é estritamente anterior à data de hoje em Brasília (M41).
 * Comparações YYYY-MM-DD lexicais puras:
 * - Se validade for "2026-11-04" e hoje for "2026-11-04": retorna FALSE (não está vencido por ser hoje).
 * - Se validade for "2026-11-03" e hoje for "2026-11-04": retorna TRUE (vencido ontem).
 * - Se validade for "2026-11-05" e hoje for "2026-11-04": retorna FALSE (futuro).
 */
export function isDateBeforeTodayCivilBR(expirationDateStr?: string | null, refDate: Date = new Date()): boolean {
  if (!expirationDateStr) return true;
  const cleanExp = expirationDateStr.trim().split('T')[0];
  const todayBR = getTodayCivilDateBR(refDate);
  return cleanExp < todayBR;
}

/**
 * Avalia se o lote está vencido no momento atual (considerando data civil e horário-limite de consumo).
 * Para refeições preparadas (marmitas), verifica também o horário-limite explícito no dia de hoje.
 */
export function isBatchExpired(
  expirationDateStr?: string | null,
  consumptionDeadline?: string | null,
  refDate: Date = new Date()
): boolean {
  if (!expirationDateStr) return true;
  const cleanExp = expirationDateStr.trim().split('T')[0];
  const todayBR = getTodayCivilDateBR(refDate);

  if (cleanExp < todayBR) {
    return true; // Venceu em dia anterior
  }

  if (cleanExp > todayBR) {
    return false; // Válido para dia futuro
  }

  // Se a validade é hoje:
  if (consumptionDeadline && consumptionDeadline.trim()) {
    const cleanDeadline = consumptionDeadline.trim();
    const deadlineTime = cleanDeadline.includes('T')
      ? cleanDeadline.split('T')[1].slice(0, 5)
      : cleanDeadline.slice(0, 5);

    const currentTimeBR = getCurrentTimeBR(refDate);
    // Se o horário de consumo já passou no fuso de Brasília
    return currentTimeBR > deadlineTime;
  }

  // Sem horário-limite explícito, alimento válido ao longo do dia civil de hoje
  return false;
}

/**
 * Valida a janela operacional de retirada contra o limite de validade e consumo seguro (M41).
 * Garante que:
 * 1. O término da retirada não exceda a data de validade.
 * 2. Se houver horário-limite de consumo informado (ex: marmitas até 13h), a retirada termine antes dele.
 */
export function validatePickupWindowAgainstExpiration(
  pickupWindowEnd?: string | null,
  expirationDateStr?: string | null,
  consumptionDeadline?: string | null
): { valid: boolean; error?: string } {
  if (!pickupWindowEnd || !expirationDateStr) {
    return { valid: false, error: 'Datas da janela e validade são obrigatórias.' };
  }

  const cleanExp = expirationDateStr.trim().split('T')[0];
  const cleanEnd = pickupWindowEnd.trim();
  const endDatePart = cleanEnd.split('T')[0];

  // 1. A retirada não pode terminar em dia posterior à validade
  if (endDatePart > cleanExp) {
    return {
      valid: false,
      error: 'O término da janela de retirada não pode ultrapassar a data de validade do alimento.'
    };
  }

  // 2. Se houver horário-limite de consumo seguro (ex: marmita às 13h)
  if (consumptionDeadline && consumptionDeadline.trim()) {
    const cleanDeadline = consumptionDeadline.trim();
    const deadlineTime = cleanDeadline.includes('T')
      ? cleanDeadline.split('T')[1].slice(0, 5)
      : cleanDeadline.slice(0, 5);

    const deadlineISO = `${cleanExp}T${deadlineTime}`;
    const endTimeNormalized = cleanEnd.slice(0, 16);

    if (endTimeNormalized > deadlineISO) {
      const formattedLimit = deadlineTime.replace(':', 'h');
      return {
        valid: false,
        error: `A janela de retirada não pode ultrapassar o horário-limite de consumo seguro (${formattedLimit}). Ajuste o término da retirada.`
      };
    }
  }

  return { valid: true };
}
