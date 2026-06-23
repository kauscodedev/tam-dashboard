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
    segment,
  } = filters;

  if (
    !orgTier &&
    !teamId &&
    !dmsName &&
    !dealershipType &&
    !state &&
    !crmPlatform &&
    !lifecycleStage &&
    !segment
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
    if (segment && record.sg !== segment) return false;
    return true;
  });

  const result = aggregate(filtered, data.labels);
  return {
    ...result,
    fetchedAt: data.fetchedAt,
    filterOptions: data.filterOptions,
    // The dealer-group target list is canonical (sync-time); records can't rebuild
    // a group's true rooftop count under a filter, so carry it through unchanged.
    segmentation: {
      ...result.segmentation,
      groups: data.segmentation.groups,
      smbGt50: data.segmentation.smbGt50,
      smbPodGt50: data.segmentation.smbPodGt50,
      smbPodLe50: data.segmentation.smbPodLe50,
      smbStageGt50: data.segmentation.smbStageGt50,
      smbStageLe50: data.segmentation.smbStageLe50,
      mmRooftopPodSplit: data.segmentation.mmRooftopPodSplit,
    },
  };
}
