/**
 * Tokenization utilities for Inverted Index Search.
 */

/**
 * Normalizes and tokenizes a text string into an array of unique tokens.
 *
 * Rules:
 * 1. Convert to lowercase
 * 2. Trim spaces
 * 3. Split by non-alphanumeric characters
 * 4. Filter out empty tokens & single character noise unless numbers
 * 5. Deduplicate tokens
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];

  const rawTokens = text
    .toLowerCase()
    .trim()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);

  return Array.from(new Set(rawTokens));
}

/**
 * Generates prefix tokens for partial match indexing.
 * E.g., "oversized" => ["ov", "ove", "over", "overs", "oversi", "oversiz", "oversize"]
 * Minimum prefix length defaults to 2.
 * Maximum prefix length defaults to 8.
 */
export function generatePrefixes(
  token: string,
  minLen = 2,
  maxLen = 8,
): string[] {
  if (!token || token.length < minLen) return [];

  const prefixes: string[] = [];
  const limit = Math.min(token.length - 1, maxLen);

  for (let len = minLen; len <= limit; len++) {
    prefixes.push(token.slice(0, len));
  }

  return prefixes;
}

/**
 * Clean & sanitize query string for safe processing.
 */
export function cleanQueryString(query: string): string {
  if (!query) return '';
  return query
    .slice(0, 100)
    .replace(/[<>{}$]/g, '')
    .trim();
}
