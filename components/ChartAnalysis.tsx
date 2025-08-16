

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { apiClient } from '../services/api/bootstrap.ts';
import { ChartAnalysisResult, ChartAnalysisRecommendation } from '../types.ts';
import { formatCurrency, formatPercentage } from '../utils/formatters.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { translations } from '../utils/translations.ts';
import AnimatedDropzoneIcon from './AnimatedDropzoneIcon.tsx';
import CopyIcon from './CopyIcon.tsx';
import CheckIcon from './CheckIcon.tsx';
import ChevronDownIcon from './ChevronDownIcon.tsx';
import ShieldIcon from './ShieldIcon.tsx';
import InfoTooltip from './InfoTooltip.tsx';
import VisualIndicator from './VisualIndicator.tsx';
import SparklesIcon from './SparklesIcon.tsx';

// Icons
const BuyIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>);
const SellIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>);
const ErrorInfoIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>);
const RocketIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>);


const ImageDropZone: React.FC<{
    image: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    isLoading: boolean;
    isDisabled?: boolean;
}> = ({ image, onFileChange, fileInputRef, isLoading, isDisabled }) => {
    const { language } = useLanguage();
    const t = translations[language];

    const handleWrapper = (handler: (e: any) => void) => (e: any) => {
        if (isDisabled || isLoading) {
            e.preventDefault();
            return;
        }
        handler(e);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (isDisabled || isLoading) return;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const syntheticEvent = {
                target: { files: e.dataTransfer.files },
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            onFileChange(syntheticEvent);
        }
    }
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isDisabled || isLoading) return;
        if(e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
    }
    
    return (
        <div
            onClick={handleWrapper(() => fileInputRef.current?.click())}
            onDrop={handleDrop}
            onDragOver={handleWrapper(e => e.preventDefault())}
            onKeyDown={handleKeyDown}
            tabIndex={isDisabled || isLoading ? -1 : 0}
            className={`relative block w-full h-full rounded-2xl border-2 border-dashed p-4 text-center transition-colors 
                ${isDisabled ? 'border-border/30 bg-background/30 cursor-not-allowed' : 'border-border hover:border-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary'}`}
            aria-disabled={isDisabled}
        >
            <input type="file" ref={fileInputRef} onChange={handleWrapper(onFileChange)} accept="image/*" className="sr-only" disabled={isDisabled || isLoading} />
            
            {image ? (
                <div className="relative h-full">
                    <img src={image} alt={t.chartAnalysisTitle} className={`rounded-lg w-full h-full object-contain ${isLoading ? 'opacity-30' : ''}`} />
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-lg font-semibold text-text animate-pulse">{t.analyzingImage}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className={`p-8 flex flex-col items-center justify-center h-full ${isDisabled ? 'opacity-50' : ''}`}>
                    <AnimatedDropzoneIcon className="mx-auto h-20 w-20 text-text-secondary" />
                    <span className="mt-4 block font-semibold text-text">{t.pasteOrSelect}</span>
                    <span className="mt-1 block text-sm text-text-secondary">{t.waitingForChartSubtitle}</span>
                </div>
            )}
        </div>
    );
};

const Accordion: React.FC<{ title: string; children: React.ReactNode; isAvailable: boolean }> = ({ title, children, isAvailable }) => {
    if (!isAvailable) return null;

    return (
        <details className="group bg-background/30 rounded-lg border border-border/30 transition-all duration-300 open:bg-background/50 open:border-primary/30">
            <summary className="cursor-pointer list-none flex items-center justify-between text-text-secondary hover:text-white p-3 font-semibold transition-colors">
                <span className="font-bold text-sm text-white">{title}</span>
                <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="border-t border-border/30 px-3 pb-3">
                <div className="mt-2 text-sm text-text-secondary max-h-48 overflow-y-auto pr-2 border-l-2 border-blue-500/30 pl-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-surface">
                    {children}
                </div>
            </div>
        </details>
    );
};

