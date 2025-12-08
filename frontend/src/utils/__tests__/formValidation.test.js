import {
  isAlpha,
  countSentences,
  isSentenceCountInRange,
  normalizeMobile,
  isValidMobile,
} from '../../formValidation';

describe('formValidation helpers', () => {
  test('isAlpha should accept letters and common name punctuation', () => {
    expect(isAlpha('John')).toBe(true);
    expect(isAlpha("O'Neill")).toBe(true);
    expect(isAlpha('María-José')).toBe(true);
    expect(isAlpha('李')).toBe(true);
    expect(isAlpha('John123')).toBe(false);
    expect(isAlpha('')).toBe(false);
  });

  test('countSentences should split sentences correctly', () => {
    const text = 'This is sentence one. This is sentence two! And is this three? Yes.';
    expect(countSentences(text)).toBe(4);
    expect(countSentences('No punctuation just one sentence')).toBe(1);
    expect(countSentences('')).toBe(0);
  });

  test('isSentenceCountInRange should return true for 5-10', () => {
    const fiveSentences = '1. One. 2. Two. 3. Three. 4. Four. 5. Five.';
    expect(isSentenceCountInRange(fiveSentences, 5, 10)).toBe(true);
    const eleven = 'One. Two. Three. Four. Five. Six. Seven. Eight. Nine. Ten. Eleven.';
    expect(isSentenceCountInRange(eleven, 5, 10)).toBe(false);
  });

  test('normalizeMobile should transform different input formats', () => {
    expect(normalizeMobile('63')).toBe('0');
    expect(normalizeMobile('639123456789')).toBe('09123456789');
    expect(normalizeMobile('9123456789')).toBe('09123456789');
    expect(normalizeMobile('09123456789')).toBe('09123456789');
    expect(normalizeMobile('+639123456789')).toBe('09123456789');
    expect(normalizeMobile('63abc9123456789')).toBe('09123456789');
  });

  test('isValidMobile accepts multiple input formats when normalized', () => {
    expect(normalizeMobile('639123456789')).toBe('09123456789');
    expect(normalizeMobile('9123456789')).toBe('09123456789');
    // isValidMobile should accept various formats because normalizeMobile will be applied
    expect(isValidMobile('09123456789')).toBe(true);
    expect(isValidMobile('9123456789')).toBe(true);
    expect(isValidMobile('639123456789')).toBe(true);
  });
});
