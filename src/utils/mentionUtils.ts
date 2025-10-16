// Signed by Mr_Pink — Nosso Papo (nossopapo.net)

/**
 * Processa menções em uma mensagem (@username ou @todos)
 * Retorna array com partes da mensagem e indicador se é menção
 */
export const parseMentions = (text: string): Array<{ text: string; isMention: boolean; username?: string }> => {
  const mentionRegex = /@(\w+|todos)/g;
  const parts: Array<{ text: string; isMention: boolean; username?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Adicionar texto antes da menção
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        isMention: false,
      });
    }

    // Adicionar a menção
    parts.push({
      text: match[0],
      isMention: true,
      username: match[1],
    });

    lastIndex = match.index + match[0].length;
  }

  // Adicionar texto restante
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isMention: false,
    });
  }

  // Se não houver menções, retornar o texto completo
  if (parts.length === 0) {
    parts.push({ text, isMention: false });
  }

  return parts;
};

/**
 * Gera uma cor consistente baseada no user_id
 * Retorna uma das cores do tema para o nome do autor
 */
export const getUserColor = (userId: string): string => {
  const colors = [
    'text-blue-500',
    'text-green-500',
    'text-purple-500',
    'text-pink-500',
    'text-orange-500',
    'text-teal-500',
    'text-indigo-500',
    'text-rose-500',
  ];

  // Gerar hash simples do userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};
