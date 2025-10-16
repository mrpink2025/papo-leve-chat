import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeMode } from "@/hooks/useThemeMode";

export const ThemeToggle = () => {
  const { effectiveTheme, toggleTheme } = useThemeMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full transition-all"
      title={effectiveTheme === "light" ? "Mudar para tema escuro" : "Mudar para tema claro"}
    >
      {effectiveTheme === "light" ? (
        <Moon className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Sun className="h-5 w-5 text-muted-foreground" />
      )}
    </Button>
  );
};
