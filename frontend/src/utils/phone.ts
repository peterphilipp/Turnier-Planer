/**
 * Formatiert Handynummern und Telefonnummern einheitlich nach dem Format:
 * +[Landesvorwahl] [Vorwahl] [Durchwahl] (z.B. "+49 171 1234567" oder "+49 4103 123456")
 */
export function formatPhoneNumber(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  if (digitsOnly.length < 5) return trimmed;

  let clean = trimmed.replace(/[^\d+]/g, '');
  if (clean.startsWith('00')) {
    clean = '+' + clean.slice(2);
  } else if (!clean.startsWith('+')) {
    if (clean.startsWith('0')) {
      clean = '+49' + clean.slice(1);
    } else {
      clean = '+49' + clean;
    }
  }

  const num = clean.slice(1);

  const cc3 = ['352', '353', '358', '370', '371', '372', '380', '385', '386', '387', '389'];
  const cc2 = ['49', '43', '41', '31', '32', '33', '34', '36', '39', '40', '44', '45', '46', '47', '48', '90', '42'];
  const cc1 = ['1', '7'];

  let cc = '49';
  let national = num;

  for (const c of cc3) {
    if (num.startsWith(c)) { cc = c; national = num.slice(c.length); break; }
  }
  if (national === num) {
    for (const c of cc2) {
      if (num.startsWith(c)) { cc = c; national = num.slice(c.length); break; }
    }
  }
  if (national === num) {
    for (const c of cc1) {
      if (num.startsWith(c)) { cc = c; national = num.slice(c.length); break; }
    }
  }
  if (national === num) {
    if (num.length > 7) {
      cc = num.slice(0, 2);
      national = num.slice(2);
    } else {
      return '+' + num;
    }
  }

  let vwLen = 3;
  if (cc === '49') {
    if (national.startsWith('15')) {
      vwLen = 4;
    } else if (national.startsWith('16') || national.startsWith('17')) {
      vwLen = 3;
    } else if (national.startsWith('30') || national.startsWith('40') || national.startsWith('69') || national.startsWith('89')) {
      vwLen = 2;
    } else if (national.length >= 7) {
      const secondDigit = national[1];
      if (secondDigit === '0') vwLen = 2;
      else if (['1', '2', '3', '5', '6', '8'].includes(secondDigit) && national[2] === '1') vwLen = 3;
      else vwLen = 4;
    }
  } else if (cc === '43') {
    if (national.startsWith('1')) vwLen = 1;
    else if (national.startsWith('6')) vwLen = 3;
  } else if (cc === '41') {
    vwLen = 2;
  }

  if (national.length <= vwLen + 2) {
    vwLen = Math.max(1, Math.floor(national.length / 2));
  }

  const vorwahl = national.slice(0, vwLen);
  const durchwahl = national.slice(vwLen);

  if (!vorwahl || !durchwahl) return `+${cc} ${national}`;
  return `+${cc} ${vorwahl} ${durchwahl}`;
}
