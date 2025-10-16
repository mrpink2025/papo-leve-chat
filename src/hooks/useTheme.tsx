import { useEffect } from 'react';
import { useUserPreferences } from './useUserPreferences';
import { useThemeMode } from './useThemeMode';

export const useTheme = () => {
  const { preferences } = useUserPreferences();
  const { effectiveTheme } = useThemeMode();

  useEffect(() => {
    const root = document.documentElement;
    
    // Aplicar tema light/dark primeiro (se não for default)
    if (effectiveTheme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (preferences?.theme && preferences.theme !== 'default') {
      // Aplicar tema de cor (blue, green, purple, dark) apenas no modo escuro
      root.setAttribute('data-theme', preferences.theme);
    } else if (effectiveTheme === 'dark') {
      // Remover atributo para usar tema escuro padrão
      if (preferences?.theme === 'default' || !preferences?.theme) {
        root.removeAttribute('data-theme');
      }
    }
  }, [preferences?.theme, effectiveTheme]);

  return { 
    theme: preferences?.theme || 'default',
    effectiveTheme 
  };
};
