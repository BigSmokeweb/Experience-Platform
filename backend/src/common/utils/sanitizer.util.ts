import * as sanitizeHtmlNamespace from 'sanitize-html';
const sanitizeHtml = (sanitizeHtmlNamespace as any).default || sanitizeHtmlNamespace;

export class ContentSanitizer {
  private static readonly strictOptions: any = {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  };

  /**
   * Strictly sanitize any user-generated content (reviews, descriptions, business notes)
   */
  static sanitize(rawText: string | undefined | null): string {
    if (!rawText) return '';
    return sanitizeHtml(rawText, this.strictOptions).trim();
  }

  /**
   * Completely strip all HTML tags for plain-text storage
   */
  static stripAll(rawText: string | undefined | null): string {
    if (!rawText) return '';
    return sanitizeHtml(rawText, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
  }
}
