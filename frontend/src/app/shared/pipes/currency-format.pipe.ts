import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a number as currency.
 *
 * Usage:
 * ```html
 * {{ price | currencyFormat }}           <!-- $1,234.56 -->
 * {{ price | currencyFormat:'EUR' }}     <!-- €1,234.56 -->
 * {{ price | currencyFormat:'GBP':'en-GB' }}  <!-- £1,234.56 -->
 * ```
 */
@Pipe({
  name: 'currencyFormat',
  standalone: true,
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(
    value: number | null | undefined,
    currencyCode = 'USD',
    locale = 'en-US'
  ): string {
    if (value === null || value === undefined) {
      return '';
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
      }).format(value);
    } catch {
      // Fallback for invalid currency/locale
      return `${currencyCode} ${value.toFixed(2)}`;
    }
  }
}
