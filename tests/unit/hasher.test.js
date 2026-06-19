const { hashValue, normalizePhone, buildUserData } = require('../../src/services/hasher');

describe('hashValue', () => {
  test('returns SHA256 hex for lowercase trimmed input', () => {
    // Verified reference from document Appendix B
    expect(hashValue('test@example.com')).toBe(
      '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b'
    );
  });

  test('normalizes email case before hashing', () => {
    expect(hashValue('TEST@EXAMPLE.COM')).toBe(hashValue('test@example.com'));
  });

  test('returns null for empty input', () => {
    expect(hashValue('')).toBeNull();
    expect(hashValue(null)).toBeNull();
    expect(hashValue(undefined)).toBeNull();
  });
});

describe('normalizePhone', () => {
  test('strips non-numeric characters', () => {
    expect(normalizePhone('+1 (555) 123-4567')).toBe('15551234567');
  });

  test('prepends country code 1 for 10-digit US numbers', () => {
    expect(normalizePhone('5551234567')).toBe('15551234567');
  });

  test('leaves international numbers unchanged', () => {
    expect(normalizePhone('+919876543210')).toBe('919876543210');
  });

  test('returns null for empty input', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});

describe('buildUserData', () => {
  const lead = {
    email: 'priya.sharma@example.com',
    phone: '+91-9876543210',
    firstName: 'Priya',
    lastName: 'Sharma',
    fbc: 'fb.1.1704067100.AbCdEf123',
    fbp: 'fb.1.1703980800.1234567890',
    facebookLeadId: '2468013579135790',
  };

  test('hashes email and phone', () => {
    const ud = buildUserData(lead);
    expect(ud.em).toHaveLength(1);
    expect(ud.ph).toHaveLength(1);
    expect(typeof ud.em[0]).toBe('string');
    expect(ud.em[0]).toHaveLength(64);
  });

  test('passes fbc and fbp as-is', () => {
    const ud = buildUserData(lead);
    expect(ud.fbc).toBe(lead.fbc);
    expect(ud.fbp).toBe(lead.fbp);
  });

  test('omits undefined fields', () => {
    const ud = buildUserData({ email: 'x@example.com' });
    expect(ud.ph).toBeUndefined();
    expect(ud.fn).toBeUndefined();
  });
});
