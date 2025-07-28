import React, { useState, useCallback, useRef, useEffect } from 'react';
import { analyzeChartImage, getTradeOutcomeFromImage } from '../services/geminiService';
import { ChartAnalysisResult, TradeOutcomeResult, ShortTermTradeFeedback } from '../types';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import AnalysisCard from './AnalysisCard';
import RoiDisplay from './RoiDisplay';
import ClockIcon from './ClockIcon';

// Icons
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.5 21.75l-.398-1.178a3.375 3.375 0 00-2.456-2.456L12.5 18l1.178-.398a3.375 3.375 0 002.456-2.456L16.5 14.25l.398 1.178a3.375 3.375 0 002.456 2.456L20.5 18l-1.178.398a3.375 3.375 0 00-2.456 2.456z" /></svg>);
const ImageIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>);
const ScanIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75V3.75h6M20.25 14.25v6h-6" /></svg>);
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>);
const ArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>);

const confidenceColorMap: { [key: string]: string } = { 'Alto': 'bg-success/20 text-success', 'Médio': 'bg-yellow-500/20 text-yellow-400', 'Baixo': 'bg-danger/20 text-danger' };
const tradeOutcomeColorMap: { [key: string]: string } = { 'SUCESSO': 'bg-success/20 text-success', 'FALHA': 'bg-danger/20 text-danger', 'EM ANDAMENTO': 'bg-blue-500/20 text-blue-300' };

interface ChartAnalysisProps {
    onNewFeedback: (feedback: ShortTermTradeFeedback) => void;
}

const ImageDropZone: React.FC<{
    image: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    title: string;
    subtitle: string;
    isLoading: boolean;
    isDisabled?: boolean;
}> = ({ image, onFileChange, fileInputRef, title, subtitle, isLoading, isDisabled }) => {
    
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
            className={`relative block w-full rounded-lg border-2 border-dashed p-4 text-center transition-colors 
                ${isDisabled ? 'border-border/30 bg-background/30 cursor-not-allowed' : 'border-border hover:border-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary'}`}
            aria-disabled={isDisabled}
        >
            <input type="file" ref={fileInputRef} onChange={handleWrapper(onFileChange)} accept="image/*" className="sr-only" disabled={isDisabled || isLoading} />
            
            {image ? (
                <div className="relative">
                    <img src={image} alt={title} className={`rounded-lg w-full h-auto object-contain ${isLoading ? 'opacity-30' : ''}`} />
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 rounded-lg">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-lg font-semibold text-text animate-pulse">Analisando...</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className={`p-8 ${isDisabled ? 'opacity-50' : ''}`}>
                    <ImageIcon className="mx-auto h-12 w-12 text-text-secondary" />
                    <span className="mt-2 block text-sm font-semibold text-text">{title}</span>
                    <span className="mt-1 block text-xs text-text-secondary">{subtitle}</span>
                </div>
            )}
        </div>
    );
};


