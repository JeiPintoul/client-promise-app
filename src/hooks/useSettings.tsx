
import { createContext, useContext, useEffect, useState } from 'react';

interface ParcelamentoConfig {
  ativo: boolean;
  numeroPadrao: number;
  forcado: boolean; // apenas gerentes podem forçar
  bloqueado: boolean; // bloqueia alteração por usuários comuns
  podeAlterar: boolean; // se o usuário pode alterar o parcelamento
}

interface Settings {
  tema: 'light' | 'dark';
  parcelamento: ParcelamentoConfig;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  updateParcelamentoConfig: (config: Partial<ParcelamentoConfig>) => void;
}

const defaultSettings: Settings = {
  tema: 'light',
  parcelamento: {
    ativo: false,
    numeroPadrao: 2,
    forcado: false,
    bloqueado: false,
    podeAlterar: true
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    // Carregar configurações do localStorage
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Aplicar tema
    if (settings.tema === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.tema]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('app_settings', JSON.stringify(updatedSettings));
  };

  const updateParcelamentoConfig = (config: Partial<ParcelamentoConfig>) => {
    const updatedParcelamento = { ...settings.parcelamento, ...config };
    const updatedSettings = { ...settings, parcelamento: updatedParcelamento };
    setSettings(updatedSettings);
    localStorage.setItem('app_settings', JSON.stringify(updatedSettings));
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      updateParcelamentoConfig
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
