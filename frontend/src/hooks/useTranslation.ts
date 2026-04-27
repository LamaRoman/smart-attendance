'use client'

import { useAuth } from '@/contexts/auth-context'
import { t as translate, Language } from '@/lib/i18n'
import { toNepaliDigits as convertToNepali } from '@/components/BSDatePicker'

/**
 * Translation hook — reads language from org settings
 * Usage: const { t, lang, isNepali, formatNum } = useTranslation();
 */
export function useTranslation() {
  const { language } = useAuth()
  const lang: Language = language || 'NEPALI'
  const isNepali = lang === 'NEPALI'

  const t = (key: string): string => translate(key, lang)

  // Format number — Nepali digits or English
  const formatNum = (num: number): string => {
    return isNepali ? convertToNepali(num) : String(num)
  }

  return { t, lang, isNepali, formatNum }
}
