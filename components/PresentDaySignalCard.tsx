import React from 'react';
import { PresentDayAssetSignal } from '../types';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import AnalysisCard from './AnalysisCard';
import GoIcon from './GoIcon';
import CautionIcon from './CautionIcon';


interface PresentDaySignalCardProps {
  buySignals: PresentDayAssetSignal[];
  sellSignals: PresentDayAssetSignal[];
  onReroll: (type: 'buy' | 'sell', index: number) => void;
  isRerolling: Record<string, boolean>;
  rerollErrors: Record<string, string | null>;
  strengths: string;
  weaknesses: string;
}

const BuyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
);

const SellIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
    </svg>
);

const NeutralIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const RerollIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 19v-5h-5M4 19a9 9 0 0113.3-6.4M20 5a9 9 0 01-13.3 6.4" />
    </svg>
);

const ErrorIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);


const signalTypeConfig = {
    COMPRA: {
        icon: <BuyIcon />,
        textColor: 'text-green-300'
    },
    VENDA: {
        icon: <SellIcon />,
        textColor: 'text-red-300'
    },
    NEUTRO: {
        icon: <NeutralIcon />,
        textColor: 'text-blue-300'
    },
};

const confidenceColorMap = {
    'Alto': 'bg-green-500',
    'Médio': 'bg-yellow-500 text-black',
    'Baixo': 'bg-red-500',
};

