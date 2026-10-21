import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { publicGet } from '../lib/api';

export interface OrgSettings {
  name: string;
  tagline: string;
  logo_url: string | null;
  theme: string;
}

const THEMES: Record<string, { brand: string; brandDark: string; brandLight: string }> = {
  blue:    { brand: '#2563eb', brandDark: '#1e3a8a', brandLight: '#e0e7ff' },
  indigo:  { brand: '#4f46e5', brandDark: '#3730a3', brandLight: '#e0e7ff' },
  violet:  { brand: '#7c3aed', brandDark: '#5b21b6', brandLight: '#ede9fe' },
  emerald: { brand: '#059669', brandDark: '#065f46', brandLight: '#d1fae5' },
  rose:    { brand: '#e11d48', brandDark: '#9f1239', brandLight: '#ffe4e6' },
};

function applyTheme(theme: string) {
  const colors = THEMES[theme] ?? THEMES.blue;
  const root = document.documentElement;
  root.style.setProperty('--color-brand', colors.brand);
  root.style.setProperty('--color-brand-dark', colors.brandDark);
  root.style.setProperty('--color-brand-light', colors.brandLight);
}

const DEFAULT: OrgSettings = {
  name: 'LMSSI',
  tagline: 'Корпоративная платформа обучения',
  logo_url: null,
  theme: 'blue',
};

interface OrgContextValue {
  org: OrgSettings;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue>({
  org: DEFAULT,
  refresh: async () => {},
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<OrgSettings>(DEFAULT);

  const load = async () => {
    try {
      const data = await publicGet<OrgSettings>('/api/settings/organization');
      setOrg(data);
      applyTheme(data.theme);
    } catch {
      applyTheme(DEFAULT.theme);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- разовая загрузка настроек организации при монтировании
  useEffect(() => { load(); }, []);

  return (
    <OrgContext.Provider value={{ org, refresh: load }}>
      {children}
    </OrgContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook и темы соседствуют с провайдером по соглашению
export const useOrg = () => useContext(OrgContext);
export { THEMES };
