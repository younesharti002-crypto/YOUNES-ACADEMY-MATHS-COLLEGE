const MOROCCO_COUNTRY_CODE = "212";
const MOROCCAN_NATIONAL_NUMBER = /^[5-8]\d{8}$/;

/**
 * Normalize a Moroccan phone number to E.164 format (`+212XXXXXXXXX`).
 *
 * Accepted examples:
 * - 0612345678
 * - 06 12 34 56 78
 * - +212612345678
 * - 00212612345678
 * - 212612345678
 *
 * Returns `null` for malformed or non-Moroccan numbers.
 */
export function normalizeMoroccanPhone(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  // Keep only digits after recognizing a possible leading +.
  let digits = trimmed.replace(/[\s().-]/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (!/^\d+$/.test(digits)) {
    return null;
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  let nationalNumber: string;

  if (digits.startsWith(MOROCCO_COUNTRY_CODE)) {
    nationalNumber = digits.slice(MOROCCO_COUNTRY_CODE.length);
  } else if (digits.startsWith("0")) {
    nationalNumber = digits.slice(1);
  } else {
    // Allow a 9-digit national number without the leading zero.
    nationalNumber = digits;
  }

  if (!MOROCCAN_NATIONAL_NUMBER.test(nationalNumber)) {
    return null;
  }

  return `+${MOROCCO_COUNTRY_CODE}${nationalNumber}`;
}

export function isNormalizedMoroccanPhone(value: string): boolean {
  return /^\+212[5-8]\d{8}$/.test(value);
}
