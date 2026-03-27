'use client';

/**
 * Language Selector Component
 * Multi-language switcher with RTL support
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { i18n, type Language } from '@/lib/i18n';

const languageFlags: Record<Language, string> = {
  en: '🇺🇸',
  ar: '🇸🇦',
  fr: '🇫🇷',
  es: '🇪🇸',
  ru: '🇷🇺',
  zh: '🇨🇳',
};

const languageNames: Record<Language, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  ar: { name: 'Arabic', nativeName: 'العربية' },
  fr: { name: 'French', nativeName: 'Français' },
  es: { name: 'Spanish', nativeName: 'Español' },
  ru: { name: 'Russian', nativeName: 'Русский' },
  zh: { name: 'Chinese', nativeName: '中文' },
};

interface LanguageSelectorProps {
  compact?: boolean;
  onChange?: (lang: Language) => void;
}

export function LanguageSelector({ compact = false, onChange }: LanguageSelectorProps) {
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    i18n.initialize();
    return i18n.getLanguage();
  });

  const handleLanguageChange = (lang: Language) => {
    i18n.setLanguage(lang);
    setCurrentLang(lang);
    onChange?.(lang);
  };

  // Update document direction when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = i18n.getDirection();
      document.documentElement.lang = currentLang;
    }
  }, [currentLang]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? 'icon' : 'default'} className="gap-2">
          <Globe className="h-4 w-4" />
          {!compact && (
            <span className="flex items-center gap-2">
              <span>{languageFlags[currentLang]}</span>
              <span className="hidden md:inline">{languageNames[currentLang].name}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(languageNames).map(([code, names]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code as Language)}
            className={cn(
              'flex items-center justify-between cursor-pointer',
              currentLang === code && 'bg-muted'
            )}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">{languageFlags[code as Language]}</span>
              <div className="flex flex-col">
                <span className="font-medium">{names.name}</span>
                <span className="text-xs text-muted-foreground">{names.nativeName}</span>
              </div>
            </span>
            {currentLang === code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
