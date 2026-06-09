export const toSnakeCase = (obj: any, ignoreKeys: string[] = []): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v, ignoreKeys));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (ignoreKeys.includes(key)) {
        newObj[key] = toSnakeCase(obj[key], ignoreKeys);
        continue;
      }
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = toSnakeCase(obj[key], ignoreKeys);
    }
    return newObj;
  }
  return obj;
};

export const toCamelCase = (obj: any, ignoreKeys: string[] = []): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v, ignoreKeys));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (ignoreKeys.includes(key)) {
        newObj[key] = toCamelCase(obj[key], ignoreKeys);
        continue;
      }
      const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
      newObj[camelKey] = toCamelCase(obj[key], ignoreKeys);
    }
    return newObj;
  }
  return obj;
};

export const toUpperText = (obj: any): any => {
  if (typeof obj === 'string') {
    return obj.toUpperCase();
  } else if (Array.isArray(obj)) {
    return obj.map(v => toUpperText(v));
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const newObj: any = {};
    const keysToPreserve = [
      'id', 'status', 'role', 'date', 'password', 'replies', 'guests',
      'created_at', 'created_by', 'updated_at', 'deleted_at', 'deleted_by',
      'createdby', 'resident_id', 'residentid', 'objeto_id', 'objetoid',
      'usuario_id', 'usuarioid', 'area_id', 'areaid', 'morador_id', 'moradorid',
      'createdat', 'updatedat', 'expirationtime', 'entrytime', 'exittime',
      'guests_count', 'guestscount', 'active', 'biometrics_active', 'biometricsactive'
    ];
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      const shouldPreserve = keysToPreserve.some(k => lowerKey === k || lowerKey.endsWith('_id') || lowerKey.endsWith('id'));
      
      if (key.toLowerCase().includes('email') || key.toLowerCase().includes('url') || key.toLowerCase().includes('photo') || shouldPreserve) {
        newObj[key] = obj[key];
      } else {
        newObj[key] = toUpperText(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

export const isImageUrl = (url?: string): boolean => {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const lowercaseUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowercaseUrl.includes(ext));
};

export const generateAccessCode = (length: number = 4): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const parseUsageCount = (notes?: string): number => {
  if (!notes) return 0;
  const match = notes.match(/usageCount:(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

export const updateUsageCount = (notes: string | undefined, count: number): string => {
  let baseNotes = notes ? notes.replace(/usageCount:\d+/, '').trim() : '';
  return `${baseNotes} usageCount:${count}`.trim();
};
