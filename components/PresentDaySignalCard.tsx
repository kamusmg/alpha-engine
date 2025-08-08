
import React, { useState, useCallback, useMemo } from 'react';
import { PresentDayAssetSignal } from '../types';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import AnalysisCard from './AnalysisCard';
import GoIcon from './GoIcon';
import CautionIcon from './CautionIcon';
import { useData } from '../contexts/DataContext';
import { fetchNewSignal } from '../services/geminiService';
import PresentDaySignalCardSkeleton from './skeletons/PresentDaySignalCardSkeleton';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import ChevronDownIcon from './ChevronDownIcon';
import InfoTooltip from './InfoTooltip';
import VisualIndicator from './VisualIndicator';
import RotateCwIcon from './RotateCwIcon';
import CopyIcon from './CopyIcon';
import CheckIcon from './CheckIcon';


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

const confidenceColorMap: { [key: string]: string } = {
    'Alto': 'bg-green-500',
    'High': 'bg-green-500',
    'Médio': 'bg-yellow-500 text-black',
    'Medium': 'bg-yellow-500 text-black',
    'Baixo': 'bg-red-500',
    'Low': 'bg-red-500',
};


export const SignalBlock: React.FC<{
    signal: PresentDayAssetSignal;
    type?: 'buy' | 'sell';
    index?: number;
    onReroll?: (type: 'buy' | 'sell', index: number) => void;
    isRerolling?: boolean;
    rerollError?: string | null;
    showProminentProfit?: boolean;
    isTacticalSearch?: boolean;
}> = ({signal, type, index, onReroll, isRerolling = false, rerollError = null, showProminentProfit = false, isTacticalSearch = false}) => {
    const { language } = useLanguage();
    const t = translations[language];
    const [isCopied, setIsCopied] = useState(false);
    
    const confidenceClasses = confidenceColorMap[signal.confidenceLevel] || 'bg-gray-500';
    const isProjectedProfit = signal.profitProjectionUsd > 0;
    const profitColor = isProjectedProfit ? 'text-success' : 'text-danger';
    const profitLabel = t[signal.signalType === 'VENDA' ? 'profitOnFall' : 'estimatedProfit'];
    
    const isHighConfidence = signal.confidenceLevel === 'Alto' || signal.confidenceLevel === 'High';

    const riskRewardRatio = useMemo(() => {
        try {
            const entryValue = parseFloat(signal.entryRange.split('-')[0].trim());
            const targetValue = parseFloat(signal.target);
            const stopLossValue = parseFloat(signal.stopLoss);

            if (isNaN(entryValue) || isNaN(targetValue) || isNaN(stopLossValue)) return null;
            
            const potentialLoss = Math.abs(entryValue - stopLossValue);
            if (potentialLoss === 0) return null;

            const potentialProfit = Math.abs(targetValue - entryValue);
            const ratio = potentialProfit / potentialLoss;
            return ratio.toFixed(2);
        } catch {
            return null;
        }
    }, [signal.entryRange, signal.target, signal.stopLoss]);

    const handleCopySetup = useCallback(() => {
        const setupText = `
Ativo: ${signal.assetName}
Sinal: ${signal.signalType}
Entrada: ${signal.entryRange}
Alvo: ${signal.target}
Stop: ${signal.stopLoss}
Confiança: ${signal.probability}
Risco/Retorno: ${riskRewardRatio ? `1:${riskRewardRatio}` : 'N/A'}
Horizonte: ${signal.horizon}
        `.trim();
        navigator.clipboard.writeText(setupText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }, [signal, riskRewardRatio]);

    const Justifications = () => (
        <details className="group bg-background/30 rounded-lg border border-border/30 transition-all duration-300 open:bg-background/50 open:border-primary/30">
            <summary className="cursor-pointer list-none flex items-center justify-between text-text-secondary hover:text-white p-2 font-semibold transition-colors">
                <span className="text-xs font-bold uppercase tracking-wider">{t.justifications}</span>
                <ChevronDownIcon className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="border-t border-border/30 p-2 space-y-4">
                 <AnalysisCard 
                    title={t.technicalJustification}
                    content={signal.technicalJustification}
                    type="technical"
                    size="sm"
                />
                <AnalysisCard 
                    title={t.esotericJustification}
                    content={signal.esotericJustification}
                    type="esoteric"
                    size="sm"
                />
            </div>
        </details>
    );

    if (rerollError) {
        return (
             <div className="bg-danger/20 rounded-lg p-4 flex flex-col h-full border border-danger/50 backdrop-blur-sm items-center justify-center text-center">
                 <ErrorIcon className="h-8 w-8 text-danger" />
                 <p className="text-danger text-sm mt-2 font-semibold">{rerollError}</p>
                 <p className="text-red-400 text-xs mt-1">{t.tryAgain}</p>
            </div>
        )
    }

    if (isRerolling) {
        return (
            <div className="bg-background/50 rounded-lg p-4 flex flex-col h-full border border-primary/50 backdrop-blur-sm items-center justify-center">
                 <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-primary text-xs mt-2 animate-pulse">{t.rerolling}</p>
            </div>
        )
    }
    
    const probabilityValue = parseFloat(signal.probability.replace('%',''));

    return (
        <div className={`bg-background/50 rounded-xl p-4 flex flex-col border border-border/50 backdrop-blur-sm transition-all duration-300 hover:shadow-primary/20 hover:border-primary/40 ${isHighConfidence ? 'animate-strong-pulse hover:animate-none' : ''}`}>
            <div className="flex-grow">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary`}>
                            {signal.horizon}
                        </span>
                         <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${confidenceClasses} text-white`}>
                            {t.confidence}: {signal.confidenceLevel}
                        </span>
                    </div>
                     {onReroll && type && index !== undefined && (
                        <button 
                            onClick={() => onReroll(type, index)}
                            disabled={isRerolling}
                            className="flex-shrink-0 bg-primary/20 text-primary p-1.5 rounded-full hover:bg-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t.rerollButtonTitle}
                            aria-label={t.rerollButtonTitle}
                        >
                           <RotateCwIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <h5 className="text-lg font-bold text-white tracking-tight mb-2">{signal.assetName}</h5>
                
                <div className="bg-background/50 rounded-md p-2 mb-4 border border-border/30 text-center text-xs">
                    <div className="text-text-secondary uppercase">{t.livePriceSource}</div>
                    {signal.livePrice ? (
                         <div className="flex items-center justify-center gap-2">
                             <span className="relative flex h-2 w-2 mt-1">
                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                 <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                             </span>
                             <p className="text-lg font-bold text-white">{formatCurrency(parseFloat(signal.livePrice))}</p>
                        </div>
                    ) : (
                        <p className="text-sm font-semibold text-yellow-400 mt-1">N/A</p>
                    )}
                </div>

                <div className="space-y-4 text-xs mb-4">
                    <Justifications />
                </div>
                
                {(signal.strongPoints?.length > 0 || signal.weakPoints?.length > 0 || signal.specialModes?.length > 0) && (
                    <div className="space-y-2 text-xs mb-4 p-3 bg-background/50 rounded-md border border-border/30">
                        {signal.strongPoints && signal.strongPoints.length > 0 && (
                            <div>
                                <h6 className="font-bold text-green-400">{t.strongPoints}</h6>
                                <ul className="list-disc list-inside text-text-secondary pl-2">
                                    {signal.strongPoints.map((point, i) => <li key={`strong-${i}`}>{point}</li>)}
                                </ul>
                            </div>
                        )}
                        {signal.weakPoints && signal.weakPoints.length > 0 && (
                             <div className="mt-2">
                                <h6 className="font-bold text-red-400">{t.weakPoints}</h6>
                                <ul className="list-disc list-inside text-text-secondary pl-2">
                                    {signal.weakPoints.map((point, i) => <li key={`weak-${i}`}>{point}</li>)}
                                </ul>
                            </div>
                        )}
                        {signal.specialModes && signal.specialModes.length > 0 && (
                             <div className="mt-2">
                                <h6 className="font-bold text-yellow-400">{t.specialModes}</h6>
                                <ul className="list-disc list-inside text-text-secondary pl-2">
                                    {signal.specialModes.map((mode, i) => <li key={`mode-${i}`}>{mode}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 mt-auto pt-4 border-t border-border/30 space-y-3">
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <InfoTooltip text={t.tooltipEntryPrice}><div className="text-text-secondary">{t.entryPrice}:</div></InfoTooltip>
                    <div className="text-white font-semibold text-right">{signal.entryRange}</div>
                    
                    <InfoTooltip text={t.tooltipProbability}><div className="text-text-secondary">{t.probability}:</div></InfoTooltip>
                    <VisualIndicator percentage={probabilityValue} />
                    
                    {signal.ivlPercentage !== undefined && (
                        <>
                            <InfoTooltip text={t.tooltipIvl}><div className="text-text-secondary">{t.ivl}:</div></InfoTooltip>
                            <VisualIndicator percentage={signal.ivlPercentage} />
                        </>
                    )}

                    <InfoTooltip text={t.tooltipTarget}><div className="text-text-secondary">{t.target}:</div></InfoTooltip>
                    <div className="text-green-400 font-semibold text-right">{signal.target}</div>

                    <InfoTooltip text={t.tooltipStopLoss}><div className="text-text-secondary">{t.stopLoss}:</div></InfoTooltip>
                    <div className="text-red-400 font-semibold text-right">{signal.stopLoss}</div>

                    {riskRewardRatio && (
                        <>
                            <InfoTooltip text={t.tooltipRiskReward}><div className="text-text-secondary">{t.riskReward}:</div></InfoTooltip>
                            <div className="text-white font-semibold text-right">1 : {riskRewardRatio}</div>
                        </>
                    )}
                    
                    <div className="text-text-secondary col-span-2 my-1 border-t border-border/30"></div>

                    <div className="text-text-secondary">{t.strategy}:</div>
                    <div className="text-white font-semibold text-right">{signal.strategy}</div>

                    <div className="text-text-secondary">{t.entryDate}:</div>
                    <div className="text-white font-semibold text-right">{signal.entryDatetime}</div>

                    <div className="text-text-secondary">{t.exitDate}:</div>
                    <div className="text-white font-semibold text-right">{signal.exitDatetime}</div>
                </div>
                 <div className="mt-3 pt-3 border-t border-border/30 text-center bg-background/30 rounded-md p-2">
                    <InfoTooltip text={t.tooltipRoi}><div className="text-xs text-text-secondary mb-1">{profitLabel} ({t.baseInvestment})</div></InfoTooltip>
                    <div className={`${showProminentProfit ? 'text-4xl' : 'text-2xl'} font-bold ${profitColor}`}>{formatCurrency(signal.profitProjectionUsd)}</div>
                    <div className={`text-sm font-semibold ${profitColor}`}>({formatPercentage(signal.roiProjectionPercentage)})</div>
                </div>
                <div className="mt-4">
                    <button 
                        onClick={handleCopySetup}
                        disabled={isCopied}
                        className="w-full flex items-center justify-center gap-2 text-sm font-bold bg-secondary/80 text-white px-3 py-2.5 rounded-lg shadow-md hover:bg-secondary transition-all duration-200 disabled:bg-primary disabled:cursor-default"
                    >
                        {isCopied ? <CheckIcon className="h-5 w-5" /> : <CopyIcon className="h-5 w-5" />}
                        {isCopied ? t.setupCopied : t.copySetup}
                    </button>
                </div>
            </div>
        </div>
    )
}


const PresentDaySignalCard: React.FC = () => {
    const { presentDayData, isInitialLoading, livePrices, updatePresentDaySignal } = useData();
    const { language } = useLanguage();
    const t = translations[language];

    const [isRerolling, setIsRerolling] = useState<Record<string, boolean>>({});
    const [rerollErrors, setRerollErrors] = useState<Record<string, string | null>>({});
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

    const handleReroll = useCallback(async (type: 'buy' | 'sell', index: number) => {
        if (!presentDayData) return;

        const key = `${type}-${index}`;
        setIsRerolling(prev => ({ ...prev, [key]: true }));
        setRerollErrors(prev => ({ ...prev, [key]: null }));

        const signals = type === 'buy' ? presentDayData.presentDayBuySignals : presentDayData.presentDaySellSignals;
        const currentSignal = signals[index];

        const allAssetNames = [
            ...presentDayData.presentDayBuySignals.map(s => s.assetName),
            ...presentDayData.presentDaySellSignals.map(s => s.assetName),
        ];

        try {
            const newSignal = await fetchNewSignal({
                signalType: currentSignal.signalType,
                horizon: currentSignal.horizon,
                excludeAssets: allAssetNames,
                livePrices: livePrices,
            });
            updatePresentDaySignal(type, index, newSignal);
        } catch (e) {
            console.error(`Failed to fetch new ${type} signal at index ${index}`, e);
            setRerollErrors(prev => ({ ...prev, [key]: t.rerollError }));
            setTimeout(() => setRerollErrors(prev => ({ ...prev, [key]: null })), 3000);
        } finally {
            setIsRerolling(prev => ({ ...prev, [key]: false }));
        }
    }, [presentDayData, livePrices, updatePresentDaySignal, t]);

    if (isInitialLoading) return <PresentDaySignalCardSkeleton />;
    if (!presentDayData) return null;

    const { presentDayBuySignals, presentDaySellSignals, presentDayStrengths, presentDayWeaknesses } = presentDayData;

    const allSignals = [...presentDayBuySignals, ...presentDaySellSignals];
    const parseProbability = (probString: string) => parseFloat(probString.replace('%', '')) || 0;
    
    const topAssets = [...allSignals]
        .sort((a, b) => parseProbability(b.probability) - parseProbability(a.probability))
        .slice(0, 3)
        .map(s => s.assetName);
        
    const dominantTrend = presentDayBuySignals.length >= presentDaySellSignals.length 
        ? t.marketUp
        : t.marketDown;

    const totalConfidence = allSignals.reduce((acc, signal) => acc + parseProbability(signal.probability), 0);
    const averageConfidence = allSignals.length > 0 ? totalConfidence / allSignals.length : 0;


  return (
    <div className="space-y-10">
        <div className="bg-surface/50 border border-border/50 rounded-lg p-6 shadow-lg">
            <h3 className="text-2xl font-bold text-primary mb-4">{t.riskAnalysisTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
                    <div className="flex-shrink-0 text-green-400 mt-1"><GoIcon className="h-6 w-6" /></div>
                    <div>
                        <h6 className="font-bold text-green-300">{t.strongPoints}</h6>
                        <p className="text-sm text-text-secondary mt-1">{presentDayStrengths}</p>
                    </div>
                </div>
                <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                    <div className="flex-shrink-0 text-red-400 mt-1"><CautionIcon className="h-6 w-6" /></div>
                    <div>
                        <h6 className="font-bold text-red-300">{t.weakPointsAndRisks}</h6>
                        <p className="text-sm text-text-secondary mt-1">{presentDayWeaknesses}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div>
            <div className="bg-surface/50 border border-border/50 rounded-lg p-6 shadow-lg mb-6">
              <h4 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <span>📊</span>
                <span>{t.daySummary}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-text-secondary font-bold uppercase tracking-wider">{t.top3Assets}</p>
                  <p className="text-lg font-semibold text-white mt-1" title={topAssets.length > 0 ? topAssets.join(', ') : t.noAssets}>
                    {topAssets.length > 0 ? topAssets.join(', ') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary font-bold uppercase tracking-wider">{t.dominantTrend}</p>
                  <p className="text-lg font-semibold text-white mt-1">{dominantTrend}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary font-bold uppercase tracking-wider">{t.avgConfidence}</p>
                  <p className="text-lg font-semibold text-white mt-1">{averageConfidence.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            <div className="flex">
                <button
                    onClick={() => setActiveTab('buy')}
                    className={`w-full text-center font-bold py-3 px-4 transition-colors duration-200 text-lg flex items-center justify-center gap-2 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-background ${
                        activeTab === 'buy'
                        ? 'bg-green-600/20 text-green-300'
                        : 'bg-surface/50 text-text-secondary hover:bg-surface'
                    }`}
                    aria-pressed={activeTab === 'buy'}
                >
                    <span>🟢 {t.buy}</span>
                </button>
                <button
                    onClick={() => setActiveTab('sell')}
                    className={`w-full text-center font-bold py-3 px-4 transition-colors duration-200 text-lg flex items-center justify-center gap-2 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-background ${
                        activeTab === 'sell'
                        ? 'bg-red-600/20 text-red-300'
                        : 'bg-surface/50 text-text-secondary hover:bg-surface'
                    }`}
                    aria-pressed={activeTab === 'sell'}
                >
                    <span>🔴 {t.sell}</span>
                </button>
            </div>

            {activeTab === 'buy' && (
                <div className="bg-gradient-to-br from-green-600/20 via-surface/50 to-surface/90 border-t-0 border border-green-500/50 rounded-b-lg p-4 md:p-6 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center mb-6 text-white">
                        <div className="bg-green-500/20 p-3 rounded-full">
                            <BuyIcon className="h-8 w-8 text-green-300" />
                        </div>
                        <h3 className="text-2xl font-bold ml-4">{t.buyOpportunities}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {presentDayBuySignals.map((signal, index) => (
                            <SignalBlock 
                                key={`buy-${index}-${signal.assetName}`} 
                                signal={signal}
                                type="buy"
                                index={index}
                                onReroll={handleReroll}
                                isRerolling={!!isRerolling[`buy-${index}`]}
                                rerollError={rerollErrors[`buy-${index}`] || null}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            {activeTab === 'sell' && (
                <div className="bg-gradient-to-br from-red-600/20 via-surface/50 to-surface/90 border-t-0 border border-red-500/50 rounded-b-lg p-4 md:p-6 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center mb-6 text-white">
                        <div className="bg-red-500/20 p-3 rounded-full">
                            <SellIcon className="h-8 w-8 text-red-300" />
                        </div>
                        <h3 className="text-2xl font-bold ml-4">{t.sellOpportunities}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {presentDaySellSignals.map((signal, index) => (
                            <SignalBlock 
                                key={`sell-${index}-${signal.assetName}`} 
                                signal={signal}
                                type="sell"
                                index={index}
                                onReroll={handleReroll}
                                isRerolling={!!isRerolling[`sell-${index}`]}
                                rerollError={rerollErrors[`sell-${index}`] || null}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default PresentDaySignalCard;
