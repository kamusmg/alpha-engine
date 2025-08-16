





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
  livePriceSource?: string;

  // New fields for per-signal analysis
  strongPoints?: string[];
  weakPoints?: string[];
  specialModes?: string[];
  checklistResult?: ChecklistResult;
  
  // New fields from Gating
  rrGatePassed?: boolean;
  roiGatePassed?: boolean;
  minRoiRequired?: number;
  reasons?: string[];
  entryWindow?: string;
  exitWindow?: string;
  
  // --- NOVOS CAMPOS INSPIRADOS NA TOKEN METRICS ---
  grade: 'A' | 'B' | 'C' | 'D' | 'F'; // Nota geral do ativo
  fundamentalAnalysis: {
    technologyScore: number; // 0-100
    teamScore: number; // 0-100
    tokenomicsScore: number; // 0-100
    developerActivityScore: number; // 0-100
    summary: string; // Resumo da análise fundamentalista
  };
  historicalAccuracy: number; // 0-100, % de acerto das previsões passadas da IA para este ativo

  // --- NOVO PILAR 2: INTELIGÊNCIA ON-CHAIN (DA INTOTHEBLOCK) ---
  onChainIntelligence: {
    alerts: string[]; // Ex: ["Aumento de Influxo de Baleias", "Concentração de Holders em Alta"]
    summary: string; // Um resumo explicando como esses alertas impactam o sinal.
  };

  // --- NOVO PILAR 3: CONFIGURAÇÃO DE AUTOMAÇÃO (DA 3COMMAS) ---
  automationSetup: {
    recommendedBot: 'DCA' | 'Grid' | 'Nenhum';
    justification: string; // Por que este bot foi recomendado (ex: "Ideal para volatilidade")
    parameters: {
      // Parâmetros para um bot de DCA
      baseOrderSize?: string; // ex: "10 USDT"
      safetyOrderSize?: string; // ex: "20 USDT"
      priceDeviation?: string; // ex: "1.5%"
      safetyOrderSteps?: number;
      // Parâmetros para um bot de Grid
      upperPrice?: string;
      lowerPrice?: string;
      gridLevels?: number;
      investmentPerLevel?: string;
    }
  };

  // --- NOVA ABORDAGEM OTIMIZADA ---
  isTopSignal: boolean; // Será 'true' para a melhor oportunidade do dia, 'false' para as outras.
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

  // --- NOVOS CAMPOS INSPIRADOS NA TOKEN METRICS ---
  grade: 'A' | 'B' | 'C' | 'D' | 'F'; // Nota geral do ativo
  fundamentalAnalysis: {
    technologyScore: number; // 0-100
    teamScore: number; // 0-100
    tokenomicsScore: number; // 0-100
    developerActivityScore: number; // 0-100
    summary: string; // Resumo da análise fundamentalista
  };
  historicalAccuracy: number; // 0-100, % de acerto das previsões passadas da IA para este ativo
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

// --- New types for Checklist Service ---
export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChecklistResult {
  atende_criterios: boolean;
  pontuacao: number; // Score out of 10
  motivos: string[];
}

// --- New types for Multi-timeframe Analysis ---
export type Timeframe = '15m' | '1h' | '4h';

export interface MultiTimeframeData {
    '15m': Candle[];
    '1h': Candle[];
    '4h': Candle[];
}

export interface MultiTimeframeResult {
    direcao_confirmada: 'LONG' | 'SHORT' | 'NEUTRO';
    probabilidade: number; // 0.0 to 1.0
    detalhes: {
        '15m': string;
        '1h': string;
        '4h': string;
    };
}

// --- New types for VAF ---
export interface Position {
    side: 'BUY' | 'SELL';
    entryPrice: number;
}

export interface VAFIndicators {
    rsi6: number;
    ma7: number;
    ma25: number;
    volume: number;
    mediaVolume10: number;
}

