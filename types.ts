

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
  confidenceLevel: 'Baixo' | 'Médio' | 'Alto';
  profitProjectionUsd: number;
  roiProjectionPercentage: number;
  strategy: string;
  entryDatetime: string;
  exitDatetime: string;
  ivlPercentage?: number;
}

export interface MacroIndicator {
  name: string;
  value: string;
  interpretation: string;
  status: 'critical' | 'warning' | 'neutral' | 'good';
}

export interface MajorAssetAnalysis {
  analysisText: string;
  strategy: 'LONG' | 'SHORT' | 'NEUTRO';
  entryPoint: string;
  target: string;
  stopLoss: string;
  probability: string;
  entryDatetime: string;
  exitDatetime: string;
}

export interface MajorAssetSummary {
  [key: string]: MajorAssetAnalysis; // e.g. { "BTC": { ... }, "ETH": { ... } }
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
  majorAssetAnalysis: MajorAssetSummary;
  perfectionNotification?: string;
  evolutionPercentage: number;
  realMoneySuccessProbability: number;
  backtestStrengths: string;
  backtestWeaknesses: string;
  presentDayStrengths: string;
  presentDayWeaknesses: string;
}

export interface ChartAnalysisResult {
  assetIdentification: string;
  timeframe: string;
  pattern: string;
  strategy: 'LONG' | 'SHORT';
  entryPoint: string;
  targetPoint: string;
  stopLoss: string;
  technicalJustification: string;
  esotericJustification: string;
  probability: string;
  entryDatetime: string;
  exitDatetime: string;
  confidence: 'Baixo' | 'Médio' | 'Alto';
  profitProjectionUsd: number;
  roiProjectionPercentage: number;
  chartTimestamp: string;
  timestampSource: 'OCR' | 'Pesquisa' | 'Upload' | 'Indeterminado';
}

export interface TradeOutcomeResult {
    status: 'SUCESSO' | 'FALHA' | 'EM ANDAMENTO';
    closingPrice: string;
    diagnostic: string;
    profit: number;
    roiPercentage: number;
    chartTimestamp: string;
    timestampSource: 'OCR' | 'Pesquisa' | 'Upload' | 'Indeterminado';
}

export interface ShortTermTradeFeedback {
    analysis: ChartAnalysisResult;
    outcome: TradeOutcomeResult;
}

export interface QuickAnalysisSignal {
  horizon: Horizon;
  signalType: 'COMPRA' | 'VENDA' | 'NEUTRO';
  justification: string;
  confidenceLevel: 'Baixo' | 'Médio' | 'Alto';
  profitProjectionUsd: number;
  roiProjectionPercentage: number;
  stopLoss: string;
  projectedLossUsd: number;
  projectedLossRoiPercentage: number;
  ivlPercentage?: number;
}

export type QuickAnalysisResult = QuickAnalysisSignal[];

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
  errorDiagnosis: string; // Detailed text
  robustnessConclusion: 'Satisfatório' | 'Insatisfatório';
  positiveExamples: string[]; // Array of short descriptions
  negativeExamples: string[]; // Array of short descriptions
}
