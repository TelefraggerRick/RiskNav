
"use client";

import type { Language } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface LanguageContextType {
  currentLanguage: Language;
  toggleLanguage: () => void;
  getTranslation: (translations: Record<Language, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

  const toggleLanguage = useCallback(() => {
    setCurrentLanguage(prevLang => (prevLang === 'en' ? 'fr' : 'en'));
  }, []);

  const getTranslation = useCallback((translations: Record<Language, string>): string => {
    return translations[currentLanguage] || translations['en'] || '';
  }, [currentLanguage]);

  return (
    <LanguageContext.Provider value={{ currentLanguage, toggleLanguage, getTranslation }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
