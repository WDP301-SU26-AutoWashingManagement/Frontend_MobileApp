export function parseVietQR(qrStr: string) {
  if (!qrStr || typeof qrStr !== 'string' || qrStr.startsWith('data:image')) return null;
  
  function parseTags(s: string) {
    let res: Record<string, string> = {};
    let i = 0;
    while(i < s.length) {
      let t = s.substr(i, 2);
      let l = parseInt(s.substr(i + 2, 2));
      if (isNaN(l)) break;
      let v = s.substr(i + 4, l);
      res[t] = v;
      i += 4 + l;
    }
    return res;
  }

  try {
    const root = parseTags(qrStr);
    const accountName = root['59'];
    let accountNumber = '';
    let bin = '';
    let addInfo = '';

    if (root['38']) {
      const t38 = parseTags(root['38']);
      if (t38['01']) {
        const t01 = parseTags(t38['01']);
        bin = t01['00'];
        accountNumber = t01['01'];
      }
    }
    
    if (root['62']) {
      const t62 = parseTags(root['62']);
      if (t62['08']) {
        addInfo = t62['08'];
      }
    }
    
    if (accountName || accountNumber) {
       return { accountName, accountNumber, bin, addInfo };
    }
    return null;
  } catch (e) {
    return null;
  }
}
