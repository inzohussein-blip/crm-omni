/**
 * Internationalization (i18n) Service
 * Multi-language support with Arabic and English
 */

// ============================================
// Types
// ============================================

export type Language = 'en' | 'ar' | 'fr' | 'es' | 'ru' | 'zh';

export interface LocaleConfig {
  code: Language;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
  currency: {
    symbol: string;
    position: 'before' | 'after';
    decimal: number;
  };
  numberFormat: {
    decimal: string;
    thousand: string;
  };
}

export interface TranslationStrings {
  [key: string]: string | TranslationStrings;
}

// ============================================
// Locale Configurations
// ============================================

export const LOCALES: Record<Language, LocaleConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'HH:mm:ss',
    currency: {
      symbol: '$',
      position: 'before',
      decimal: 2,
    },
    numberFormat: {
      decimal: '.',
      thousand: ',',
    },
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm:ss',
    currency: {
      symbol: 'د.إ',
      position: 'after',
      decimal: 2,
    },
    numberFormat: {
      decimal: '٫',
      thousand: '٬',
    },
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm:ss',
    currency: {
      symbol: '€',
      position: 'after',
      decimal: 2,
    },
    numberFormat: {
      decimal: ',',
      thousand: ' ',
    },
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm:ss',
    currency: {
      symbol: '€',
      position: 'after',
      decimal: 2,
    },
    numberFormat: {
      decimal: ',',
      thousand: '.',
    },
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm:ss',
    currency: {
      symbol: '₽',
      position: 'after',
      decimal: 2,
    },
    numberFormat: {
      decimal: ',',
      thousand: ' ',
    },
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    currency: {
      symbol: '¥',
      position: 'before',
      decimal: 2,
    },
    numberFormat: {
      decimal: '.',
      thousand: ',',
    },
  },
};

// ============================================
// Translation Strings
// ============================================

