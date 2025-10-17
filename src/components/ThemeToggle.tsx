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
      className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/30 transition-all hover:scale-105"
      title={effectiveTheme === "light" ? "Mudar para tema escuro" : "Mudar para tema claro"}
    >
      {effectiveTheme === "light" ? (
        <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      ) : (
        <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      )}
    </Button>
  );
};
