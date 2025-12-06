const validators = require('../utils/formValidators');

describe('backend formValidators', () => {
  test('isAlpha accepts letters with punctuation', () => {
    expect(validators.isAlpha('John')).toBe(true);
    expect(validators.isAlpha("O'Neill")).toBe(true);
    expect(validators.isAlpha('María-José')).toBe(true);
    expect(validators.isAlpha('John123')).toBe(false);
  });

  test('countSentences and sentence range', () => {
    const text = 'One. Two. Three. Four. Five.';
    expect(validators.countSentences(text)).toBe(5);
    expect(validators.isSentenceCountInRange(text, 5, 10)).toBe(true);
    const many = 'One. Two. Three. Four. Five. Six. Seven. Eight. Nine. Ten. Eleven.';
    expect(validators.isSentenceCountInRange(many, 5, 10)).toBe(false);
  });

  test('isValidMobile should accept normalized formats', () => {
    expect(validators.isValidMobile('09123456789')).toBe(true);
    expect(validators.isValidMobile('9123456789')).toBe(true);
    expect(validators.isValidMobile('639123456789')).toBe(true);
    expect(validators.isValidMobile('+639123456789')).toBe(true);
    expect(validators.isValidMobile('63')).toBe(false);
    expect(validators.isValidMobile('')).toBe(false);
  });

  test('normalizeMobile returns expected normalized values', () => {
    expect(validators.normalizeMobile('63')).toBe('0');
    expect(validators.normalizeMobile('639123456789')).toBe('09123456789');
    expect(validators.normalizeMobile('9123456789')).toBe('09123456789');
    expect(validators.normalizeMobile('+639123456789')).toBe('09123456789');
  });
});
