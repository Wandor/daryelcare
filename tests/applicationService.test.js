/**
 * Unit tests for application service utility functions.
 * Database interactions are mocked so no PostgreSQL connection is needed.
 */

jest.mock('../server/db', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

const {
  escapeHtml,
} = require('../server/services/applicationService');

// Access non-exported functions through the module internals.
// Since buildChecksFromForm, calculateProgress, etc. are not exported,
// we test them indirectly via escapeHtml (exported) and through route tests.

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it('returns non-string values unchanged', () => {
    expect(escapeHtml(42)).toBe(42);
    expect(escapeHtml(null)).toBe(null);
    expect(escapeHtml(undefined)).toBe(undefined);
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns safe strings unchanged', () => {
    expect(escapeHtml('John Doe')).toBe('John Doe');
  });

  it('escapes multiple special characters together', () => {
    expect(escapeHtml('a & b < c > d "e" \'f\'')).toBe(
      'a &amp; b &lt; c &gt; d &quot;e&quot; &#x27;f&#x27;'
    );
  });
});
