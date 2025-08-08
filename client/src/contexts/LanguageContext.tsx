import React, { createContext, useContext, useState } from 'react'

export type Language = 'en' | 'bem' | 'ton' | 'nya'

export const languages = {
  en: 'English',
  bem: 'Bemba',
  ton: 'Tonga', 
  nya: 'Nyanja'
} as const

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Translation keys - expandable for full i18n
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.clusters': 'Clusters',
    'nav.trading': 'Trading',
    'nav.chat': 'Chat',
    'nav.microfinance': 'Microfinance',
    'nav.wallet': 'Wallet',
    'nav.profile': 'Profile',
    
    // Dashboard
    'dashboard.title': 'Energy Dashboard',
    'dashboard.welcome': 'Welcome to Innerlectra',
    'dashboard.energy_stats': 'Energy Statistics',
    'dashboard.total_generated': 'Total Generated',
    'dashboard.total_consumed': 'Total Consumed',
    'dashboard.total_traded': 'Total Traded',
    'dashboard.carbon_saved': 'Carbon Saved',
    
    // Clusters
    'clusters.title': 'Energy Clusters',
    'clusters.join': 'Join Cluster',
    'clusters.create': 'Create Cluster',
    'clusters.members': 'Members',
    'clusters.capacity': 'Capacity',
    'clusters.funds': 'Pooled Funds',
    
    // Trading
    'trading.title': 'Energy Trading',
    'trading.buy': 'Buy Energy',
    'trading.sell': 'Sell Energy',
    'trading.price_per_kwh': 'Price per kWh',
    'trading.amount': 'Amount (kWh)',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.back': 'Back',
    'common.next': 'Next',
    
    // Currency
    'currency.zmw': 'ZMW',
    'currency.kwh': 'kWh',
  },
  bem: {
    // Basic translations for Bemba
    'nav.dashboard': 'Dashboard',
    'nav.clusters': 'Imishanga',
    'nav.trading': 'Ukuusha',
    'nav.chat': 'Ukutalisha',
    'nav.microfinance': 'Microfinance',
    'nav.wallet': 'Wallet',
    'nav.profile': 'Profile',
    
    'dashboard.title': 'Energy Dashboard',
    'dashboard.welcome': 'Mwaiseni ku Innerlectra',
    'dashboard.energy_stats': 'Ifi fyakutemwa amaka',
    'common.loading': 'Fikukwela...',
  },
  ton: {
    // Basic translations for Tonga
    'nav.dashboard': 'Dashboard',
    'nav.clusters': 'Mabundu',
    'nav.trading': 'Kuusha', 
    'nav.chat': 'Kambukambule',
    'dashboard.welcome': 'Mwabonwa ku Innerlectra',
    'common.loading': 'Chikulenga...',
  },
  nya: {
    // Basic translations for Nyanja  
    'nav.dashboard': 'Dashboard',
    'nav.clusters': 'Magulu',
    'nav.trading': 'Kugulitsa',
    'nav.chat': 'Kukambirana',
    'dashboard.welcome': 'Muli bwanji ku Innerlectra',
    'common.loading': 'Tikuyembekezera...',
  }
}

interface LanguageProviderProps {
  children: React.ReactNode
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('innerlectra-language') as Language
    return savedLanguage || 'en'
  })

  const handleSetLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage)
    localStorage.setItem('innerlectra-language', newLanguage)
  }

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key
  }

  const value = {
    language,
    setLanguage: handleSetLanguage,
    t,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}