const AnalysisResultPanel: React.FC<{ result: ChartAnalysisResult }> = ({ result }) => {
    const { language } = useLanguage();
    const t = translations[language];
    const [isCopied, setIsCopied] = useState(false);

    const { recomendacao, assetIdentification, globalSignal, timeframe } = result;
    const isNeutral = recomendacao.tipo === 'NEUTRO';
    const isBuySignal = ['COMPRA', 'LONG'].includes(recomendacao.tipo);
    
    const signalConfig = useMemo(() => ({
        COMPRA: { icon: <BuyIcon />, badgeClass: 'bg-success/20 text-success', label: t.buy },
        LONG: { icon: <BuyIcon />, badgeClass: 'bg-success/20 text-success', label: t.long },
        VENDA: { icon: <SellIcon />, badgeClass: 'bg-danger/20 text-danger', label: t.sell },
        SHORT: { icon: <SellIcon />, badgeClass: 'bg-danger/20 text-danger', label: t.short },
        NEUTRO: { icon: <ShieldIcon />, badgeClass: 'bg-blue-500/20 text-blue-400', label: t.neutral }
    }), [t]);

    const currentConfig = signalConfig[recomendacao.tipo] || signalConfig.NEUTRO;
    
    const handleCopySetup = useCallback(() => {
        const setupText = `
Ativo: ${assetIdentification || 'N/A'}
Sinal: ${recomendacao.tipo}
Entrada: ${recomendacao.precoEntrada ? formatCurrency(recomendacao.precoEntrada) : 'N/A'}
Alvo: ${recomendacao.takeProfit ? formatCurrency(recomendacao.takeProfit) : 'N/A'}
Stop: ${recomendacao.stopLoss ? formatCurrency(recomendacao.stopLoss) : 'N/A'}
Confiança: ${recomendacao.confiancaPercentual || 'N/A'}%
        `.trim();
        navigator.clipboard.writeText(setupText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }, [assetIdentification, recomendacao]);

    const riskRewardRatio = useMemo(() => {
        if (isNeutral || !recomendacao.precoEntrada || !recomendacao.takeProfit || !recomendacao.stopLoss) return null;
        const potentialLoss = Math.abs(recomendacao.precoEntrada - recomendacao.stopLoss);
        if (potentialLoss === 0) return null;
        const potentialProfit = Math.abs(recomendacao.takeProfit - recomendacao.precoEntrada);
        const ratio = potentialProfit / potentialLoss;
        return ratio.toFixed(2);
    }, [recomendacao, isNeutral]);

    const estimatedROI = useMemo(() => {
        if (isNeutral || !recomendacao.precoEntrada || !recomendacao.takeProfit) return 0;
        if (recomendacao.precoEntrada === 0) return 0;
        return isBuySignal 
            ? (recomendacao.takeProfit - recomendacao.precoEntrada) / recomendacao.precoEntrada * 100 
            : (recomendacao.precoEntrada - recomendacao.takeProfit) / recomendacao.precoEntrada * 100;
    }, [recomendacao, isNeutral, isBuySignal]);
    
    const roiColor = estimatedROI >= 0 ? 'text-success' : 'text-danger';
    
    return (
        <div className="bg-surface/50 border border-border/70 rounded-2xl p-6 shadow-lg h-full flex flex-col">
            <div className="flex justify-between items-start mb-1">
                <h4 className="text-2xl font-bold text-white">{assetIdentification || "N/A"}</h4>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${currentConfig.badgeClass}`}>
                    {currentConfig.icon}
                    <span>{currentConfig.label.toUpperCase()}</span>
                </div>
            </div>
            <p className="text-sm text-text-secondary mb-4">
                {timeframe || "N/A"}
            </p>

            {!isNeutral && (
                <div className="bg-background/30 p-4 rounded-lg border border-border/50 mb-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <InfoTooltip text={t.tooltipEntryPrice}><div className="text-text-secondary">{t.entryPrice}:</div></InfoTooltip>
                        <div className="text-white font-semibold text-right">{recomendacao.precoEntrada ? formatCurrency(recomendacao.precoEntrada) : 'N/A'}</div>
                        
                        <InfoTooltip text={t.tooltipTarget}><div className="text-text-secondary">{t.target}:</div></InfoTooltip>
                        <div className="text-green-400 font-semibold text-right">{recomendacao.takeProfit ? formatCurrency(recomendacao.takeProfit) : 'N/A'}</div>

                        <InfoTooltip text={t.tooltipStopLoss}><div className="text-text-secondary">{t.stopLoss}:</div></InfoTooltip>
                        <div className="text-red-400 font-semibold text-right">{recomendacao.stopLoss ? formatCurrency(recomendacao.stopLoss) : 'N/A'}</div>
                    </div>
                     <div className="border-t border-border/50 my-3"></div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <InfoTooltip text={t.tooltipProbability}><div className="text-text-secondary">{t.confidence}:</div></InfoTooltip>
                        {typeof recomendacao.confiancaPercentual === 'number' ? <VisualIndicator percentage={recomendacao.confiancaPercentual} /> : <div className="text-text-secondary text-right">N/A</div>}

                        <InfoTooltip text={t.tooltipRoi}><div className="text-text-secondary">{t.estimatedProfit}:</div></InfoTooltip>
                        <div className={`${roiColor} font-semibold text-right`}>{typeof estimatedROI === 'number' ? formatPercentage(estimatedROI) : 'N/A'}</div>
                        
                        <InfoTooltip text={t.tooltipRiskReward}><div className="text-text-secondary">{t.riskReward}:</div></InfoTooltip>
                        <div className="text-white font-semibold text-right">{riskRewardRatio ? `1 : ${riskRewardRatio}` : 'N/A'}</div>
                    </div>
                </div>
            )}
            
            <div className="flex-grow space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-surface">
                <Accordion title={t.technicalJustification} isAvailable={!!result.justificativaTecnica}>
                    <p className="whitespace-pre-wrap">{result.justificativaTecnica}</p>
                </Accordion>
                
                <Accordion title={t.esotericJustification} isAvailable={!!result.justificativaEsoterica}>
                    <p className="whitespace-pre-wrap">{result.justificativaEsoterica}</p>
                </Accordion>
                
                <Accordion title={t.tradeRationaleTitle} isAvailable={!!(result.strongPoints?.length || result.weakPoints?.length || result.specialModes?.length)}>
                     {result.strongPoints && result.strongPoints.length > 0 && (
                        <div>
                            <h6 className="font-bold text-green-400">{t.strongPoints}</h6>
                            <ul className="list-disc list-inside text-text-secondary pl-2 text-xs">
                                {result.strongPoints.map((point, i) => <li key={`strong-${i}`}>{point}</li>)}
                            </ul>
                        </div>
                    )}
                    {result.weakPoints && result.weakPoints.length > 0 && (
                         <div className="mt-2">
                            <h6 className="font-bold text-red-400">{t.weakPoints}</h6>
                            <ul className="list-disc list-inside text-text-secondary pl-2 text-xs">
                                {result.weakPoints.map((point, i) => <li key={`weak-${i}`}>{point}</li>)}
                            </ul>
                        </div>
                    )}
                    {result.specialModes && result.specialModes.length > 0 && (
                         <div className="mt-2">
                            <h6 className="font-bold text-yellow-400">{t.specialModes}</h6>
                            <ul className="list-disc list-inside text-text-secondary pl-2 text-xs">
                                {result.specialModes.map((mode, i) => <li key={`mode-${i}`}>{mode}</li>)}
                            </ul>
                        </div>
                    )}
                </Accordion>
            </div>

            <div className="mt-auto pt-4">
                <button onClick={handleCopySetup} disabled={isCopied} className="w-full flex items-center justify-center gap-2 text-base font-bold bg-secondary/80 text-white px-4 py-3 rounded-lg shadow-md hover:bg-secondary transition-all duration-200 disabled:bg-primary disabled:cursor-default">
                    {isCopied ? <CheckIcon className="h-5 w-5" /> : <CopyIcon className="h-5 w-5" />}
                    {isCopied ? t.setupCopied : t.copySetup}
                </button>
            </div>
        </div>
    );
};

const ChartAnalysis: React.FC = () => {
    const [image, setImage] = useState<string | null>(null);
    const [result, setResult] = useState<ChartAnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [toastError, setToastError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { language } = useLanguage();
    const t = translations[language];

    useEffect(() => {
        if(toastError) {
            const timer = setTimeout(() => setToastError(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toastError]);

    const analyzeImage = useCallback(async (file: File) => {
        setIsLoading(true);
        setToastError(null);
        setResult(null);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
                const analysisResult = await apiClient.analyzeChartImage(base64, file.type, language);
                setResult(analysisResult);
            } catch (e: any) {
                setToastError(e.message || t.analysisFailed);
                setImage(null);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsDataURL(file);
    }, [language, t.analysisFailed]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(URL.createObjectURL(file));
            analyzeImage(file);
        }
    }, [analyzeImage]);

    const handlePaste = useCallback(async (e: ClipboardEvent) => {
        if(isLoading) return;
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image')) {
                const file = item.getAsFile();
                if (file) {
                    setImage(URL.createObjectURL(file));
                    analyzeImage(file);
                    break;
                }
            }
        }
    }, [analyzeImage, isLoading]);

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [handlePaste]);
    
    return (
        <>
            {toastError && (
                <div className="fixed bottom-16 right-5 bg-danger text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pulse">
                    <ErrorInfoIcon className="h-5 w-5" />
                    <span>{toastError}</span>
                </div>
            )}
            <div className="bg-gradient-to-br from-surface to-background/50 border border-border/70 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center mb-6">
                     <div className="bg-primary/10 p-2 rounded-full">
                        <SparklesIcon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-text ml-4">{t.chartAnalysisTitle}</h3>
                </div>
                
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px] lg:min-h-[700px]">
                    <ImageDropZone
                        image={image}
                        onFileChange={handleFileChange}
                        fileInputRef={fileInputRef}
                        isLoading={isLoading}
                        isDisabled={isLoading}
                    />
                    
                    {result && !isLoading ? (
                        <AnalysisResultPanel result={result} />
                    ) : isLoading ? (
                        <div className="flex flex-col items-center justify-center bg-background/30 rounded-2xl p-8 border border-border/30 animate-pulse">
                            <div className="h-16 w-16 bg-border rounded-full mb-4"></div>
                            <div className="h-6 w-3/4 bg-border rounded-md mb-2"></div>
                            <div className="h-4 w-full bg-border rounded-md"></div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center bg-background/30 rounded-2xl p-8 border border-border/30">
                            <RocketIcon className="w-16 h-16 text-text-secondary opacity-50 mb-4" />
                            <h4 className="font-bold text-lg text-white">{t.waitingForChartTitle}</h4>
                            <p className="text-text-secondary text-center">{t.waitingForChartSubtitle}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ChartAnalysis;