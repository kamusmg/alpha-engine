import React from 'react';
import { MajorAssetSummary, MajorAssetAnalysis } from '../types';

const ChartBarIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

const StrategyIcon: React.FC<{ strategy: 'LONG' | 'SHORT' | 'NEUTRO' }> = ({ strategy }) => {
    if (strategy === 'LONG') {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
    }
    if (strategy === 'SHORT') {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" /></svg>;
};

const strategyConfig = {
    LONG: { color: 'text-success', label: 'Compra (Long)' },
    SHORT: { color: 'text-danger', label: 'Venda (Short)' },
    NEUTRO: { color: 'text-blue-400', label: 'Neutro' },
}

const AssetCard: React.FC<{ ticker: string; analysis: MajorAssetAnalysis }> = ({ ticker, analysis }) => {
    const config = strategyConfig[analysis.strategy];

    return (
        <div className="bg-gradient-to-br from-surface to-background/50 border border-border/70 rounded-xl p-5 shadow-lg flex flex-col h-full transition-all duration-300 hover:shadow-primary/20 hover:border-primary/50 hover:scale-[1.02] transform-gpu">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-2xl font-bold text-white">{ticker}</h4>
                <div className={`flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${config.color.replace('text-', 'bg-')}/20 ${config.color}`}>
                    <StrategyIcon strategy={analysis.strategy} />
                    <span>{config.label}</span>
                </div>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed mb-5">{analysis.analysisText}</p>
            
            <div className="mt-auto bg-background/50 rounded-lg p-4 border border-border/50">
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="text-text-secondary">Entrada (Preço):</div>
                    <div className="text-white font-semibold text-right">{analysis.entryPoint}</div>
                    
                    <div className="text-text-secondary">Probabilidade:</div>
                    <div className="text-white font-semibold text-right">{analysis.probability}</div>

                    <div className="text-text-secondary">Alvo:</div>
                    <div className="text-success font-semibold text-right">{analysis.target}</div>

                    <div className="text-text-secondary">Stop-Loss:</div>
                    <div className="text-danger font-semibold text-right">{analysis.stopLoss}</div>
                    
                    <div className="text-text-secondary col-span-2 my-1 border-t border-border/30"></div>

                    <div className="text-text-secondary">Entrada (Data):</div>
                    <div className="text-white font-semibold text-right text-xs">{analysis.entryDatetime}</div>

                    <div className="text-text-secondary">Saída (Data):</div>
                    <div className="text-white font-semibold text-right text-xs">{analysis.exitDatetime}</div>
                </div>
            </div>
        </div>
    );
};

interface MajorAssetSectionProps {
    analysis: MajorAssetSummary;
}

const MajorAssetSection: React.FC<MajorAssetSectionProps> = ({ analysis }) => {
    const assets = Object.entries(analysis);
    if (assets.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-surface to-background/50 border border-border/70 rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
                <div className="bg-secondary/10 p-2 rounded-full">
                    <ChartBarIcon />
                </div>
                <h3 className="text-2xl font-bold text-text ml-4">Análise dos Ativos Principais</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {assets.map(([ticker, assetAnalysis]) => (
                    <AssetCard key={ticker} ticker={ticker} analysis={assetAnalysis} />
                ))}
            </div>
        </div>
    );
};

export default MajorAssetSection;
