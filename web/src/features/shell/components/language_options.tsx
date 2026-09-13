"use client";

import { CheckIcon } from "@phosphor-icons/react";
import MenuRow from "./menu_row";
import { locales, type Locale } from "@/i18n/config";
import { localeNames, useChooseLocale } from "@/i18n/use_choose_locale";

const ICON_SIZE = 14;

export interface LanguageOptionsOptions {
  current: Locale;
}

/**
 * The languages as menu rows rather than a select. A native control dropped
 * into a popover looks like something that fell in from another app, and the
 * list is two items long.
 */
export default function LanguageOptions(options: LanguageOptionsOptions) {
  const choose = useChooseLocale();

  return (
    <>
      {locales.map((locale) => (
        <MenuRow
          icon={
            <span className="flex w-3.5 justify-center">
              {locale === options.current && <CheckIcon size={ICON_SIZE} weight="bold" />}
            </span>
          }
          key={locale}
          onClick={() => choose(locale)}
        >
          {localeNames[locale]}
        </MenuRow>
      ))}
    </>
  );
}