export interface VAFResult {
    encerrar: boolean;
    motivo?: string;
}

// --- New types for Multi-TF Projection ---
export interface ProjecaoCandleResult {
    direcao: 'LONG' | 'SHORT' | 'NEUTRO';
    prob: number; // Probability 0.0 to 1.0
}

export interface ProjecaoMultiTFResult {
    direcao: 'LONG' | 'SHORT' | 'AGUARDAR';
    confirmado: boolean;
    probabilidade?: number; // The average probability if confirmed
}

// --- New types for Correlation Filter ---
export interface CorrelacaoResult {
    permitido: boolean;
    motivo?: string;
}

// --- New types for History and Ranking ---
export interface SinalHistorico {
    dataHora: string; // ISO 8601 format
    par: string; // e.g., 'BTC/USDT'
    precoEntrada: number;
    precoSaida: number;
    motivoSetup: string;
    resultadoLucro: number; // Profit or loss value
    setupUsado: string; // Name of the strategy/setup
}

export interface RankingSetup {
    setup: string;
    lucroTotal: number;
}

// --- New type for Gating result ---
export interface GatedSignalResult {
    symbol: string;
    horizon: Horizon;
    signalType: 'COMPRA' | 'VENDA' | 'NEUTRO';
    recommendedPositionSize: 'Máximo' | 'Médio' | 'Mínimo' | 'Não Operar';
    finalConfidenceScore: number;
    rrGatePassed: boolean;
    roiGatePassed: boolean;
    minRoiRequired: number;
    reasons: string[];
    probability: string;
    entryDatetime: string;
    exitDatetime: string;
    entryWindow: string;
    exitWindow: string;
    passedValidations: string[];
    postEntryMonitoringLog: string[];
}

// --- New type for Tactical Research Export ---
export interface TacticalIdea {
  title: string;
  symbol: string;
  thesis: string;
  triggers: string[];
  invalidations: string[];
  checklist: string[];
  rrTarget: number;
  horizon: '24h' | '7d' | '30d' | '1a';
  mode: 'explore' | 'exploit';
  owner?: string;
}

// --- New type for Meme Coin Watchlist ---
export interface MemeCoinSignal {
  symbol: string;
  name: string;
  signalType: 'BUY' | 'HOLD';
  shortThesis: string;
  potential: 'High' | 'Very High' | 'Extreme';
  risk: 'High' | 'Very High' | 'Extreme';
}

// --- New types for Performance Panel (Phase 1) ---
export interface CompletedTrade {
  id: string; // Unique ID, e.g., `${assetName}-${entryDatetime}`
  assetName: string;
  signalType: 'COMPRA' | 'VENDA';
  entryDatetime: string;
  exitDatetime: string;
  entryPrice: number;
  exitPrice: number | null; // Can be null if price fetch fails
  target: string;
  stopLoss: string;
  outcome: 'Win' | 'Loss' | 'Breakeven' | 'Processing' | 'Error';
  actualProfitUsd: number;
  actualRoiPercentage: number;
  status: 'Closed' | 'Error';
}

export interface PerformanceMetrics {
  winRate: number;
  profitFactor: number | null; // Can be null if no losses
  totalNetProfit: number;
  averageRoi: number;
  totalTrades: number;
  wins: number;
  losses: number;
}

// --- New types for Sentiment Analysis (Phase 3) ---
export interface SentimentAnalysis {
  assetTicker: string;
  sentimentScore: number; // 0-100, where 0 is very bearish, 50 is neutral, 100 is very bullish
  sentimentLabel: 'Muito Baixista' | 'Baixista' | 'Neutro' | 'Altista' | 'Muito Altista' | 'Very Bearish' | 'Bearish' | 'Neutral' | 'Bullish' | 'Very Bullish';
  dominantNarratives: string[]; // e.g., ["AI Tokens", "Real World Assets (RWA)"]
  summary: string;
}
