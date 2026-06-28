export class GeoNormalizationUtil {
  /**
   * Normalizes a geographic string (city, state, country)
   * 1. Trims whitespace
   * 2. Replaces multiple spaces with a single space
   * 3. Converts to Title Case
   */
  static normalizeString(value: string | undefined | null): string | undefined {
    if (!value) return undefined;

    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (!trimmed) return undefined;

    return trimmed
      .split(' ')
      .map((word) => {
        // Special case for prepositions common in Spanish
        const lowerWord = word.toLowerCase();
        if (['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en'].includes(lowerWord) && value.length > word.length) {
          return lowerWord;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Generates a normalized search key from city and state
   */
  static generateCityKey(city?: string | null, state?: string | null): string | null {
    if (!city || !state) return null;
    return `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}`;
  }
}
