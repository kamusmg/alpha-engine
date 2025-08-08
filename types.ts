

export interface BacktestSignal {
  assetName: string;
  signalType: 'COMPRA' | 'VENDA';
  technicalJustification: string;
  esotericJustification: string;
  worthIt: boolean;
  pastPrice: number;
  futurePrice: number;
  investment: number;
  finalValue: number;
  profit: number;
  roiPercentage: number;
  strategy: string;
  entryDatetime: string;
  exitDatetime: string;
}

export interface SelfAnalysis {
  errorExplanation: string;
  failedModel: string;
  correctionSuggestion: string;
  errorImpactAnalysis: string;
}

export type Horizon = '24 Horas' | '7 Dias' | '30 Dias' | '1 Ano';

export interface PresentDayAssetSignal {
  assetName: string;
  signalType: 'COMPRA' | 'VENDA' | 'NEUTRO';
  entryRange: string;
  probability: string;
  target: string;
  stopLoss: string;
  horizon: Horizon;
  technicalJustification: string;
  esotericJustification: string;
  confidenceLevel: 'Baixo' | 'Médio' | 'Alto' | 'Low' | 'Medium' | 'High';
  profitProjectionUsd: number;
  roiProjectionPercentage: number;
  strategy: string;
  entryDatetime: string;
  exitDatetime: string;
  ivlPercentage?: number;
  livePrice?: string | null;

  // Novos campos para o pipeline de sinal final
  finalConfidenceScore?: number;
  recommendedPositionSize?: 'Máximo' | 'Médio' | 'Mínimo' | 'Não Operar';
  passedValidations?: string[];
  postEntryMonitoringLog?: string[];

  // New fields for per-signal analysis
  strongPoints?: string[];
  weakPoints?: string[];
  specialModes?: string[];
}

export interface MacroIndicator {
  name: string;
  value: string;
  interpretation: string;
  status: 'critical' | 'warning' | 'neutral' | 'good';
}

// Replaced MajorAssetAnalysis and MajorAssetSummary with InstitutionalAssetAnalysis
export interface InstitutionalAssetAnalysis {
  ticker: string; // e.g., 'BTC'
  name: string; // e.g., 'Bitcoin'
  livePrice: number; // e.g., 68500.50
  priceChange: {
    '24h': number; // percentage, e.g., 2.5
    '7d': number;  // percentage, e.g., -5.1
    '30d': number; // percentage, e.g., 15.8
    '1y': number;  // percentage, e.g., 120.3
  };
  marketCap: number; // e.g., 1300000000000
  volume24h: number; // e.g., 45000000000
  trend: 'bullish' | 'bearish' | 'neutral';
  entryPoint: number; // price
  target: number;     // price
  stopLoss: number;   // price
  isHighVolatility: boolean; // true if 24h change > 5%
}


export interface SimulationResult {
  versionId: string;
  dateGenerated: string;
  backtestSummary: string;
  macroContext: MacroIndicator[];
  signals24h: [BacktestSignal, BacktestSignal];
  signals7d: [BacktestSignal, BacktestSignal];
  signals30d: [BacktestSignal, BacktestSignal];
  selfAnalysis: SelfAnalysis;
  presentDayBuySignals: PresentDayAssetSignal[];
  presentDaySellSignals: PresentDayAssetSignal[];
  evolutionPrompt: string;
  institutionalAssets: InstitutionalAssetAnalysis[];
  perfectionNotification?: string;
  evolutionPercentage: number;
  realMoneySuccessProbability: number;
  backtestStrengths: string;
  backtestWeaknesses: string;
  presentDayStrengths: string;
  presentDayWeaknesses: string;
}

// --- Derived Analysis Result Types ---
export type BacktestAnalysisResult = Pick<SimulationResult, "backtestSummary" | "signals24h" | "signals7d" | "signals30d" | "selfAnalysis" | "evolutionPrompt" | "evolutionPercentage" | "realMoneySuccessProbability" | "backtestStrengths" | "backtestWeaknesses" | "versionId" | "dateGenerated">;
export type PresentDayAnalysisResult = Pick<SimulationResult, "macroContext" | "presentDayBuySignals" | "presentDaySellSignals" | "presentDayStrengths" | "presentDayWeaknesses" | "institutionalAssets" | "perfectionNotification">;

export interface ChartAnalysisRecommendation {
  tipo: 'COMPRA' | 'VENDA' | 'LONG' | 'SHORT' | 'NEUTRO';
  precoEntrada: number;
  stopLoss: number;
  takeProfit: number;
  confiancaPercentual: number;
  entryDatetime?: string;
  exitDatetime?: string;
}

export interface IndicatorStatus {
    name: string;
    status: 'bullish' | 'bearish' | 'neutral';
    summary: string;
}

export interface ChartAnalysisResult {
  assetIdentification: string;
  timeframe: string;
  globalSignal: 'bullish' | 'bearish' | 'neutral';
  justificativaTecnica: string;
  justificativaEsoterica?: string;
  recomendacao: ChartAnalysisRecommendation;
  strongPoints?: string[];
  weakPoints?: string[];
  specialModes?: string[];
}


export interface ActionItem {
  title: string;
  points: string[];
}

export interface ForgeActionPlan {
  introduction: string;
  technicalNote: string;
  actionItems: ActionItem[];
  disclaimer: string;
}

export interface AuditReport {
  successRate: number; // Percentage value
  totalNetProfit: number; // USD value
  totalNetProfitPercentage: number;
  errorDiagnosis: string; // Detailed text
  robustnessConclusion: 'Satisfatório' | 'Insatisfatório';
  positiveExamples: string[]; // Array of short descriptions
  negativeExamples: string[]; // Array of short descriptions
}

export interface LivePrices {
    [key:string]: string | null;
}