const translations: Record<Language, TranslationStrings> = {
  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      tasks: 'Tasks',
      clients: 'Clients',
      transactions: 'Transactions',
      trading: 'Trading',
      ib: 'IB Partners',
      kyc: 'KYC',
      reports: 'Reports',
      settings: 'Settings',
      notifications: 'Notifications',
      support: 'Support',
      compliance: 'Compliance',
      marketing: 'Marketing',
      loyalty: 'Loyalty',
      calendar: 'Calendar',
    },
    // Common
    common: {
      search: 'Search...',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      update: 'Update',
      view: 'View',
      actions: 'Actions',
      status: 'Status',
      priority: 'Priority',
      date: 'Date',
      amount: 'Amount',
      currency: 'Currency',
      total: 'Total',
      balance: 'Balance',
      profit: 'Profit',
      loss: 'Loss',
      volume: 'Volume',
      commission: 'Commission',
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      transfer: 'Transfer',
      approved: 'Approved',
      pending: 'Pending',
      rejected: 'Rejected',
      completed: 'Completed',
      failed: 'Failed',
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended',
      banned: 'Banned',
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome back',
      overview: 'Overview',
      statistics: 'Statistics',
      recentActivity: 'Recent Activity',
      quickActions: 'Quick Actions',
      tasksOverview: 'Tasks Overview',
      financialOverview: 'Financial Overview',
      tradingOverview: 'Trading Overview',
      ibOverview: 'IB Overview',
    },
    // Tasks
    tasks: {
      title: 'Smart Tasks',
      newTask: 'New Task',
      assignTask: 'Assign Task',
      myTasks: 'My Tasks',
      allTasks: 'All Tasks',
      overdue: 'Overdue',
      slaBreached: 'SLA Breached',
      slaWarning: 'SLA Warning',
      dueToday: 'Due Today',
      categories: {
        kyc: 'KYC Verification',
        deposit: 'Deposit',
        withdrawal: 'Withdrawal',
        account: 'Account Opening',
        support: 'Support',
        complaint: 'Complaint',
        compliance: 'Compliance',
        other: 'Other',
      },
    },
    // Transactions
    transactions: {
      title: 'Transactions',
      newDeposit: 'New Deposit',
      newWithdrawal: 'New Withdrawal',
      pendingApprovals: 'Pending Approvals',
      transactionHistory: 'Transaction History',
      paymentMethod: 'Payment Method',
      reference: 'Reference',
      fee: 'Fee',
      netAmount: 'Net Amount',
    },
    // Clients
    clients: {
      title: 'Clients',
      newClient: 'New Client',
      clientList: 'Client List',
      clientDetails: 'Client Details',
      tradingAccounts: 'Trading Accounts',
      walletBalance: 'Wallet Balance',
      kycStatus: 'KYC Status',
      riskLevel: 'Risk Level',
    },
    // IB
    ib: {
      title: 'IB Partners',
      partners: 'Partners',
      commissions: 'Commissions',
      referrals: 'Referrals',
      commissionRate: 'Commission Rate',
      totalClients: 'Total Clients',
      activeClients: 'Active Clients',
      totalVolume: 'Total Volume',
    },
    // Notifications
    notifications: {
      title: 'Notifications',
      markAllRead: 'Mark All Read',
      notificationSettings: 'Notification Settings',
      emailNotifications: 'Email Notifications',
      smsNotifications: 'SMS Notifications',
      pushNotifications: 'Push Notifications',
      quietHours: 'Quiet Hours',
    },
    // Settings
    settings: {
      title: 'Settings',
      general: 'General',
      security: 'Security',
      preferences: 'Preferences',
      language: 'Language',
      timezone: 'Timezone',
      theme: 'Theme',
      twoFactor: 'Two-Factor Authentication',
      changePassword: 'Change Password',
    },
  },
  ar: {
    // التنقل
    nav: {
      dashboard: 'لوحة التحكم',
      tasks: 'المهام',
      clients: 'العملاء',
      transactions: 'المعاملات',
      trading: 'التداول',
      ib: 'شركاء IB',
      kyc: 'التحقق',
      reports: 'التقارير',
      settings: 'الإعدادات',
      notifications: 'الإشعارات',
      support: 'الدعم',
      compliance: 'الامتثال',
      marketing: 'التسويق',
      loyalty: 'الولاء',
      calendar: 'التقويم',
    },
    // عام
    common: {
      search: 'بحث...',
      filter: 'تصفية',
      export: 'تصدير',
      import: 'استيراد',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      create: 'إنشاء',
      update: 'تحديث',
      view: 'عرض',
      actions: 'إجراءات',
      status: 'الحالة',
      priority: 'الأولوية',
      date: 'التاريخ',
      amount: 'المبلغ',
      currency: 'العملة',
      total: 'الإجمالي',
      balance: 'الرصيد',
      profit: 'الربح',
      loss: 'الخسارة',
      volume: 'الحجم',
      commission: 'العمولة',
      deposit: 'إيداع',
      withdrawal: 'سحب',
      transfer: 'تحويل',
      approved: 'موافق عليه',
      pending: 'قيد الانتظار',
      rejected: 'مرفوض',
      completed: 'مكتمل',
      failed: 'فشل',
      active: 'نشط',
      inactive: 'غير نشط',
      suspended: 'معلق',
      banned: 'محظور',
    },
    // لوحة التحكم
    dashboard: {
      title: 'لوحة التحكم',
      welcome: 'مرحباً بعودتك',
      overview: 'نظرة عامة',
      statistics: 'الإحصائيات',
      recentActivity: 'النشاط الأخير',
      quickActions: 'إجراءات سريعة',
      tasksOverview: 'نظرة على المهام',
      financialOverview: 'نظرة مالية',
      tradingOverview: 'نظرة على التداول',
      ibOverview: 'نظرة على الشركاء',
    },
    // المهام
    tasks: {
      title: 'المهام الذكية',
      newTask: 'مهمة جديدة',
      assignTask: 'تعيين مهمة',
      myTasks: 'مهامي',
      allTasks: 'جميع المهام',
      overdue: 'متأخرة',
      slaBreached: 'تجاوز SLA',
      slaWarning: 'تحذير SLA',
      dueToday: 'مستحقة اليوم',
      categories: {
        kyc: 'التحقق من الهوية',
        deposit: 'إيداع',
        withdrawal: 'سحب',
        account: 'فتح حساب',
        support: 'دعم',
        complaint: 'شكوى',
        compliance: 'امتثال',
        other: 'أخرى',
      },
    },
    // المعاملات
    transactions: {
      title: 'المعاملات',
      newDeposit: 'إيداع جديد',
      newWithdrawal: 'سحب جديد',
      pendingApprovals: 'موافقات معلقة',
      transactionHistory: 'سجل المعاملات',
      paymentMethod: 'طريقة الدفع',
      reference: 'المرجع',
      fee: 'الرسوم',
      netAmount: 'المبلغ الصافي',
    },
    // العملاء
    clients: {
      title: 'العملاء',
      newClient: 'عميل جديد',
      clientList: 'قائمة العملاء',
      clientDetails: 'تفاصيل العميل',
      tradingAccounts: 'حسابات التداول',
      walletBalance: 'رصيد المحفظة',
      kycStatus: 'حالة التحقق',
      riskLevel: 'مستوى المخاطرة',
    },
    // الشركاء
    ib: {
      title: 'شركاء IB',
      partners: 'الشركاء',
      commissions: 'العمولات',
      referrals: 'الإحالات',
      commissionRate: 'نسبة العمولة',
      totalClients: 'إجمالي العملاء',
      activeClients: 'العملاء النشطين',
      totalVolume: 'إجمالي الحجم',
    },
    // الإشعارات
    notifications: {
      title: 'الإشعارات',
      markAllRead: 'تحديد الكل كمقروء',
      notificationSettings: 'إعدادات الإشعارات',
      emailNotifications: 'إشعارات البريد',
      smsNotifications: 'إشعارات الرسائل',
      pushNotifications: 'الإشعارات الفورية',
      quietHours: 'ساعات الهدوء',
    },
    // الإعدادات
    settings: {
      title: 'الإعدادات',
      general: 'عام',
      security: 'الأمان',
      preferences: 'التفضيلات',
      language: 'اللغة',
      timezone: 'المنطقة الزمنية',
      theme: 'المظهر',
      twoFactor: 'التحقق الثنائي',
      changePassword: 'تغيير كلمة المرور',
    },
  },
  fr: {
    nav: {
      dashboard: 'Tableau de bord',
      tasks: 'Tâches',
      clients: 'Clients',
      transactions: 'Transactions',
      settings: 'Paramètres',
    },
    common: {
      search: 'Rechercher...',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
    },
    dashboard: {
      title: 'Tableau de bord',
      welcome: 'Bienvenue',
    },
    tasks: {
      title: 'Tâches intelligentes',
    },
    clients: {
      title: 'Clients',
    },
    notifications: {
      title: 'Notifications',
    },
    settings: {
      title: 'Paramètres',
      language: 'Langue',
    },
  },
  es: {
    nav: {
      dashboard: 'Panel de control',
      tasks: 'Tareas',
      clients: 'Clientes',
      transactions: 'Transacciones',
      settings: 'Configuración',
    },
    common: {
      search: 'Buscar...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
    },
    dashboard: {
      title: 'Panel de control',
      welcome: 'Bienvenido',
    },
    tasks: {
      title: 'Tareas inteligentes',
    },
    clients: {
      title: 'Clientes',
    },
    notifications: {
      title: 'Notificaciones',
    },
    settings: {
      title: 'Configuración',
      language: 'Idioma',
    },
  },
  ru: {
    nav: {
      dashboard: 'Панель управления',
      tasks: 'Задачи',
      clients: 'Клиенты',
      settings: 'Настройки',
    },
    common: {
      search: 'Поиск...',
      save: 'Сохранить',
      cancel: 'Отмена',
    },
    dashboard: {
      title: 'Панель управления',
    },
    settings: {
      language: 'Язык',
    },
  },
  zh: {
    nav: {
      dashboard: '仪表盘',
      tasks: '任务',
      clients: '客户',
      settings: '设置',
    },
    common: {
      search: '搜索...',
      save: '保存',
      cancel: '取消',
    },
    dashboard: {
      title: '仪表盘',
    },
    settings: {
      language: '语言',
    },
  },
};

