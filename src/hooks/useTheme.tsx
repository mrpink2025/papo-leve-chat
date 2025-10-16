import { useEffect } from 'react';
import { useUserPreferences } from './useUserPreferences';

export const useTheme = () => {
  const { preferences } = useUserPreferences();

  useEffect(() => {
    if (preferences?.theme) {
      document.body.setAttribute('data-theme', preferences.theme);
    }
  }, [preferences?.theme]);

  return { theme: preferences?.theme || 'default' };
};
