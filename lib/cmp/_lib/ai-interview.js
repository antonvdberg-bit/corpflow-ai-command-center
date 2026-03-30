import { inferComplexityFromDescription } from './preview-heuristics.js';

/** @typedef {'low' | 'medium' | 'high'} Band */

/**
 * Normalize BCP-47 / browser language to supported interview locale.
 *
 * @param {string} [raw]
 * @returns {'en' | 'es' | 'fr' | 'de' | 'pt'}
 */
export function normalizeInterviewLocale(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  if (!s) return 'en';
  if (s.startsWith('es')) return 'es';
  if (s.startsWith('fr')) return 'fr';
  if (s.startsWith('de')) return 'de';
  if (s.startsWith('pt')) return 'pt';
  return 'en';
}

/**
 * Three clarification prompts per complexity band, per locale.
 * @type {Record<'en' | 'es' | 'fr' | 'de' | 'pt', Record<Band, readonly [string, string, string]>>}
 */
const QUESTIONS_BY_LOCALE = {
  en: {
    low: [
      'What is the single most important outcome you need from this change when it ships?',
      'Are there any fixed launch dates or blackout windows we must respect?',
      'Who should approve the final behavior—only you, or another stakeholder too?',
    ],
    medium: [
      'Which pages, flows, or integrations are in scope vs explicitly out of scope?',
      'What environments must this work in on day one (e.g. staging only, production, mobile)?',
      'What does “done” look like for you—acceptance criteria or a short checklist we can follow?',
    ],
    high: [
      'Describe the full user journey and data touched (including third parties, CRM, payments, PHI/PII).',
      'What are the non-negotiable compliance, security, or legal constraints we must design around?',
      'What is your rollback / feature-flag plan if something fails in production?',
    ],
  },
  es: {
    low: [
      '¿Cuál es el resultado más importante que necesita de este cambio cuando salga a producción?',
      '¿Hay fechas de lanzamiento fijas o periodos en los que no podemos actuar?',
      '¿Quién debe aprobar el comportamiento final: solo usted u otro interesado?',
    ],
    medium: [
      '¿Qué páginas, flujos o integraciones están dentro del alcance y cuáles quedan explícitamente fuera?',
      '¿En qué entornos debe funcionar el primer día (solo staging, producción, móvil)?',
      '¿Qué significa “terminado” para usted: criterios de aceptación o una lista breve?',
    ],
    high: [
      'Describa el recorrido completo del usuario y los datos involucrados (terceros, CRM, pagos, datos sensibles).',
      '¿Qué requisitos de cumplimiento, seguridad o legales son innegociables?',
      '¿Cuál es su plan de reversión o feature flags si algo falla en producción?',
    ],
  },
  fr: {
    low: [
      "Quel est le résultat le plus important dont vous avez besoin lorsque ce changement est en production ?",
      'Y a-t-il des dates de lancement fixes ou des périodes où nous ne devons pas intervenir ?',
      'Qui doit valider le comportement final : vous seul ou un autre décideur ?',
    ],
    medium: [
      'Quelles pages, parcours ou intégrations sont dans le périmètre, et lesquelles sont explicitement exclues ?',
      'Dans quels environnements cela doit fonctionner dès le jour 1 (staging, production, mobile) ?',
      'À quoi ressemble « terminé » pour vous : critères d’acceptation ou courte checklist ?',
    ],
    high: [
      'Décrivez le parcours utilisateur complet et les données concernées (tiers, CRM, paiements, données sensibles).',
      'Quelles contraintes conformité, sécurité ou juridiques sont non négociables ?',
      'Quel est votre plan de retour arrière ou de feature flags en cas d’échec en production ?',
    ],
  },
  de: {
    low: [
      'Was ist das wichtigste Ergebnis, das Sie mit dieser Änderung beim Go-live erreichen wollen?',
      'Gibt es feste Launch-Termine oder Sperrzeiten, die wir einhalten müssen?',
      'Wer soll das finale Verhalten freigeben — nur Sie oder weitere Stakeholder?',
    ],
    medium: [
      'Welche Seiten, Flows oder Integrationen sind im Scope vs. ausdrücklich out of scope?',
      'In welchen Umgebungen muss es ab Tag 1 laufen (nur Staging, Produktion, Mobile)?',
      'Wann ist es für Sie „fertig“ — Abnahmekriterien oder eine kurze Checkliste?',
    ],
    high: [
      'Beschreiben Sie die komplette User Journey und berührte Daten (Dritte, CRM, Zahlungen, sensible Daten).',
      'Welche Compliance-, Sicherheits- oder rechtlichen Vorgaben sind nicht verhandelbar?',
      'Wie sieht Ihr Rollback- oder Feature-Flag-Plan bei einem Produktionsfehler aus?',
    ],
  },
  pt: {
    low: [
      'Qual é o resultado mais importante que você precisa desta mudança quando ela for ao ar?',
      'Há datas fixas de lançamento ou períodos em que não podemos atuar?',
      'Quem deve aprovar o comportamento final — só você ou outro responsável?',
    ],
    medium: [
      'Quais páginas, fluxos ou integrações estão no escopo vs. explicitamente fora?',
      'Em quais ambientes isso deve funcionar no primeiro dia (só staging, produção, mobile)?',
      'O que significa “pronto” para você — critérios de aceite ou uma lista curta?',
    ],
    high: [
      'Descreva a jornada completa do usuário e os dados envolvidos (terceiros, CRM, pagamentos, dados sensíveis).',
      'Quais requisitos de conformidade, segurança ou jurídicos são inegociáveis?',
      'Qual é seu plano de rollback ou feature flags se algo falhar em produção?',
    ],
  },
};

/**
 * Build three clarification questions from a free-text user request using inferred complexity.
 *
 * @param {string} userRequest
 * @param {string} [localeHint] - BCP-47 or language tag from client
 * @returns {{ complexity: Band, questions: [string, string, string], locale: string }}
 */
export function buildClarificationQuestions(userRequest, localeHint) {
  const complexity = /** @type {Band} */ (inferComplexityFromDescription(userRequest));
  const locale = normalizeInterviewLocale(localeHint);
  const pack = QUESTIONS_BY_LOCALE[locale] || QUESTIONS_BY_LOCALE.en;
  const triple = pack[complexity];
  return {
    complexity,
    questions: [triple[0], triple[1], triple[2]],
    locale,
  };
}
