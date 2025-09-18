export type ID = string;
export type ISODate = string; // YYYY-MM-DD

export interface LaunchDraft {
  id: ID;
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'rejected';
  basics: Basics;
  analogs: AnalogSelection[];
  market: MarketInputs;
  cannibalization: CannibalizationInput;
  scenarios: Scenario[]; // 1..3
  selectedScenarioId?: ID;
  supplyPlan?: SupplyPlan;
  audit: { createdBy: ID; createdAt: string; updatedAt: string };
}

export interface Basics {
  name: string;
  category: string;
  brand: string;
  parent?: string;
  uom: string;
  packSize?: string;
  gtin?: string;
  lifecycle: 'launch';
  launchDate: ISODate;
  locations: string[];
  channels: string[];
}

export interface AnalogSelection {
  productId: ID;
  name: string;
  weight: number;
  attributeMap?: Record<string, number>; // e.g., brandPower:0.7
}

export interface MarketInputs {
  price: number;
  currency: 'MXN' | 'USD';
  seasonalityCurveId?: ID;
  marketingGRPs?: number;
  distribution: RolloutPlan;
  promoCalendar?: PromoWeek[];
}

export interface RolloutPlan {
  weeks: RolloutWeek[];
}

export interface RolloutWeek {
  week: ISODate;
  acvPct: number;
}

export interface PromoWeek {
  week: ISODate;
  discountPct: number;
}

export interface CannibalizationInput {
  impactedSkus: { productId: ID; name: string; cannibalizationPct: number }[];
}

export interface Scenario {
  id: ID;
  name: string;
  assumptions: ScenarioAssumptions;
  forecast?: TimePoint[];
  kpis?: KPIs;
}

export interface ScenarioAssumptions {
  price?: number;
  marketingGRPs?: number;
  distribution?: RolloutPlan;
  promoCalendar?: PromoWeek[];
  analogWeights?: Record<ID, number>;
}

export interface TimePoint {
  date: ISODate;
  value: number;
}

export interface KPIs {
  totalUnits: number;
  revenue: number;
  grossMargin: number;
  peakWeek: ISODate;
  avgWOS?: number;
}

export interface AnalogProduct {
  productId: ID;
  name: string;
  category: string;
  price: number;
}

export interface SupplySignals {
  leadTimeDays: number;
  moq: number;
  onHand: number;
  capacityFlag: boolean;
}

export interface SupplyPlan {
  scenario: 'new_product' | 'product_replacement';
  replacedProduct?: ReplacedProduct;
  demandForecast: TimePoint[];
  supplyRecommendation: SupplyRecommendation;
  riskAssessment: RiskAssessment;
}

export interface ReplacedProduct {
  productId: ID;
  name: string;
  currentInventory: number;
  plannedPhaseOutDate: ISODate;
  transitionPlan: TransitionPlan;
}

export interface TransitionPlan {
  overlapWeeks: number;
  inventoryTransfer: boolean;
  salesDown: TimePoint[];
}

export interface SupplyRecommendation {
  totalQuantityNeeded: number;
  productionSchedule: ProductionBatch[];
  inventoryUtilization?: InventoryUtilization;
  warnings: string[];
}

export interface ProductionBatch {
  batchNumber: number;
  quantity: number;
  productionStartDate: ISODate;
  deliveryDate: ISODate;
  cost: number;
}

export interface InventoryUtilization {
  availableFromReplaced: number;
  utilizationPct: number;
  avoidedOverstock: number;
  transferCost: number;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  risks: Risk[];
}

export interface Risk {
  type: 'capacity' | 'timing' | 'inventory' | 'cost';
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

export type UserRole = 'admin' | 'planner' | 'viewer';

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}