import type { DonationMessageAuthor } from '@prisma/client';

/**
 * Mensagens disponíveis para envio em torno de uma doação.
 *
 * Fonte ÚNICA da verdade: o app busca esta lista em `GET /donations/message-templates`
 * em vez de manter uma cópia. Duplicar o texto no front faria as duas versões
 * divergirem em silêncio na primeira correção de redação.
 *
 * Nesta versão não existe texto livre. A escolha é deliberada: mensagem aberta
 * de estranhos para famílias em situação de vulnerabilidade exigiria moderação,
 * que o projeto não tem. Guardar só chaves previstas torna conteúdo indevido
 * impossível por construção, não por filtro.
 *
 * As chaves são estáveis e nunca devem ser reaproveitadas para outro texto —
 * mensagens já enviadas guardam a chave junto com o corpo renderizado.
 */
export interface MessageTemplate {
  key: string;
  body: string;
}

const DONOR_TEMPLATES: MessageTemplate[] = [
  { key: 'donor_lighter_day', body: 'Que essa refeição traga um dia mais leve para vocês.' },
  { key: 'donor_not_alone', body: 'Vocês não estão sozinhos. Torcendo por dias melhores.' },
  { key: 'donor_family_to_family', body: 'De uma família para outra, com carinho e respeito.' },
];

const BENEFICIARY_TEMPLATES: MessageTemplate[] = [
  { key: 'beneficiary_right_time', body: 'Obrigado! Sua ajuda chegou na hora certa.' },
  { key: 'beneficiary_blessing', body: 'Que Deus abençoe você e sua família.' },
  { key: 'beneficiary_made_difference', body: 'Gratidão. Isso fez diferença para a gente.' },
];

export function templatesFor(author: DonationMessageAuthor): MessageTemplate[] {
  return author === 'donor' ? DONOR_TEMPLATES : BENEFICIARY_TEMPLATES;
}

/**
 * Resolve a chave no texto correspondente ao papel de quem envia.
 * Retorna `null` para chave desconhecida ou de outro papel — é o que impede
 * um doador de enviar uma mensagem de beneficiário (ou texto arbitrário).
 */
export function resolveTemplate(
  author: DonationMessageAuthor,
  key: string,
): MessageTemplate | null {
  return templatesFor(author).find((t) => t.key === key) ?? null;
}

export const allTemplates = () => ({
  donor: DONOR_TEMPLATES,
  beneficiary: BENEFICIARY_TEMPLATES,
});