const ChartAnalysis: React.FC<ChartAnalysisProps> = ({ onNewFeedback }) => {
    const [image1, setImage1] = useState<string | null>(null);
    const [image2, setImage2] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<ChartAnalysisResult | null>(null);
    const [tradeOutcome, setTradeOutcome] = useState<TradeOutcomeResult | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
    const [isLoadingOutcome, setIsLoadingOutcome] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fileInput1Ref = useRef<HTMLInputElement>(null);
    const fileInput2Ref = useRef<HTMLInputElement>(null);
    
    const resetState = useCallback(() => {
        setImage1(null); setImage2(null); setAnalysis(null); setTradeOutcome(null); setError(null);
        setIsLoadingAnalysis(false); setIsLoadingOutcome(false);
        if (fileInput1Ref.current) fileInput1Ref.current.value = "";
        if (fileInput2Ref.current) fileInput2Ref.current.value = "";
    }, []);

    const handleFileChange = (setter: React.Dispatch<React.SetStateAction<string | null>>) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setter(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    useEffect(() => {
        const handleGlobalPaste = (event: ClipboardEvent) => {
            if (isLoadingAnalysis || isLoadingOutcome) return;

            const isWaitingForImage1 = !analysis && !image1;
            const isWaitingForImage2 = !!analysis && !image2 && !tradeOutcome;

            if (!isWaitingForImage1 && !isWaitingForImage2) return;

            const items = event.clipboardData?.items;
            if (!items) return;

            for (const item of Array.from(items)) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        event.preventDefault();
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const result = e.target?.result as string;
                            if (isWaitingForImage1) setImage1(result);
                            else if (isWaitingForImage2) setImage2(result);
                        };
                        reader.readAsDataURL(file);
                        return;
                    }
                }
            }
        };

        document.addEventListener('paste', handleGlobalPaste);
        return () => document.removeEventListener('paste', handleGlobalPaste);
    }, [analysis, image1, image2, tradeOutcome, isLoadingAnalysis, isLoadingOutcome]);


    const handleInitialAnalysis = async () => {
        if (!image1) return;
        setIsLoadingAnalysis(true); setError(null); setAnalysis(null); setTradeOutcome(null);
        try {
            const mimeType = image1.match(/data:(.*);base64,/)?.[1] || 'image/png';
            const base64Data = image1.split(',')[1];
            const result = await analyzeChartImage(base64Data, mimeType);
            setAnalysis(result);
        } catch (e: any) {
            setError(e.message || "Falha na análise. Tente novamente.");
            setImage1(null);
        } finally {
            setIsLoadingAnalysis(false);
        }
    };
    
    const handleOutcomeAnalysis = useCallback(async () => {
        if (!analysis || !image2) return;
        setIsLoadingOutcome(true);
        setError(null);
        try {
            const mimeType = image2.match(/data:(.*);base64,/)?.[1] || 'image/png';
            const base64Data = image2.split(',')[1];
            const outcomeResult = await getTradeOutcomeFromImage(analysis, base64Data, mimeType);
            setTradeOutcome(outcomeResult);
            onNewFeedback({ analysis, outcome: outcomeResult });
        } catch (e: any) {
            setError(e.message || "Falha ao obter resultado da operação.");
        } finally {
            setIsLoadingOutcome(false);
        }
    }, [analysis, image2, onNewFeedback]);
    
    useEffect(() => {
        if (image1 && !analysis && !isLoadingAnalysis) {
            handleInitialAnalysis();
        }
    }, [image1, analysis, isLoadingAnalysis]);
    
    useEffect(() => {
        if (image2 && analysis && !tradeOutcome && !isLoadingOutcome) {
            handleOutcomeAnalysis();
        }
    }, [image2, analysis, tradeOutcome, isLoadingOutcome, handleOutcomeAnalysis]);
    
    return (
        <div className="bg-gradient-to-br from-surface to-background/50 border border-border/70 rounded-xl p-6 shadow-lg relative">
            <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-2 rounded-full"><SparklesIcon className="h-8 w-8 text-primary" /></div>
                <h3 className="text-2xl font-bold text-text ml-4">Módulo de Treinamento Tático</h3>
            </div>
            
            {(image1) && ( <button onClick={resetState} className="absolute top-6 right-6 z-20 bg-surface text-text-secondary hover:text-white p-2 rounded-full transition-colors"><CloseIcon className="h-5 w-5" /></button> )}

            <div className="grid lg:grid-cols-2 gap-8 items-start">
                {/* Coluna Esquerda: Análise e Resultado */}
                <div className="w-full space-y-6">
                   <ImageDropZone
                        image={image1}
                        onFileChange={handleFileChange(setImage1)}
                        fileInputRef={fileInput1Ref}
                        title="Cole o Gráfico de ENTRADA"
                        subtitle="ou clique para selecionar"
                        isLoading={isLoadingAnalysis}
                        isDisabled={!!analysis}
                    />
                     <ImageDropZone
                        image={image2}
                        onFileChange={handleFileChange(setImage2)}
                        fileInputRef={fileInput2Ref}
                        title="Aguardando Gráfico de RESULTADO"
                        subtitle="Cole o resultado da operação aqui"
                        isLoading={isLoadingOutcome}
                        isDisabled={!analysis || !!tradeOutcome}
                    />
                </div>

                {/* Coluna Direita: Display da Análise */}
                <div className="w-full space-y-4">
                     {analysis ? (
                        <div className="w-full space-y-4">
                            <div className="bg-background/50 p-3 rounded-lg"><div className="flex justify-between items-center mb-2"><div><h4 className="font-bold text-xl text-white">{analysis.assetIdentification}</h4><p className="text-sm text-text-secondary">{analysis.timeframe}</p></div><span className={`px-3 py-1 text-sm font-semibold rounded-full ${confidenceColorMap[analysis.confidence] || ''}`}>Confiança {analysis.confidence}</span></div>
                                <div className="flex items-center gap-2 text-xs text-text-secondary border-t border-border/30 pt-2 mt-2">
                                    <ClockIcon className="h-4 w-4" />
                                    <span>{analysis.chartTimestamp} (Fonte: {analysis.timestampSource})</span>
                                </div>
                            </div>
                            
                            <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                                <h5 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Plano Tático Proposto</h5>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                    <div className="text-text-secondary">Estratégia:</div>
                                    <div className={`font-semibold text-right ${analysis.strategy === 'LONG' ? 'text-success' : 'text-danger'}`}>{analysis.strategy}</div>
                                    
                                    <div className="text-text-secondary">Entrada (Data):</div>
                                    <div className="font-semibold text-right text-white">{analysis.entryDatetime}</div>

                                    <div className="text-text-secondary">Saída (Data):</div>
                                    <div className="font-semibold text-right text-white">{analysis.exitDatetime}</div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-border/30 text-center">
                                    <div className="text-xs text-text-secondary mb-1">Projeção de Lucro (Investimento $100)</div>
                                    <div className={`text-2xl font-bold ${analysis.profitProjectionUsd >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(analysis.profitProjectionUsd)}</div>
                                    <div className={`text-sm font-semibold ${analysis.profitProjectionUsd >= 0 ? 'text-success' : 'text-danger'}`}>({formatPercentage(analysis.roiProjectionPercentage)})</div>
                                </div>
                            </div>

                            {tradeOutcome ? (
                                 <div className={`p-4 rounded-lg border ${tradeOutcomeColorMap[tradeOutcome.status].replace('bg-', 'border-')}`}>
                                    <h5 className={`font-bold uppercase tracking-wider text-sm mb-2 ${tradeOutcomeColorMap[tradeOutcome.status].replace('bg-', 'text-')}`}>Resultado da Operação Tática</h5>
                                    <div className="flex justify-between items-center">
                                      <p className="text-lg font-semibold text-white">Status: <span className="font-bold">{tradeOutcome.status}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
                                      <ClockIcon className="h-4 w-4" />
                                      <span>Resultado em: {tradeOutcome.chartTimestamp} (Fonte: {tradeOutcome.timestampSource})</span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-border/50">
                                      <RoiDisplay profit={tradeOutcome.profit} roiPercentage={tradeOutcome.roiPercentage} />
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-border/50">
                                      <p className="text-sm text-text-secondary leading-relaxed"><strong className="text-text">Diagnóstico:</strong> {tradeOutcome.diagnostic}</p>
                                    </div>
                                </div>
                            ) : (
                                !isLoadingAnalysis && !isLoadingOutcome && (
                                <div className="p-4 rounded-lg border border-dashed border-border/50 text-center text-text-secondary">
                                    <p className="font-semibold">Análise de Entrada Concluída</p>
                                    <p className="text-sm">Aguardando o gráfico de resultado para finalizar o diagnóstico e o ciclo de aprendizado.</p>
                                </div>
                                )
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                                 <div className="bg-blue-500/10 p-3 rounded-lg"><h6 className="text-xs text-blue-300 font-bold uppercase">Entrada</h6><p className="text-base font-semibold text-white">{analysis.entryPoint}</p></div>
                                <div className="bg-green-500/10 p-3 rounded-lg"><h6 className="text-xs text-green-300 font-bold uppercase">Alvo</h6><p className="text-base font-semibold text-white">{analysis.targetPoint}</p></div>
                                <div className="bg-red-500/10 p-3 rounded-lg"><h6 className="text-xs text-red-300 font-bold uppercase">Stop-Loss</h6><p className="text-base font-semibold text-white">{analysis.stopLoss}</p></div>
                            </div>
                        </div>
                     ) : (
                        <div className="text-center text-text-secondary py-12">
                            <p>Aguardando o gráfico de entrada para iniciar a análise tática.</p>
                        </div>
                     )}
                </div>
            </div>
            {error && ( <div className="mt-6 text-center p-4 bg-danger/20 text-danger rounded-lg"><p className="font-semibold">Erro na Análise</p><p className="text-sm">{error}</p></div>)}
        </div>
    );
};

export default ChartAnalysis;