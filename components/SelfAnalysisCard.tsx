
import React from 'react';
import { SelfAnalysis, ShortTermTradeFeedback } from '../types';
import GoIcon from './GoIcon';
import CautionIcon from './CautionIcon';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface SelfAnalysisCardProps {
    analysis: SelfAnalysis;
    backtestStrengths: string;
    backtestWeaknesses: string;
    shortTermFeedback: ShortTermTradeFeedback | null;
}

const tradeOutcomeColorMap: { [key: string]: string } = { 'SUCESSO': 'text-success', 'FALHA': 'text-danger', 'EM ANDAMENTO': 'text-blue-300' };
const tradeOutcomeBorderMap: { [key: string]: string } = { 'SUCESSO': 'border-success', 'FALHA': 'border-danger', 'EM ANDAMENTO': 'border-blue-400' };


const SelfAnalysisCard: React.FC<SelfAnalysisCardProps> = ({ analysis, backtestStrengths, backtestWeaknesses, shortTermFeedback }) => {
    return (
        <div>
            <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Relatório de Diagnóstico (Alpha)</h4>
            <div className="bg-background/50 p-4 rounded-lg border border-border/50 space-y-6">
                <div>
                    <h5 className="font-bold text-text mb-2">Análise Técnica da Falha (Backtest)</h5>
                    <p className="text-text-secondary leading-relaxed"><strong className="text-text">Diagnóstico:</strong> {analysis.errorExplanation}</p>
                    <p className="text-text-secondary mt-2"><strong className="text-text">Análise do Modelo com Falha:</strong> {analysis.failedModel}</p>
                </div>
                <div className="bg-danger/10 border-l-4 border-danger p-4 rounded-r-lg">
                    <h5 className="text-sm font-bold text-danger uppercase tracking-wider mb-2">Análise de Impacto do Erro (Backtest)</h5>
                    <p className="text-red-300 italic">{analysis.errorImpactAnalysis}</p>
                </div>
                
                {shortTermFeedback && (
                    <div className={`bg-indigo-900/10 border-l-4 ${tradeOutcomeBorderMap[shortTermFeedback.outcome.status]} p-4 rounded-r-lg`}>
                        <h5 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-2">Diagnóstico da Operação Tática (Scanner)</h5>
                         <p className="text-text-secondary leading-relaxed">
                            <strong className={`font-bold ${tradeOutcomeColorMap[shortTermFeedback.outcome.status]}`}>
                                Resultado: {shortTermFeedback.outcome.status}
                            </strong>
                             {' para a operação '}
                            <span className="font-semibold text-text">{shortTermFeedback.analysis.strategy}</span>
                             {' em '}
                            <span className="font-semibold text-text">{shortTermFeedback.analysis.assetIdentification}</span>.
                        </p>
                        <p className="text-text-secondary leading-relaxed mt-2">
                            <strong className="text-text">Resultado Financeiro:</strong> Lucro/Prejuízo de <span className={`font-semibold ${shortTermFeedback.outcome.profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(shortTermFeedback.outcome.profit)}</span> ({formatPercentage(shortTermFeedback.outcome.roiPercentage)} ROI).
                        </p>
                        <p className="text-text-secondary leading-relaxed mt-2">
                           <strong className="text-text">Micro-Diagnóstico:</strong> {shortTermFeedback.outcome.diagnostic}
                        </p>
                    </div>
                )}

                <div className="pt-6 border-t border-border/50">
                    <h5 className="font-bold text-text mb-3">Análise de Desempenho do Backtest</h5>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
                             <div className="flex-shrink-0 text-green-400 mt-1">
                                <GoIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h6 className="font-bold text-green-300">Pontos Fortes Validados</h6>
                                <p className="text-sm text-text-secondary mt-1">{backtestStrengths}</p>
                            </div>
                        </div>
                         <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                            <div className="flex-shrink-0 text-red-400 mt-1">
                                <CautionIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h6 className="font-bold text-red-300">Fraquezas Críticas Identificadas</h6>
                                <p className="text-sm text-text-secondary mt-1">{backtestWeaknesses}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelfAnalysisCard;