const SignalBlock: React.FC<{
    signal: PresentDayAssetSignal;
    type: 'buy' | 'sell';
    index: number;
    onReroll: (type: 'buy' | 'sell', index: number) => void;
    isRerolling: boolean;
    rerollError: string | null;
}> = ({signal, type, index, onReroll, isRerolling, rerollError}) => {
    const config = signalTypeConfig[signal.signalType] || signalTypeConfig.NEUTRO;
    const confidenceClasses = confidenceColorMap[signal.confidenceLevel] || 'bg-gray-500';
    const isProjectedProfit = signal.profitProjectionUsd > 0;
    const profitColor = isProjectedProfit ? 'text-success' : 'text-danger';
    const profitLabel = signal.signalType === 'VENDA' ? 'Lucro na Queda' : 'Lucro Estimado';


    if (rerollError) {
        return (
             <div className="bg-danger/20 rounded-lg p-4 flex flex-col h-full border border-danger/50 backdrop-blur-sm items-center justify-center text-center">
                 <ErrorIcon className="h-8 w-8 text-danger" />
                 <p className="text-danger text-sm mt-2 font-semibold">{rerollError}</p>
                 <p className="text-red-400 text-xs mt-1">Tente novamente.</p>
            </div>
        )
    }

    if (isRerolling) {
        return (
            <div className="bg-background/50 rounded-lg p-4 flex flex-col h-full border border-primary/50 backdrop-blur-sm items-center justify-center">
                 <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-primary text-xs mt-2 animate-pulse">Buscando novo ativo...</p>
            </div>
        )
    }

    return (
        <div className="bg-background/50 rounded-lg p-4 flex flex-col h-full border border-border/50 backdrop-blur-sm">
            <div className="flex-grow">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary`}>
                            {signal.horizon}
                        </span>
                         <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${confidenceClasses} text-white`}>
                            Confiança {signal.confidenceLevel}
                        </span>
                    </div>
                     <button 
                        onClick={() => onReroll(type, index)}
                        disabled={isRerolling}
                        className="flex-shrink-0 bg-primary/20 text-primary p-1.5 rounded-full hover:bg-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Trocar Moeda"
                        aria-label="Obter nova sugestão de moeda"
                    >
                       <RerollIcon className="h-4 w-4" />
                    </button>
                </div>
                <h5 className="text-lg font-bold text-white tracking-tight mb-4">{signal.assetName}</h5>
                
                <div className="space-y-4 text-xs mb-4">
                    <AnalysisCard 
                        title="Justificativa Técnica"
                        content={signal.technicalJustification}
                        type="technical"
                        size="sm"
                    />
                    <AnalysisCard 
                        title="Justificativa Esotérica"
                        content={signal.esotericJustification}
                        type="esoteric"
                        size="sm"
                    />
                </div>
            </div>

            <div className="flex-shrink-0 mt-auto pt-4 border-t border-border/30 space-y-3">
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="text-text-secondary">Entrada (Preço):</div>
                    <div className="text-white font-semibold text-right">{signal.entryRange}</div>
                    
                    <div className="text-text-secondary">Probabilidade:</div>
                    <div className="text-white font-semibold text-right">{signal.probability}</div>
                    
                    {signal.ivlPercentage !== undefined && (
                        <>
                            <div className="text-text-secondary">Índice Liquidez (IVL):</div>
                            <div className={`font-semibold text-right ${signal.ivlPercentage >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {signal.ivlPercentage.toFixed(0)}%
                            </div>
                        </>
                    )}

                    <div className="text-text-secondary">Alvo:</div>
                    <div className="text-white font-semibold text-right">{signal.target}</div>

                    <div className="text-text-secondary">Stop-Loss:</div>
                    <div className="text-white font-semibold text-right">{signal.stopLoss}</div>
                    
                    <div className="text-text-secondary col-span-2 my-1 border-t border-border/30"></div>

                    <div className="text-text-secondary">Estratégia:</div>
                    <div className="text-white font-semibold text-right">{signal.strategy}</div>

                    <div className="text-text-secondary">Entrada (Data):</div>
                    <div className="text-white font-semibold text-right">{signal.entryDatetime}</div>

                    <div className="text-text-secondary">Saída (Data):</div>
                    <div className="text-white font-semibold text-right">{signal.exitDatetime}</div>
                </div>
                 <div className="mt-3 pt-3 border-t border-border/30 text-center bg-background/30 rounded-md p-2">
                    <div className="text-xs text-text-secondary mb-1">{profitLabel} (base $100)</div>
                    <div className={`text-2xl font-bold ${profitColor}`}>{formatCurrency(signal.profitProjectionUsd)}</div>
                    <div className={`text-sm font-semibold ${profitColor}`}>({formatPercentage(signal.roiProjectionPercentage)})</div>
                </div>
            </div>
        </div>
    )
}


const PresentDaySignalCard: React.FC<PresentDaySignalCardProps> = ({ buySignals, sellSignals, onReroll, isRerolling, rerollErrors, strengths, weaknesses }) => {

  return (
    <div className="space-y-10">
        <div className="bg-surface/50 border border-border/50 rounded-lg p-6 shadow-lg">
            <h3 className="text-2xl font-bold text-primary mb-4">Análise de Risco das Operações Atuais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
                    <div className="flex-shrink-0 text-green-400 mt-1"><GoIcon className="h-6 w-6" /></div>
                    <div>
                        <h6 className="font-bold text-green-300">Pontos Fortes</h6>
                        <p className="text-sm text-text-secondary mt-1">{strengths}</p>
                    </div>
                </div>
                <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                    <div className="flex-shrink-0 text-red-400 mt-1"><CautionIcon className="h-6 w-6" /></div>
                    <div>
                        <h6 className="font-bold text-red-300">Fraquezas e Riscos</h6>
                        <p className="text-sm text-text-secondary mt-1">{weaknesses}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-600/20 via-surface/50 to-surface/90 border border-green-500/50 rounded-lg p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center mb-6 text-white">
                <div className="bg-green-500/20 p-3 rounded-full">
                    <BuyIcon className="h-8 w-8 text-green-300" />
                </div>
                <h3 className="text-2xl font-bold ml-4">Oportunidades de Compra (Long)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {buySignals.map((signal, index) => (
                    <SignalBlock 
                        key={`buy-${index}-${signal.assetName}`} 
                        signal={signal}
                        type="buy"
                        index={index}
                        onReroll={onReroll}
                        isRerolling={!!isRerolling[`buy-${index}`]}
                        rerollError={rerollErrors[`buy-${index}`] || null}
                    />
                ))}
            </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-600/20 via-surface/50 to-surface/90 border border-red-500/50 rounded-lg p-6 shadow-2xl relative overflow-hidden">
             <div className="flex items-center mb-6 text-white">
                <div className="bg-red-500/20 p-3 rounded-full">
                    <SellIcon className="h-8 w-8 text-red-300" />
                </div>
                <h3 className="text-2xl font-bold ml-4">Oportunidades de Venda (Short)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                 {sellSignals.map((signal, index) => (
                    <SignalBlock 
                        key={`sell-${index}-${signal.assetName}`} 
                        signal={signal}
                        type="sell"
                        index={index}
                        onReroll={onReroll}
                        isRerolling={!!isRerolling[`sell-${index}`]}
                        rerollError={rerollErrors[`sell-${index}`] || null}
                    />
                 ))}
            </div>
        </div>
    </div>
  );
};

export default PresentDaySignalCard;