export enum BusynessLevel {
  QUIET = 'quiet',
  MODERATE = 'moderate',
  BUSY = 'busy',
}

export const BusynessPercentageMap: Record<BusynessLevel, number> = {
  [BusynessLevel.QUIET]: 25,
  [BusynessLevel.MODERATE]: 50,
  [BusynessLevel.BUSY]: 85,
};
