import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a date string or Date object.
 * Default: Hungarian locale (YYYY. MM. DD. format)
 *
 * Usage:
 * ```html
 * {{ createdAt | dateFormat }}           <!-- 2024. dec. 14. -->
 * {{ createdAt | dateFormat:'long' }}    <!-- 2024. december 14. 10:30 -->
 * {{ createdAt | dateFormat:'short' }}   <!-- 2024. 12. 14. -->
 * {{ createdAt | dateFormat:'relative' }} <!-- 2 órája -->
 * ```
 */
@Pipe({
  name: 'dateFormat',
  standalone: true,
})
export class DateFormatPipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    format: 'short' | 'medium' | 'long' | 'relative' = 'medium',
    locale = 'hu-HU'
  ): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    if (format === 'relative') {
      return this.formatRelative(date, locale);
    }

    const options = this.getFormatOptions(format);

    try {
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch {
      return date.toLocaleDateString();
    }
  }

  private getFormatOptions(
    format: 'short' | 'medium' | 'long'
  ): Intl.DateTimeFormatOptions {
    switch (format) {
      case 'short':
        return {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        };
      case 'long':
        return {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        };
      case 'medium':
      default:
        return {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        };
    }
  }

  private formatRelative(date: Date, locale: string): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const isHungarian = locale.startsWith('hu');

    if (diffSecs < 60) {
      return isHungarian ? 'most' : 'just now';
    } else if (diffMins < 60) {
      return isHungarian
        ? `${diffMins} perce`
        : `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return isHungarian
        ? `${diffHours} órája`
        : `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return isHungarian
        ? `${diffDays} napja`
        : `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  }
}
