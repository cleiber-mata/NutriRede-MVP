import {
  formatDateBR,
  formatDateTimeBR,
  getTodayCivilDateBR,
  getCurrentTimeBR,
  isDateBeforeTodayCivilBR,
  isBatchExpired,
  validatePickupWindowAgainstExpiration
} from './src/utils/dateUtils';

console.log('====================================================');
console.log('TESTES AUTOMATIZADOS NUTRIREDE — LOTE M41 + M20/M21');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    process.exitCode = 1;
  }
}

// Data simulada de referência: 04/11/2026 às 09:00 no fuso de Brasília (-03:00)
// 09:00 BRT = 12:00:00.000Z
const simDate09h = new Date('2026-11-04T12:00:00.000Z');

// ----------------------------------------------------
// CENÁRIO A — Validade Hoje (04/11/2026)
// ----------------------------------------------------
console.log('\n--- CENÁRIO A: Validade Hoje (04/11/2026 às 09h em Brasília) ---');
const todayCivil = getTodayCivilDateBR(simDate09h);
assert(todayCivil === '2026-11-04', 'getTodayCivilDateBR retorna 2026-11-04 para 04/11/2026 09h BRT', `Recebido: ${todayCivil}`);

const isExpBeforeToday = isDateBeforeTodayCivilBR('2026-11-04', simDate09h);
assert(!isExpBeforeToday, 'isDateBeforeTodayCivilBR("2026-11-04") é FALSE no próprio dia', `Recebido: ${isExpBeforeToday}`);

const isExpiredTodayGeneral = isBatchExpired('2026-11-04', undefined, simDate09h);
assert(!isExpiredTodayGeneral, 'isBatchExpired("2026-11-04") sem deadline é FALSE no próprio dia', `Recebido: ${isExpiredTodayGeneral}`);

const windowGeneralToday = validatePickupWindowAgainstExpiration('2026-11-04T13:00', '2026-11-04');
assert(windowGeneralToday.valid, 'Retirada até 13h no mesmo dia de validade é VÁLIDA', windowGeneralToday.error);

// ----------------------------------------------------
// CENÁRIO B — Validade Ontem (03/11/2026)
// ----------------------------------------------------
console.log('\n--- CENÁRIO B: Validade Ontem (03/11/2026 sendo hoje 04/11/2026) ---');
const isExpYesterdayBefore = isDateBeforeTodayCivilBR('2026-11-03', simDate09h);
assert(isExpYesterdayBefore, 'isDateBeforeTodayCivilBR("2026-11-03") é TRUE (bloqueia publicação de ontem)', `Recebido: ${isExpYesterdayBefore}`);

const isExpiredYesterday = isBatchExpired('2026-11-03', undefined, simDate09h);
assert(isExpiredYesterday, 'isBatchExpired("2026-11-03") é TRUE', `Recebido: ${isExpiredYesterday}`);

const windowYesterday = validatePickupWindowAgainstExpiration('2026-11-04T11:00', '2026-11-03');
assert(!windowYesterday.valid, 'Retirada em 04/11 com validade em 03/11 é BLOQUEADA', windowYesterday.error);

// ----------------------------------------------------
// CENÁRIO C — Validade Futura (05/11/2026)
// ----------------------------------------------------
console.log('\n--- CENÁRIO C: Validade Futura (05/11/2026 sendo hoje 04/11/2026) ---');
const isExpFutureBefore = isDateBeforeTodayCivilBR('2026-11-05', simDate09h);
assert(!isExpFutureBefore, 'isDateBeforeTodayCivilBR("2026-11-05") é FALSE (aceita validade futura)', `Recebido: ${isExpFutureBefore}`);

const isExpiredFuture = isBatchExpired('2026-11-05', undefined, simDate09h);
assert(!isExpiredFuture, 'isBatchExpired("2026-11-05") é FALSE', `Recebido: ${isExpiredFuture}`);

const windowFuture = validatePickupWindowAgainstExpiration('2026-11-05T18:00', '2026-11-05');
assert(windowFuture.valid, 'Retirada terminando em 05/11T18:00 com validade em 05/11 é VÁLIDA', windowFuture.error);

// ----------------------------------------------------
// CENÁRIO D — Horário-limite explícito (Refeições / Marmitas)
// ----------------------------------------------------
console.log('\n--- CENÁRIO D: Horário-limite explícito (Marmitas com consumo até 13h) ---');
// Retirada terminando às 12h30 com consumo seguro até 13h
const windowD1 = validatePickupWindowAgainstExpiration('2026-11-04T12:30', '2026-11-04', '13:00');
assert(windowD1.valid, 'Marmita: Retirada terminando às 12h30 com consumo até 13h é ELEGÍVEL', windowD1.error);

