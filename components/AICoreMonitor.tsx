
import React from 'react';
import { MacroIndicator, BacktestAnalysisResult, PresentDayAnalysisResult } from '../types';
import AICoreMonitorSkeleton from './skeletons/AICoreMonitorSkeleton';

const getOverallStatus = (context: MacroIndicator[]): 'critical' | 'warning' | 'neutral' | 'good' => {
    const statusCount = context.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    if (statusCount.critical > 0) return 'critical';
    if (statusCount.warning > statusCount.good) return 'warning';
    if (statusCount.good > statusCount.warning) return 'good';
    return 'neutral';
};

const statusConfig = {
    critical: { color: 'danger', pulseColor: 'red', name: 'Crítico' },
    warning: { color: 'yellow-400', pulseColor: 'yellow', name: 'Alerta' },
    neutral: { color: 'blue-400', pulseColor: 'blue', name: 'Neutro' },
    good: { color: 'success', pulseColor: 'green', name: 'Bom' },
};

interface AICoreMonitorProps {
    presentDayData: PresentDayAnalysisResult;
    backtestData: BacktestAnalysisResult;
}

const AICoreMonitor: React.FC<AICoreMonitorProps> = ({ presentDayData, backtestData }) => {
    if (!presentDayData || !backtestData) return <AICoreMonitorSkeleton />;

    const { evolutionPercentage, realMoneySuccessProbability } = backtestData;
    const { macroContext } = presentDayData;

    const overallStatus = getOverallStatus(macroContext);
    const config = statusConfig[overallStatus];

    const animationStyle = {
        '--pulse-color-1': `rgba(var(--${config.pulseColor}-500-rgb), 0.4)`,
        '--pulse-color-2': `rgba(var(--${config.pulseColor}-500-rgb), 0)`,
    } as React.CSSProperties;
    
    // Define CSS variables for colors
    const pulseStyle = `
        @keyframes core-pulse-dynamic {
            0%, 100% { box-shadow: 0 0 0 0 var(--pulse-color-1); }
            50% { box-shadow: 0 0 20px 25px var(--pulse-color-2); }
        }
    `;

    return (
        <div className="bg-gradient-to-br from-surface to-background/50 border border-border/70 rounded-xl p-6 shadow-lg flex flex-col md:flex-row items-center gap-8">
            <style>
                {pulseStyle}
            </style>
            <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
                <div
                    className={`absolute w-32 h-32 bg-${config.color}/10 rounded-full`}
                    style={{ ...animationStyle, animation: `core-pulse-dynamic 4s infinite cubic-bezier(0.4, 0, 0.6, 1)` }}
                />
                <div className={`w-32 h-32 bg-surface rounded-full flex items-center justify-center border-2 border-${config.color}/30`}>
                    <div className="text-center">
                        <p className={`text-5xl font-bold text-${config.color}`}>{evolutionPercentage.toFixed(0)}<span className="text-3xl">%</span></p>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Calibração</p>
                    </div>
                </div>
            </div>
            <div className="flex-grow text-center md:text-left">
                <h3 className="text-2xl font-bold text-primary mb-2">Núcleo de Análise da Alpha</h3>
                <p className="text-text-secondary mb-4">Monitorando o estado do mercado e o progresso da IA em tempo real.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                        <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Estado do Mercado</p>
                        <p className={`text-2xl font-bold text-${config.color}`}>{config.name}</p>
                    </div>
                    <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                        <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Prob. de Sucesso Real</p>
                        <p className="text-2xl font-bold text-white">{realMoneySuccessProbability.toFixed(0)}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AICoreMonitor;
