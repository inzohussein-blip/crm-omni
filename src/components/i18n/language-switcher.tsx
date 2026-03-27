/**
 * OMNI-CRM Language Switcher Component
 * 
 * Features:
 * - Language selection dropdown
 * - RTL language indicators
 * - Compact and full display modes
 * - Default language badge
 * - Active language highlighting
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Languages,
  Globe,
  Check,
  ChevronDown,
  ArrowRightLeft,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  isDefault: boolean;
  isActive: boolean;
}

export interface LanguageSwitcherProps {
  /** Currently selected language code */
  currentLanguage?: string;
  /** Callback when language changes */
  onLanguageChange?: (code: string) => void;
  /** Available languages */
  languages?: Language[];
  /** Display variant */
  variant?: 'default' | 'compact' | 'icon';
  /** Show RTL indicator */
  showRtlIndicator?: boolean;
  /** Show default badge */
  showDefaultBadge?: boolean;
  /** Button size */
  size?: 'default' | 'sm' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

// ============================================
// LANGUAGE FLAGS (Emoji flags for languages)
// ============================================

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  ar: '🇸🇦',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  ru: '🇷🇺',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  tr: '🇹🇷',
  hi: '🇮🇳',
  id: '🇮🇩',
  ms: '🇲🇾',
  th: '🇹🇭',
  vi: '🇻🇳',
  nl: '🇳🇱',
  pl: '🇵🇱',
  sv: '🇸🇪',
};

// ============================================
// DEFAULT LANGUAGES
// ============================================

const DEFAULT_LANGUAGES: Language[] = [
  {
    id: '1',
    code: 'en',
    name: 'English',
    nativeName: 'English',
    isRtl: false,
    isDefault: true,
    isActive: true,
  },
  {
    id: '2',
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    isRtl: true,
    isDefault: false,
    isActive: true,
  },
];

// ============================================
// LANGUAGE SWITCHER COMPONENT
// ============================================

export function LanguageSwitcher({
  currentLanguage = 'en',
  onLanguageChange,
  languages = DEFAULT_LANGUAGES,
  variant = 'default',
  showRtlIndicator = true,
  showDefaultBadge = true,
  size = 'default',
  className,
  disabled = false,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  // Update selected language when prop changes
  useEffect(() => {
    setSelectedLanguage(currentLanguage);
  }, [currentLanguage]);

  // Get the currently selected language object
  const selected = languages.find((l) => l.code === selectedLanguage) || languages[0];

  // Handle language selection
  const handleSelect = (code: string) => {
    setSelectedLanguage(code);
    onLanguageChange?.(code);
    setIsOpen(false);
  };

  // Get flag for language
  const getFlag = (code: string) => LANGUAGE_FLAGS[code] || '🌐';

  // Render button content based on variant
  const renderButtonContent = () => {
    switch (variant) {
      case 'icon':
        return (
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9', className)}
            disabled={disabled}
          >
            <Globe className="h-4 w-4" />
          </Button>
        );

      case 'compact':
        return (
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-1.5 h-8 px-2', className)}
            disabled={disabled}
          >
            <span className="text-base">{getFlag(selected?.code || 'en')}</span>
            <span className="text-xs font-medium uppercase">{selected?.code}</span>
            {selected?.isRtl && showRtlIndicator && (
              <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        );

      default:
        return (
          <Button
            variant="outline"
            size={size}
            className={cn('gap-2', className)}
            disabled={disabled}
          >
            <Languages className="h-4 w-4" />
            <span className="text-base">{getFlag(selected?.code || 'en')}</span>
            <span className="font-medium">{selected?.nativeName || selected?.name}</span>
            {selected?.isRtl && showRtlIndicator && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                RTL
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        );
    }
  };

  // Active languages only
  const activeLanguages = languages.filter((l) => l.isActive);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>{renderButtonContent()}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
        sideOffset={5}
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          Select Language
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-80">
          {activeLanguages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleSelect(language.code)}
              className={cn(
                'flex items-center gap-3 py-2.5 cursor-pointer',
                language.code === selectedLanguage && 'bg-accent'
              )}
            >
              {/* Flag */}
              <span className="text-xl flex-shrink-0">{getFlag(language.code)}</span>

              {/* Language info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{language.nativeName}</span>
                  {language.isDefault && showDefaultBadge && (
                    <Badge variant="default" className="text-xs px-1.5 py-0">
                      Default
                    </Badge>
                  )}
                  {language.isRtl && showRtlIndicator && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      RTL
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{language.name}</span>
              </div>

              {/* Check indicator */}
              {language.code === selectedLanguage && (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </ScrollArea>

        {/* Language count footer */}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {activeLanguages.length} language{activeLanguages.length !== 1 ? 's' : ''} available
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================
// LANGUAGE BADGE COMPONENT
// ============================================

export function LanguageBadge({
  code,
  isRtl,
  compact = false,
}: {
  code: string;
  isRtl?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-base">{getFlag(code)}</span>
      {!compact && (
        <>
          <span className="text-sm font-medium uppercase">{code}</span>
          {isRtl && (
            <Badge variant="secondary" className="text-xs px-1">
              RTL
            </Badge>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// LANGUAGE SELECTOR (Radio Group Style)
// ============================================

export function LanguageSelector({
  languages = DEFAULT_LANGUAGES,
  currentLanguage = 'en',
  onLanguageChange,
}: {
  languages?: Language[];
  currentLanguage?: string;
  onLanguageChange?: (code: string) => void;
}) {
  const [selected, setSelected] = useState(currentLanguage);

  useEffect(() => {
    setSelected(currentLanguage);
  }, [currentLanguage]);

  const handleSelect = (code: string) => {
    setSelected(code);
    onLanguageChange?.(code);
  };

  const activeLanguages = languages.filter((l) => l.isActive);

  return (
    <div className="grid gap-2">
      {activeLanguages.map((language) => (
        <button
          key={language.code}
          onClick={() => handleSelect(language.code)}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            language.code === selected
              ? 'border-primary bg-primary/5'
              : 'border-border'
          )}
        >
          <span className="text-2xl">{getFlag(language.code)}</span>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium">{language.nativeName}</span>
              {language.isDefault && (
                <Badge variant="default" className="text-xs">
                  Default
                </Badge>
              )}
              {language.isRtl && (
                <Badge variant="outline" className="text-xs">
                  RTL
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{language.name}</span>
          </div>
          {language.code === selected && (
            <Check className="h-5 w-5 text-primary" />
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getFlag(code: string): string {
  return LANGUAGE_FLAGS[code] || '🌐';
}

// ============================================
// EXPORTS
// ============================================

export default LanguageSwitcher;
