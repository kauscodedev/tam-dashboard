import { AggregatedData, FilterState } from '@/types/dashboard';
import { aggregate } from './aggregate';

export function applyFilters(
  data: AggregatedData,
  filters: FilterState
): AggregatedData {
  const {
    orgTier,
    teamId,
    dmsName,
    dealershipType,
    state,
    crmPlatform,
    lifecycleStage,
  } = filters;

  if (
    !orgTier &&
    !teamId &&
    !dmsName &&
    !dealershipType &&
    !state &&
    !crmPlatform &&
    !lifecycleStage
  ) {
    return data;
  }

  const filtered = data.relevantRecords.filter((record) => {
    if (orgTier && record.ot !== orgTier) return false;
    if (teamId && record.tm !== teamId) return false;
    if (dmsName && record.dn !== dmsName) return false;
    if (dealershipType && record.td !== dealershipType) return false;
    if (state && record.st !== state) return false;
    if (crmPlatform && record.cp !== crmPlatform) return false;
    if (lifecycleStage && record.ls !== lifecycleStage) return false;
    return true;
  });

  return {
    ...aggregate(filtered, data.labels),
    fetchedAt: data.fetchedAt,
    filterOptions: data.filterOptions,
  };
}