// ============================================
// i18n Service
// ============================================

export class I18nService {
  private currentLanguage: Language = 'en';
  private translations: Record<Language, TranslationStrings>;

  constructor() {
    this.translations = translations;
  }

  // Get current language
  getLanguage(): Language {
    return this.currentLanguage;
  }

  // Set language
  setLanguage(lang: Language): void {
    this.currentLanguage = lang;
    // In production, persist to localStorage/database
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  }

  // Get locale config
  getLocale(): LocaleConfig {
    return LOCALES[this.currentLanguage];
  }

  // Get translation
  t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      let result = value;
      for (const [param, val] of Object.entries(params)) {
        result = result.replace(new RegExp(`{{${param}}}`, 'g'), String(val));
      }
      return result;
    }

    return value;
  }

  // Format number
  formatNumber(num: number, options?: { decimals?: number }): string {
    const locale = this.getLocale();
    const decimals = options?.decimals ?? locale.currency.decimal;
    
    const formatted = num.toFixed(decimals);
    const [intPart, decPart] = formatted.split('.');
    
    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, locale.numberFormat.thousand);
    
    return decPart ? `${intFormatted}${locale.numberFormat.decimal}${decPart}` : intFormatted;
  }

  // Format currency
  formatCurrency(amount: number, currencyCode = 'USD'): string {
    const locale = this.getLocale();
    const formatted = this.formatNumber(amount);
    
    if (locale.currency.position === 'before') {
      return `${locale.currency.symbol}${formatted}`;
    } else {
      return `${formatted} ${locale.currency.symbol}`;
    }
  }

  // Format date
  formatDate(date: Date | string, format?: string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = this.getLocale();
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    const dateFormat = format || locale.dateFormat;
    
    return dateFormat
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', String(year));
  }

  // Format datetime
  formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const dateStr = this.formatDate(d);
    const timeStr = d.toLocaleTimeString();
    return `${dateStr} ${timeStr}`;
  }

  // Get direction
  getDirection(): 'ltr' | 'rtl' {
    return LOCALES[this.currentLanguage].direction;
  }

  // Check if RTL
  isRTL(): boolean {
    return this.getDirection() === 'rtl';
  }

  // Get available languages
  getAvailableLanguages(): { code: Language; name: string; nativeName: string }[] {
    return Object.entries(LOCALES).map(([code, config]) => ({
      code: code as Language,
      name: config.name,
      nativeName: config.nativeName,
    }));
  }

  // Get browser language
  detectBrowserLanguage(): Language {
    if (typeof window === 'undefined') return 'en';
    
    const browserLang = navigator.language.split('-')[0];
    if (browserLang in LOCALES) {
      return browserLang as Language;
    }
    return 'en';
  }

  // Initialize from storage
  initialize(): void {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as Language;
      if (saved && saved in LOCALES) {
        this.currentLanguage = saved;
      } else {
        this.currentLanguage = this.detectBrowserLanguage();
      }
    }
  }
}

// Export singleton
export const i18n = new I18nService();
export const t = i18n.t.bind(i18n);
