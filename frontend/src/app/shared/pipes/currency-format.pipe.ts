import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a number as currency.
 * Default: Hungarian Forint (HUF) with Hungarian locale
 *
 * Usage:
 * ```html
 * {{ price | currencyFormat }}                    <!-- 1 234 Ft -->
 * {{ price | currencyFormat:'EUR' }}              <!-- 1 234,00 € -->
 * {{ price | currencyFormat:'USD':'en-US' }}      <!-- $1,234.00 -->
 * ```
 */
@Pipe({
  name: 'currencyFormat',
  standalone: true,
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(
    value: number | null | undefined,
    currencyCode = 'HUF',
    locale = 'hu-HU'
  ): string {
    if (value === null || value === undefined) {
      return '';
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        // HUF typically doesn't show decimals
        minimumFractionDigits: currencyCode === 'HUF' ? 0 : 2,
        maximumFractionDigits: currencyCode === 'HUF' ? 0 : 2,
      }).format(value);
    } catch {
      // Fallback for invalid currency/locale
      return `${value.toFixed(currencyCode === 'HUF' ? 0 : 2)} ${currencyCode === 'HUF' ? 'Ft' : currencyCode}`;
    }
  }
}
