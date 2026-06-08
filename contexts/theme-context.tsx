import React from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AppTheme = {
  mode: 'light' | 'dark';
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    elevated: string;
    text: string;
    textMuted: string;
    primary: string;
    primarySoft: string;
    secondary: string;
    border: string;
    danger: string;
    success: string;
    shadow: string;
    tabBar: string;
  };
};

type ThemeContextValue = {
  theme: AppTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    background: '#edf2f7',
    surface: '#ffffff',
    surfaceMuted: '#f8fafc',
    elevated: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    primary: '#1f5d86',
    primarySoft: '#e0f2fe',
    secondary: '#0f766e',
    border: '#dbe3ee',
    danger: '#ef4444',
    success: '#047857',
    shadow: '#0f172a',
    tabBar: '#ffffff',
  },
};

const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    background: '#09111f',
    surface: '#111c2e',
    surfaceMuted: '#17243a',
    elevated: '#142237',
    text: '#f8fafc',
    textMuted: '#9fb0c7',
    primary: '#5bb7f0',
    primarySoft: '#173451',
    secondary: '#2dd4bf',
    border: '#26364d',
    danger: '#fb7185',
    success: '#34d399',
    shadow: '#000000',
    tabBar: '#0d1727',
  },
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function resolveTheme(mode: ThemeMode, systemScheme: ColorSchemeName) {
  // "System" follows the phone setting, otherwise we use the chosen mode.
  const resolvedMode = mode === 'system' ? systemScheme : mode;
  return resolvedMode === 'dark' ? darkTheme : lightTheme;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = React.useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = React.useState<ColorSchemeName>(Appearance.getColorScheme());

  React.useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  const value = React.useMemo(
    () => ({
      theme: resolveTheme(themeMode, systemScheme),
      themeMode,
      setThemeMode,
    }),
    [systemScheme, themeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = React.useContext(ThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }

  return value;
}
