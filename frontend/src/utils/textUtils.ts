/**
 * Utility functions for text processing
 */

/**
 * Strip HTML tags from a string and convert to plain text
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';

  // Create a temporary div element to parse HTML
  const div = document.createElement('div');
  div.innerHTML = html;

  // Get text content (automatically strips tags)
  return div.textContent || div.innerText || '';
}

/**
 * Truncate text to a maximum length and add ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Convert HTML to formatted text with basic formatting preserved
 */
export function htmlToFormattedText(html: string): string {
  if (!html) return '';

  const div = document.createElement('div');
  div.innerHTML = html;

  // Replace <br> and <p> tags with newlines
  div.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });

  div.querySelectorAll('p').forEach(p => {
    p.replaceWith(p.textContent + '\n\n');
  });

  // Replace list items with bullets
  div.querySelectorAll('li').forEach(li => {
    li.replaceWith('• ' + li.textContent + '\n');
  });

  return (div.textContent || '').trim();
}
