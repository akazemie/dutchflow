"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MessageDescriptor } from "@/learning/contracts/message";
import type { ExplanationLanguage } from "@/learning/core/preferences";
import {
  formatMessage,
  uiLocaleForExplanationLanguage,
  type MessageTranslator,
  type MessageParameters,
  type UiLocale,
} from "@/i18n/catalog";
import { useLearningRuntime } from "@/features/runtime/learning-runtime-provider";

interface I18nContextValue {
  locale: UiLocale;
  preferenceLoadFailed: boolean;
  setExplanationLanguage(language: ExplanationLanguage): void;
  t: MessageTranslator;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const runtime = useLearningRuntime();
  const [locale, setLocale] = useState<UiLocale>("en");
  const [preferenceLoadFailed, setPreferenceLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!runtime) return () => { active = false; };
    void runtime.getPreferences().then((preferences) => {
      if (active) setLocale(uiLocaleForExplanationLanguage(preferences.explanationLanguage));
    }).catch(() => {
      if (active) setPreferenceLoadFailed(true);
    });
    return () => { active = false; };
  }, [runtime]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setExplanationLanguage = useCallback((language: ExplanationLanguage) => {
    setLocale(uiLocaleForExplanationLanguage(language));
    setPreferenceLoadFailed(false);
  }, []);
  const t = useCallback((value: string | MessageDescriptor, params?: MessageParameters) => {
    if (typeof value === "string") return formatMessage(locale, value, params);
    return formatMessage(locale, value.key, value.params);
  }, [locale]);
  const context = useMemo(() => ({
    locale,
    preferenceLoadFailed,
    setExplanationLanguage,
    t,
  }), [locale, preferenceLoadFailed, setExplanationLanguage, t]);

  return <I18nContext.Provider value={context}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider.");
  return context;
}
