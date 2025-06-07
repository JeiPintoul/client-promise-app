
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

/**
 * Componente para alternar entre tema claro e escuro
 * Visível em todas as páginas incluindo login/registro
 */
export function ThemeToggle() {
  const { settings, updateSettings } = useSettings();

  const toggleTheme = () => {
    updateSettings({
      tema: settings.tema === 'light' ? 'dark' : 'light'
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50"
    >
      {settings.tema === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
