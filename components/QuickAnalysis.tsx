import React, { useState } from 'react';
import { fetchQuickAnalysis } from '../services/geminiService';
import { QuickAnalysisResult, QuickAnalysisSignal } from '../types';
import { formatCurrency, formatPercentage } from '../utils/formatters';

// Icons
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>);
const BuyIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>);
const SellIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>);
const NeutralIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const LightningIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>);

const signalTypeConfig = {
    COMPRA: { icon: <BuyIcon className="h-5 w-5" />, color: 'text-success' },
    VENDA: { icon: <SellIcon className="h-5 w-5" />, color: 'text-danger' },
    NEUTRO: { icon: <NeutralIcon className="h-5 w-5" />, color: 'text-blue-400' },
};

const confidenceColorMap: { [key: string]: string } = {
    'Alto': 'bg-green-500/20 text-green-300',
    'Médio': 'bg-yellow-500/20 text-yellow-400',
    'Baixo': 'bg-red-500/20 text-red-400',
};

const ResultCard: React.FC<{ signal: QuickAnalysisSignal }> = ({ signal }) => {
    const config = signalTypeConfig[signal.signalType];
    const confidenceClasses = confidenceColorMap[signal.confidenceLevel] || 'bg-gray-500/20 text-gray-300';

    if (signal.signalType === 'NEUTRO') {
        return (
            <div className="bg-background/50 rounded-lg p-4 flex flex-col h-full border border-border/50 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-3">
                    <h5 className="font-bold text-lg text-white">{signal.horizon}</h5>
                </div>
                <div className="flex-grow flex flex-col items-center justify-center text-center my-4">
                    <div className={`font-bold text-lg ${config.color} flex items-center gap-2`}>
                        {config.icon}
                        {signal.signalType}
                    </div>
                     <p className="text-text-secondary text-sm leading-relaxed mt-2">{signal.justification}</p>
                </div>
                {signal.ivlPercentage !== undefined && (
                    <div className="mt-auto pt-4 border-t border-border/30 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-text-secondary">Índice de Liquidez (IVL)</span>
                            <div className={`font-semibold text-right ${signal.ivlPercentage >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {signal.ivlPercentage.toFixed(0)}%
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }


    return (
        <div className="bg-background/50 rounded-lg p-4 flex flex-col h-full border border-border/50 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-3">
                 <h5 className="font-bold text-lg text-white">{signal.horizon}</h5>
                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${confidenceClasses}`}>
                    Confiança {signal.confidenceLevel}
                </span>
            </div>
            
            <p className="text-text-secondary text-sm leading-relaxed mb-4 flex-grow">{signal.justification}</p>

            <div className="mt-auto pt-4 border-t border-border/30 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center bg-green-900/30 border border-green-500/30 rounded p-2">
                        <div className="text-xs text-green-300 font-bold uppercase">Alvo (Lucro)</div>
                        <div className="text-lg font-bold text-success">{formatCurrency(signal.profitProjectionUsd)}</div>
                        <div className="text-xs font-semibold text-success">({formatPercentage(signal.roiProjectionPercentage)})</div>
                    </div>
                    <div className="text-center bg-red-900/30 border border-red-500/30 rounded p-2">
                        <div className="text-xs text-red-300 font-bold uppercase">Risco (Stop)</div>
                        <div className="text-lg font-bold text-danger">{formatCurrency(signal.projectedLossUsd)}</div>
                        <div className="text-xs font-semibold text-danger">({formatPercentage(signal.projectedLossRoiPercentage)})</div>
                    </div>
                </div>

                <div className="text-xs pt-2 space-y-1">
                    <div className="flex justify-between items-center">
                        <span className={`font-bold ${config.color} flex items-center gap-2`}>
                            {config.icon}
                            {signal.signalType}
                        </span>
                        <div className="text-right text-text-secondary">
                            Stop-loss: <span className="font-semibold text-white">{signal.stopLoss}</span>
                        </div>
                    </div>
                    {signal.ivlPercentage !== undefined && (
                        <div className="flex justify-between items-center">
                            <span className="text-text-secondary">Índice de Liquidez (IVL)</span>
                            <div className={`font-semibold text-right ${signal.ivlPercentage >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {signal.ivlPercentage.toFixed(0)}%
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const QuickAnalysis: React.FC = () => {
    const [asset, setAsset] = useState('');
    const [amount, setAmount] = useState('100');
    const [results, setResults] = useState<QuickAnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const investmentAmount = parseFloat(amount);
        if (!asset || isNaN(investmentAmount) || investmentAmount <= 0) {
            setError("Por favor, insira um ativo e um valor de investimento válido.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const data = await fetchQuickAnalysis(asset, investmentAmount);
            setResults(data);
        } catch (e: any) {
            setError(e.message || "Ocorreu um erro ao buscar a análise.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-surface to-background/50 border border-border/70 rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-2 rounded-full">
                    <LightningIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-text ml-4">Análise Rápida de Ativo</h3>
            </div>
            
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-8">
                <div className="md:col-span-1">
                    <label htmlFor="asset-ticker" className="block text-sm font-medium text-text-secondary mb-1">Ativo (Ticker)</label>
                    <input
                        id="asset-ticker"
                        type="text"
                        value={asset}
                        onChange={(e) => setAsset(e.target.value.toUpperCase())}
                        placeholder="Ex: BTC-USDT, ETH"
                        className="w-full bg-background/50 border border-border rounded-md px-3 py-2 text-white placeholder-text-secondary/50 focus:ring-2 focus:ring-primary focus:border-primary transition"
                        required
                    />
                </div>
                <div className="md:col-span-1">
                    <label htmlFor="investment-amount" className="block text-sm font-medium text-text-secondary mb-1">Valor do Investimento (USD)</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">$</span>
                        <input
                            id="investment-amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-background/50 border border-border rounded-md pl-7 pr-3 py-2 text-white placeholder-text-secondary/50 focus:ring-2 focus:ring-primary focus:border-primary transition"
                            placeholder="100.00"
                            min="0.01"
                            step="any"
                            required
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full md:col-span-1 bg-primary text-white font-bold py-2 px-4 rounded-md flex items-center justify-center hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-wait"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Analisando...
                        </>
                    ) : (
                        <>
                            <SearchIcon className="h-5 w-5 mr-2" />
                            Analisar Ativo
                        </>
                    )}
                </button>
            </form>

            {error && <div className="mt-4 text-center p-4 bg-danger/20 text-danger rounded-lg"><p>{error}</p></div>}
            
            {results && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {results.map(signal => (
                        <ResultCard key={signal.horizon} signal={signal} />
                    ))}
                </div>
            )}
             {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-background/50 rounded-lg p-4 h-64 animate-pulse border border-border/50">
                            <div className="h-4 bg-border rounded w-1/3 mb-4"></div>
                            <div className="h-3 bg-border rounded w-full mb-2"></div>
                            <div className="h-3 bg-border rounded w-5/6 mb-8"></div>
                            <div className="h-20 bg-border rounded w-full"></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuickAnalysis;