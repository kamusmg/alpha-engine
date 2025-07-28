


import React, { useState, useEffect } from 'react';
import { SelfAnalysis, ShortTermTradeFeedback, ForgeActionPlan } from '../types';
import SelfAnalysisCard from './SelfAnalysisCard';
import EvolutionPromptBox from './EvolutionPromptBox';
import BlueprintIcon from './BlueprintIcon';
import UserIcon from './UserIcon';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { fetchForgeActionPlan } from '../services/geminiService';

// Icons
const BrainIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

const CodeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4 mr-2"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4 mr-2"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

interface EvolutionCycleCardProps {
  analysis: SelfAnalysis;
  promptText: string;
  backtestStrengths: string;
  backtestWeaknesses: string;
  shortTermFeedback: ShortTermTradeFeedback | null;
  versionId: string;
  dateGenerated: string;
}

const ForgeActionPlanDisplay: React.FC<{ analysis: SelfAnalysis; promptText: string; }> = ({ analysis, promptText }) => {
    const [actionPlan, setActionPlan] = useState<ForgeActionPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const getPlan = async () => {
            try {
                setLoading(true);
                setError(null);
                const plan = await fetchForgeActionPlan(analysis, promptText);
                setActionPlan(plan);
            } catch (e: any) {
                setError(e.message || "Não foi possível carregar o plano de ação do Forge.");
            } finally {
                setLoading(false);
            }
        };

        if (analysis && promptText) {
            getPlan();
        }
    }, [analysis, promptText]);

    if (loading) {
        return (
            <div className="pt-8 mt-8 border-t border-border/50">
                 <div className="flex items-center mb-6">
                    <div className="bg-secondary/10 p-2 rounded-full">
                        <BlueprintIcon className="h-8 w-8 text-secondary" />
                    </div>
                    <h3 className="text-xl font-bold text-secondary ml-4">Plano de Ação (Forge)</h3>
                </div>
                <div className="bg-background/50 border border-border/50 rounded-lg p-6 space-y-4 animate-pulse">
                    <div className="h-4 bg-border rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-border rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-border rounded w-5/6"></div>
                    <div className="h-4 bg-border rounded w-full"></div>
                    <div className="h-4 bg-border rounded w-2/3"></div>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="pt-8 mt-8 border-t border-border/50">
                <div className="flex items-center mb-6">
                    <div className="bg-secondary/10 p-2 rounded-full">
                        <BlueprintIcon className="h-8 w-8 text-secondary" />
                    </div>
                    <h3 className="text-xl font-bold text-secondary ml-4">Plano de Ação (Forge)</h3>
                </div>
                <div className="bg-danger/10 border border-danger/50 rounded-lg p-6 text-center text-danger">
                    <h4 className="font-bold">Erro ao Carregar Plano de Ação</h4>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }
    
    if (!actionPlan) return null;

    return (
        <div className="pt-8 mt-8 border-t border-border/50">
            <div className="flex items-center mb-6">
                <div className="bg-secondary/10 p-2 rounded-full">
                    <BlueprintIcon className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-secondary ml-4">Plano de Ação (Forge)</h3>
            </div>
            <div className="bg-background/50 border border-border/50 rounded-lg p-6 space-y-4">
                <p className="text-text-secondary leading-relaxed">{actionPlan.introduction}</p>
                <p className="text-xs text-text-secondary">{actionPlan.technicalNote}</p>
                <div className="border-t border-border/50 pt-4 space-y-4">
                    {actionPlan.actionItems.map((item, index) => (
                        <div key={index}>
                            <h4 className="font-bold text-primary">{item.title}</h4>
                            <ul className="list-disc list-inside text-text-secondary text-sm space-y-2 mt-2">
                                {item.points.map((point, pIndex) => (
                                    <li key={pIndex} dangerouslySetInnerHTML={{ __html: point.replace(/\*\*(.*?)\*\*/g, '<strong class="text-text">$1</strong>') }}></li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    <p className="text-xs text-text-secondary italic pt-2 border-t border-border/30">{actionPlan.disclaimer}</p>
                </div>
            </div>
        </div>
    );
};

const EvolutionCycleCard: React.FC<EvolutionCycleCardProps> = ({ analysis, promptText, backtestStrengths, backtestWeaknesses, shortTermFeedback, versionId, dateGenerated }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const diagnosticReport = `
      --- RELATÓRIO DE DIAGNÓSTICO (ALPHA) ---
      
      [Metadados da Execução]
      Version ID: ${versionId}
      Date Generated: ${dateGenerated}

      [Análise Técnica da Falha (Backtest)]
      Diagnóstico: ${analysis.errorExplanation}
      Análise do Modelo com Falha: ${analysis.failedModel}

      [Análise de Impacto do Erro (Backtest)]
      ${analysis.errorImpactAnalysis}

      ${shortTermFeedback ? `
      [Diagnóstico da Operação Tática (Scanner)]
      Resultado: ${shortTermFeedback.outcome.status} para a operação ${shortTermFeedback.analysis.strategy} em ${shortTermFeedback.analysis.assetIdentification}.
      Resultado Financeiro: Lucro/Prejuízo de ${formatCurrency(shortTermFeedback.outcome.profit)} (${formatPercentage(shortTermFeedback.outcome.roiPercentage)} ROI).
      Micro-Diagnóstico: ${shortTermFeedback.outcome.diagnostic}
      ` : ''}

      [Análise de Desempenho do Backtest]
      Pontos Fortes Validados: ${backtestStrengths}
      Fraquezas Críticas Identificadas: ${backtestWeaknesses}

      --- REQUISIÇÃO DE UPGRADE (ALPHA PARA FORGE) ---

      [Sugestão Técnica de Upgrade]
      ${analysis.correctionSuggestion}

      [Diretiva de Evolução para Forge]
      ${promptText}
    `;

    // Dedent the template literal string before copying
    const lines = diagnosticReport.split('\n');
    const firstLine = lines.find(line => line.trim() !== '');
    const indentMatch = firstLine?.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';
    const dedentedReport = lines.map(line => line.startsWith(indent) ? line.substring(indent.length) : line).join('\n').trim();


    navigator.clipboard.writeText(dedentedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };
  
  return (
    <div className="bg-gradient-to-br from-surface to-background/50 border border-border/70 rounded-xl p-6 shadow-lg relative">
      <div className="flex justify-between items-start mb-4">
        <div>
            <h3 className="text-3xl font-bold text-text">Ciclo de Evolução</h3>
            <p className="text-text-secondary max-w-4xl">
                A IA 'Alpha' analisou seu desempenho, identificou uma falha e preparou uma requisição de upgrade. Como Supervisor, revise o diagnóstico e o plano de ação do 'Forge' e autorize a evolução.
            </p>
        </div>
        <div className="text-right text-xs text-text-secondary flex-shrink-0 ml-4">
            <p><strong>ID da Versão:</strong></p>
            <p className="font-mono">{versionId}</p>
            <p className="mt-1"><strong>Gerado em:</strong></p>
            <p className="font-mono">{dateGenerated}</p>
        </div>
      </div>


      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 my-8 p-4 bg-background/30 rounded-lg">
          <div className="flex flex-col items-center text-center">
              <div className="bg-primary/10 p-4 rounded-full border-2 border-primary/30">
                  <BrainIcon className="h-10 w-10 text-primary" />
              </div>
              <p className="font-bold text-lg mt-2 text-primary">1. Diagnóstico (Alpha)</p>
          </div>
          <div className="text-4xl font-thin text-text-secondary transform md:-translate-y-4 animate-pulse">→</div>
           <div className="flex flex-col items-center text-center">
              <div className="bg-secondary/10 p-4 rounded-full border-2 border-secondary/30">
                  <UserIcon className="h-10 w-10 text-secondary" />
              </div>
              <p className="font-bold text-lg mt-2 text-secondary">2. Autorização (Você)</p>
          </div>
          <div className="text-4xl font-thin text-text-secondary transform md:-translate-y-4 animate-pulse">→</div>
           <div className="flex flex-col items-center text-center">
              <div className="bg-gray-500/10 p-4 rounded-full border-2 border-gray-500/30">
                  <CodeIcon className="h-10 w-10 text-gray-400" />
              </div>
              <p className="font-bold text-lg mt-2 text-gray-400">3. Upgrade (Forge)</p>
          </div>
      </div>
      
      <div className="space-y-8 mt-8">
        <SelfAnalysisCard 
          analysis={analysis} 
          backtestStrengths={backtestStrengths}
          backtestWeaknesses={backtestWeaknesses}
          shortTermFeedback={shortTermFeedback}
        />
        <EvolutionPromptBox promptText={promptText} correctionSuggestion={analysis.correctionSuggestion} />
        
        <div className="text-center pt-8 mt-8 border-t border-border/30">
            <h4 className="text-lg font-bold text-secondary mb-2">Ação do Supervisor</h4>
            <p className="text-text-secondary text-sm mb-4">Autorize o upgrade copiando a requisição para a interface de desenvolvimento do Forge.</p>
            <button
                onClick={handleCopy}
                className="bg-secondary text-white font-bold py-3 px-6 rounded-md hover:bg-opacity-80 transition-all duration-200 text-base flex items-center justify-center mx-auto disabled:opacity-75 disabled:bg-green-600"
                disabled={copied}
                aria-label="Autorizar Upgrade e Copiar Requisição"
            >
                {copied ? <CheckIcon className="h-5 w-5 mr-2" /> : <CopyIcon className="h-5 w-5 mr-2" />}
                {copied ? 'Requisição Copiada!' : 'Autorizar Upgrade e Copiar Requisição'}
            </button>
        </div>

        <ForgeActionPlanDisplay analysis={analysis} promptText={promptText} />

      </div>
    </div>
  );
};

export default EvolutionCycleCard;