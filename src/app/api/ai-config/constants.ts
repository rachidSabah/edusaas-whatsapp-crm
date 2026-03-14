// Default AI Configuration Constants
// These provide sensible defaults for the AI assistant behavior

export interface AIConfig {
  systemInstructions: string;
  responseTone: 'formal' | 'friendly' | 'professional';
  language: 'fr' | 'en' | 'ar' | 'auto';
  knowledgeBaseEnabled: boolean;
  autoReplyEnabled: boolean;
  autoReplyCategories: string[];
  maxResponseLength: number;
  includeSignature: boolean;
  signatureText: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  systemInstructions: `Vous êtes un assistant IA pour une institution éducative. Votre rôle est d'aider à répondre aux questions des étudiants, parents et prospects de manière professionnelle et utile.

Directives:
- Soyez toujours poli, concis et serviable
- Répondez dans la même langue que le message de l'utilisateur
- Si vous ne connaissez pas la réponse, orientez vers l'administration
- Ne partagez jamais d'informations sensibles ou confidentielles
- Pour les questions sur les frais, les horaires ou les programmes, utilisez les informations de la base de connaissances`,

  responseTone: 'professional',
  language: 'auto',
  knowledgeBaseEnabled: true,
  autoReplyEnabled: true,
  autoReplyCategories: ['GENERAL', 'SCHEDULE', 'PRICING', 'ENROLLMENT'],
  maxResponseLength: 500,
  includeSignature: true,
  signatureText: 'Cordialement,\nL\'équipe administrative',
};

export const TONE_DESCRIPTIONS = {
  formal: 'Ton formel - Langage soutenu et professionnel, adapté aux communications officielles',
  friendly: 'Ton amical - Langage décontracté mais respectueux, créant une atmosphère accueillante',
  professional: 'Ton professionnel - Équilibre entre formalité et accessibilité, adapté à la plupart des situations',
};

export const LANGUAGE_DESCRIPTIONS = {
  auto: 'Détection automatique - Répond dans la langue du message reçu',
  fr: 'Français - Répond toujours en français',
  en: 'Anglais - Répond toujours en anglais',
  ar: 'Arabe - Répond toujours en arabe',
};

export const SYSTEM_INSTRUCTION_TEMPLATES = {
  default: `Vous êtes un assistant IA pour une institution éducative. Votre rôle est d'aider à répondre aux questions des étudiants, parents et prospects de manière professionnelle et utile.

Directives:
- Soyez toujours poli, concis et serviable
- Répondez dans la même langue que le message de l'utilisateur
- Si vous ne connaissez pas la réponse, orientez vers l'administration
- Ne partagez jamais d'informations sensibles ou confidentielles`,

  strictFormal: `Vous êtes un assistant IA officiel pour une institution éducative. Vous devez maintenir un ton formel et professionnel à tout moment.

Règles strictes:
- Utilisez toujours le vouvoiement
- Restez factuel et précis
- Ne faites jamais d'hypothèses non fondées
- Redirigez vers l'administration pour toute question complexe`,

  friendlyWelcoming: `Vous êtes un assistant IA chaleureux et accueillant pour une institution éducative. Votre objectif est de créer une expérience positive pour les étudiants, parents et prospects.

Approche:
- Soyez chaleureux et engageant
- Utilisez un langage accessible
- Montrez de l'empathie dans vos réponses
- Encouragez les questions et les interactions`,

  multilingual: `Vous êtes un assistant IA multilingue pour une institution éducative internationale.

Capacités:
- Répondez dans la langue du message reçu
- Gérez les communications en français, anglais et arabe
- Adaptez votre style culturellement
- Restez professionnel dans toutes les langues`,
};

export const AUTO_REPLY_CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'Questions générales', description: 'Questions diverses sur l\'établissement' },
  { value: 'SCHEDULE', label: 'Emploi du temps', description: 'Horaires, sessions et calendrier' },
  { value: 'PRICING', label: 'Tarification', description: 'Frais de scolarité et paiements' },
  { value: 'ENROLLMENT', label: 'Inscription', description: 'Procédures d\'inscription et documents' },
  { value: 'ATTENDANCE', label: 'Présences', description: 'Absences, retards et justifications' },
  { value: 'EXAMS', label: 'Examens', description: 'Dates, résultats et procédures d\'examen' },
];

export const KNOWLEDGE_BASE_SEARCH_PROMPT = `Utilisez les informations suivantes de la base de connaissances pour répondre à la question. Si l'information n'est pas disponible dans la base de connaissances, indiquez-le clairement.

Base de connaissances:
{knowledgeBase}

Question: {question}`;

export const ATTENDANCE_RESPONSE_TEMPLATE = `Bonjour,

Nous avons bien enregistré la présence de {studentName} pour le {date}.

Statut: {status}
{notes}

Cordialement,
L'administration`;