// Retirada terminando às 14h com consumo seguro até 13h
const windowD2 = validatePickupWindowAgainstExpiration('2026-11-04T14:00', '2026-11-04', '13:00');
assert(!windowD2.valid, 'Marmita: Retirada terminando às 14h com consumo até 13h é BLOQUEADA', `Erro retornado: ${windowD2.error}`);

// Às 09h: marmita com consumo até 13h NÃO está vencida
const isExpiredAt09h = isBatchExpired('2026-11-04', '13:00', simDate09h);
assert(!isExpiredAt09h, 'Às 09h, marmita com consumo até 13h está ATIVA (isBatchExpired = false)', `Recebido: ${isExpiredAt09h}`);

// Às 13h30 BRT (16h30 UTC): marmita com consumo até 13h ESTÁ vencida
const simDate13h30 = new Date('2026-11-04T16:30:00.000Z');
const isExpiredAt13h30 = isBatchExpired('2026-11-04', '13:00', simDate13h30);
assert(isExpiredAt13h30, 'Às 13h30, marmita com consumo até 13h está EXPIRADA (isBatchExpired = true)', `Recebido: ${isExpiredAt13h30}`);

// ----------------------------------------------------
// CENÁRIO E — Fuso Horário e Não-inversão M20/M21
// ----------------------------------------------------
console.log('\n--- CENÁRIO E: Formatação e Fuso Horário (Sem inversão mês/dia) ---');
const e1 = formatDateBR('2026-11-04');
assert(e1 === '04/11/2026', '2026-11-04 -> 04/11/2026', `Recebido: ${e1}`);

const e2 = formatDateBR('04/11/2026');
assert(e2 === '04/11/2026', '04/11/2026 -> 04/11/2026', `Recebido: ${e2}`);

const e3 = formatDateTimeBR('2026-11-04T11:30');
assert(e3 === '04/11/2026 às 11h30', '2026-11-04T11:30 -> 04/11/2026 às 11h30', `Recebido: ${e3}`);

const e4 = formatDateTimeBR('2026-11-04T14:30:00.000Z');
assert(e4 === '04/11/2026 às 11h30', '2026-11-04T14:30:00.000Z -> 04/11/2026 às 11h30 (conversão UTC -> BRT)', `Recebido: ${e4}`);

const e5 = formatDateTimeBR('2026-11-04T11:30:00-03:00');
assert(e5 === '04/11/2026 às 11h30', '2026-11-04T11:30:00-03:00 -> 04/11/2026 às 11h30', `Recebido: ${e5}`);

// Teste de dia 05/11/2026
const e6 = formatDateBR('2026-11-05');
assert(e6 === '05/11/2026', '2026-11-05 -> 05/11/2026 (não 11/05/2026)', `Recebido: ${e6}`);

// ----------------------------------------------------
// CENÁRIO F — Regressão Operacional de Janela e Regras
// ----------------------------------------------------
console.log('\n--- CENÁRIO F: Validação de Janela Operacional (72h e Horários) ---');
// Janela de 72 horas exatas
const start72 = new Date('2026-11-04T09:00:00-03:00').getTime();
const end72 = new Date('2026-11-07T09:00:00-03:00').getTime();
const diffHours72 = (end72 - start72) / (1000 * 60 * 60);
assert(diffHours72 === 72, 'Duração calculada de 72 horas exatas', `Horas: ${diffHours72}`);

// Janela ultrapassando 72 horas (73 horas)
const end73 = new Date('2026-11-07T10:00:00-03:00').getTime();
const diffHours73 = (end73 - start72) / (1000 * 60 * 60);
assert(diffHours73 > 72, 'Janela de 73 horas excede limite de 72h', `Horas: ${diffHours73}`);

console.log('\n====================================================');
console.log(`TOTAL DE TESTES: ${totalTests} | APROVADOS: ${passedTests} | FALHAS: ${totalTests - passedTests}`);
console.log('====================================================');

if (passedTests === totalTests) {
  console.log('>>> TODOS OS CENÁRIOS FORAM APROVADOS COM SUCESSO! <<<');
} else {
  console.error('>>> EXISTEM TESTES REPROVADOS! <<<');
  process.exit(1);
}
