export const MAX_BACKUP_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_BACKUP_FILE_COUNT = 20;
export const KNOWN_BACKUP_KEYS = ['version', 'backupDate', 'scope', 'entries', 'assessments', 'teams', 'signatures', 'siteConfig'] as const;

const isPlainObject = (value: unknown): value is Record<string, any> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const hasSupportedBackupShape = (value: unknown) => {
  if (Array.isArray(value)) return true;
  if (!isPlainObject(value)) return false;
  if (KNOWN_BACKUP_KEYS.some(key => key in value)) return true;
  return Object.values(value).some(Array.isArray);
};

export const summarizeBackupPayload = (payload: unknown) => {
  let totalTbm = 0;
  let totalRisk = 0;
  let totalTeam = 0;
  let hasData = false;

  const countItems = (items: unknown) => Array.isArray(items) ? items.length : 0;

  if (Array.isArray(payload)) {
    const tbmCount = payload.filter((item: any) => item?.workDescription || item?.date || item?.teamName).length;
    const riskCount = payload.filter((item: any) => item?.month && item?.priorities).length;
    totalTbm += tbmCount;
    totalRisk += riskCount;
    hasData = tbmCount > 0 || riskCount > 0;
    return { totalTbm, totalRisk, totalTeam, hasData };
  }

  if (!isPlainObject(payload)) {
    return { totalTbm, totalRisk, totalTeam, hasData };
  }

  if (payload.entries) {
    totalTbm += countItems(payload.entries);
    hasData = true;
  }
  if (payload.assessments) {
    totalRisk += countItems(payload.assessments);
    hasData = true;
  }
  if (payload.teams) {
    totalTeam += countItems(payload.teams);
    hasData = true;
  }

  if (!hasData) {
    Object.keys(payload).forEach(key => {
      const arr = payload[key];
      if (!Array.isArray(arr) || arr.length === 0) return;
      const first = arr[0];
      if (first?.workDescription || first?.date) {
        totalTbm += arr.length;
        hasData = true;
      } else if (first?.month && first?.priorities) {
        totalRisk += arr.length;
        hasData = true;
      } else if (first?.category && first?.name) {
        totalTeam += arr.length;
        hasData = true;
      }
    });
  }

  return { totalTbm, totalRisk, totalTeam, hasData };
};
