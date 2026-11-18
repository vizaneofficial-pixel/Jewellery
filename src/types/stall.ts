export type AppTab = 'optimizer' | 'calculator' | 'strategies' | 'overview';

export type ZoneId = 'front_left' | 'center_tray' | 'right_mirror' | 'back_riser';

export interface BangleCategory {
  id: string;
  name: string;
  shortName: string;
  cost: number;
  price: number;
  beauty: number;
  barColor: string;
  textClass: string;
  bgClass: string;
}

export interface OptimizerRules {
  allAtLeastOne: boolean;
  evenDistribution: boolean;
  beautyFirst: boolean;
  maxProfitFocus: boolean;
  safe90Mode: boolean;
}

export interface OptimizerConfig {
  budgetCap: number;
  minProfitFloor: number;
  maxPerCategory: number;
  minColoursRule: number;
}

export interface BangleCombo {
  id: string;
  rank: number;
  label: string;
  badge: string;
  keywords: string[];
  badgeColor: string;
  counts: number[];
  cost: number;
  rev100: number;
  prof100: number;
  rev90: number;
  prof90: number;
  pieces: number;
  avgBeauty: number;
  evenness: number;
  marginPct: number;
  score: number;
  isCustom?: boolean;
}

export interface StockCategoryGroup {
  id: string;
  name: string;
  accentColor: string;
  budgetCap: number;
  minProfitFloor: number;
  maxPerCategory: number;
  minColoursRule: number;
  rules: OptimizerRules;
  categories: BangleCategory[];
  selectedComboId: string | null;
  customQuantities: number[] | null;
}

export interface CategoryGroupResolved {
  group: StockCategoryGroup;
  combos: BangleCombo[];
  activeCombo: BangleCombo | null;
}

export interface DiversifiedOverviewTotals {
  totalAllocatedBudget: number;
  totalInvestment: number;
  totalRevenue100: number;
  totalRevenue90: number;
  totalProfit100: number;
  totalProfit90: number;
  totalPieces: number;
  weightedBeauty: number;
  blendedMarginPct: number;
}

export interface StallStockItem {
  id: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  qty: number;
  sellThrough: number;
  isSyncedBundle: boolean;
  unitPieces?: number;
  groupId?: string;
}

export interface StallStockRow extends StallStockItem {
  lineCost: number;
  lineRev100: number;
  lineProfit100: number;
  lineRevReal: number;
  lineProfitReal: number;
  roiPct: number;
  marginPct: number;
  unitsCount: number;
}

export interface StallTotals {
  itemRows: StallStockRow[];
  totalCost: number;
  totalOutlay: number;
  rev100: number;
  revRealistic: number;
  grossProfit100: number;
  grossProfitReal: number;
  netAfterStall100: number;
  netAfterStallReal: number;
  totalUnits: number;
  breakEvenCoveragePct: number;
  unitsToBreakEven: number;
  footfallConversionNeeded: number;
  blendedMarginPct: number;
  capitalMultiple: number;
  rentBurdenPct: number;
  avgItemPrice: number;
  topRoiItemName: string;
  topRoiPct: number;
}

export interface PlaybookCard {
  id: string;
  number: string;
  title: string;
  desc: string;
  metric: string;
  imageUrl: string;
  imageAlt: string;
}

export interface VideoGuide {
  id: string;
  title: string;
  tag: string;
  duration: string;
  keyTakeaway: string;
  queryUrl: string;
}

export interface GroundedSource {
  title: string;
  uri: string;
}

export interface LocalParseResult {
  budgetCap?: number;
  minProfitFloor?: number;
  stallFee?: number;
  maxPerCategory?: number;
  minColoursRule?: number;
  eventName?: string;
  expectedFootfall?: number;
  ruleUpdates: Partial<OptimizerRules>;
  categoryUpdates: Array<{ id: string; cost?: number; price?: number; beauty?: number }>;
  stockAdditions: StallStockItem[];
  changes: string[];
}

export interface PlannerSnapshot {
  eventName: string;
  expectedFootfall: number;
  budgetCap: number;
  minProfitFloor: number;
  stallFee: number;
  maxPerCategory: number;
  minColoursRule: number;
  globalSellThrough: number;
  rules: OptimizerRules;
  categories: BangleCategory[];
  selectedComboId: string | null;
  customQuantities: number[] | null;
  stallStock: StallStockItem[];
  activeTab: AppTab;
  categoryGroups?: StockCategoryGroup[];
  activeGroupId?: string;
}

export interface SaleScalePreset {
  id: string;
  label: string;
  eventName: string;
  expectedFootfall: number;
  budgetCap: number;
  minProfitFloor: number;
  stallFee: number;
  maxPerCategory: number;
}

export type AiMemoryCategory = 'inventory' | 'pricing' | 'event' | 'preference' | 'strategy';

export interface AiMemoryAddition {
  fact: string;
  category: AiMemoryCategory;
}

export interface AiMemoryItem {
  id: string;
  ownerId: string;
  fact: string;
  category: AiMemoryCategory;
  source: 'voice' | 'command' | 'manual';
  createdAtMs: number;
  updatedAtMs: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  businessName: string;
  preferredScale: string;
}

export interface AccountAiContext {
  displayName?: string;
  businessName?: string;
  preferredScale?: string;
  memories: Array<{ fact: string; category: string }>;
}
