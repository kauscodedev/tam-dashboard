import { AggregatedData, FilterState } from '@/types/dashboard';
import { aggregate } from './aggregate';

export function applyFilters(
  data: AggregatedData,
  filters: FilterState
): AggregatedData {
  const { orgTier, teamId, dmsName } = filters;

  if (!orgTier && !teamId && !dmsName) {
    return data;
  }

  const filtered = data.relevantRecords.filter((record) => {
    if (orgTier && record.ot !== orgTier) return false;
    if (teamId && record.tm !== teamId) return false;
    if (dmsName && record.dn !== dmsName) return false;
    return true;
  });

  return aggregate(filtered, data.labels);
}
