export class AnonymizationUtil {
  /**
   * Anonymizes a person's name by keeping the first name and the first letter of the last name.
   * Example: "Juan Pérez" -> "Juan P."
   * Example: "María Gómez" -> "María G."
   * Example: "Carlos Alberto Rodríguez" -> "Carlos R."
   */
  static anonymizeName(firstName: string, lastName: string): string {
    const firstWord = firstName.trim().split(' ')[0];
    const initial = lastName.trim().charAt(0).toUpperCase();
    return `${firstWord} ${initial}.`;
  }
}
