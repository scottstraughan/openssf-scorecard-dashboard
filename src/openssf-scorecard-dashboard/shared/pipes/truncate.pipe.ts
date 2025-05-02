import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {
  /**
   * Truncate a string of text to a specific length.
   * @param value the value to truncate
   * @param limit the max length of the string
   * @param ellipsis the ellipsis to use at the end of the truncated string
   */
  transform(
    value: string | null | undefined,
    limit = 25,
    ellipsis = '...'
  ): string | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }

    return value.length > limit
      ? value.slice(0, limit) + ellipsis
      : value;
  }
}
