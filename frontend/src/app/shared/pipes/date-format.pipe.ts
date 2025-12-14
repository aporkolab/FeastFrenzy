import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a date string or Date object.
 *
 * Usage:
 * ```html
 * {{ createdAt | dateFormat }}           <!-- Dec 14, 2024 -->
 * {{ createdAt | dateFormat:'long' }}    <!-- December 14, 2024 at 10:30 AM -->
 * {{ createdAt | dateFormat:'short' }}   <!-- 12/14/24 -->
 * {{ createdAt | dateFormat:'relative' }} <!-- 2 hours ago -->
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
    locale = 'en-US'
  ): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    if (format === 'relative') {
      return this.formatRelative(date);
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
          year: '2-digit',
          month: 'numeric',
          day: 'numeric',
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

  private formatRelative(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  }
}
