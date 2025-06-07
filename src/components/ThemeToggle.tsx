
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

interface ThemeToggleProps {
  showOnlyInLogin?: boolean;
  className?: string;
}

/**
 * Componente para alternar entre tema claro e escuro
 * Por padrão, visível apenas na tela de login
 */
export function ThemeToggle({ showOnlyInLogin = true, className }: ThemeToggleProps) {
  const { settings, updateSettings } = useSettings();

  const toggleTheme = () => {
    updateSettings({
      tema: settings.tema === 'light' ? 'dark' : 'light'
    });
  };

  const baseClasses = showOnlyInLogin 
    ? "fixed top-4 right-4 z-50" 
    : className || "";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={baseClasses}
    >
      {settings.tema === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
