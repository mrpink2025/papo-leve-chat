/**
 * Utilitários para detecção de menções em mensagens
 */

/**
 * Detectar se uma mensagem contém menção ao usuário
 */
export const hasMention = (
  content: string,
  username: string
): boolean => {
  if (!content || !username) return false;
  
  const lowerContent = content.toLowerCase();
  const lowerUsername = username.toLowerCase();
  
  // Verificar @username
  const userMention = `@${lowerUsername}`;
  if (lowerContent.includes(userMention)) return true;
  
  // Verificar @todos ou @all
  if (lowerContent.includes('@todos') || lowerContent.includes('@all')) {
    return true;
  }
  
  return false;
};

/**
 * Extrair todas as menções de uma mensagem
 */
export const extractMentions = (content: string): string[] => {
  if (!content) return [];
  
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].toLowerCase());
  }
  
  return mentions;
};

/**
 * Verificar se é menção geral (@todos, @all)
 */
export const isGeneralMention = (content: string): boolean => {
  if (!content) return false;
  
  const lowerContent = content.toLowerCase();
  return lowerContent.includes('@todos') || lowerContent.includes('@all');
};

/**
 * Destacar menções no texto (para UI)
 */
export const highlightMentions = (content: string): string => {
  if (!content) return content;
  
  return content.replace(
    /@(\w+)/g,
    '<span class="mention-highlight">@$1</span>'
  );
};

/**
 * Validar username para menção
 */
export const isValidMention = (username: string): boolean => {
  if (!username) return false;
  
  // Username deve ter 3-30 caracteres, apenas letras, números e underscore
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};
