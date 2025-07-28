import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTimeTravelAnalysis, fetchNewSignal, createChatSession } from './services/geminiService.ts';
import { SimulationResult, ShortTermTradeFeedback } from './types';
import type { Chat } from '@google/genai';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import PresentDaySignalCard from './components/PresentDaySignalCard';
import BacktestHorizonSection from './components/BacktestHorizonSection';
import MoonPhaseIcon from './components/MoonPhaseIcon';
import Clock from './components/Clock';
import MacroDashboard from './components/MacroDashboard';
import MajorAssetSection from './components/MajorAssetSection';
import BacktestSummaryCard from './components/BacktestSummaryCard';
import BacktestExplanationCard from './components/BacktestExplanationCard';
import ChartAnalysis from './components/ChartAnalysis';
import EvolutionCycleCard from './components/EvolutionCycleCard';
import AICoreMonitor from './components/AICoreMonitor';
import QuickAnalysis from './components/QuickAnalysis';
import RefreshIcon from './components/RefreshIcon';
import RobustnessAudit from './components/RobustnessAudit';
import CommandBridge from './components/CommandBridge';

import { SignIn, useUser } from "@clerk/clerk-react"; // Import Clerk

const CACHE_KEY = 'cryptoAlphaEngineCache';

const App: React.FC = () => {
  const { isSignedIn, isLoaded } = useUser();

  // Checagem do Clerk - só mostra a tela se estiver autenticado
  if (!isLoaded) {
    return <div style={{ textAlign: "center", padding: 80 }}>Carregando autenticação...</div>;
  }

  if (!isSignedIn) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <SignIn />
      </div>
    );
  }

  // --- Daqui pra baixo é TODO o SEU APP normal ---
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheWarning, setCacheWarning] = useState<string | null>(null);
  const [isRerolling, setIsRerolling] = useState<Record<string, boolean>>({});
  const [rerollErrors, setRerollErrors] = useState<Record<string, string | null>>({});
  const [shortTermFeedback, setShortTermFeedback] = useState<ShortTermTradeFeedback | null>(null);
  const [feedbackReadyForRecalc, setFeedbackReadyForRecalc] = useState<boolean>(false);

  // State for Command Bridge
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: "Ponte de Comando Alpha ativa. Aguardando suas ordens, Supervisor." }
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      setError(null);
      setCacheWarning(null);
      try {
        const data = await fetchTimeTravelAnalysis();
        setSimulationData(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        // Initialize chat
        const newChat = createChatSession(data);
        setChat(newChat);
      } catch (e: any) {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const parsedCache = JSON.parse(cachedData);
          setSimulationData(parsedCache);
          // Initialize chat from cache
          const newChat = createChatSession(parsedCache);
          setChat(newChat);
          setCacheWarning("Falha ao conectar com a API. Exibindo os últimos dados válidos do cache.");
        } else {
          setError(e.message || 'An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    };
    initialLoad();
  }, []);

  const handleRecalculate = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setCacheWarning(null);
    setFeedbackReadyForRecalc(false); // Consume the signal

    try {
      const data = await fetchTimeTravelAnalysis(shortTermFeedback);
      setSimulationData(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      // Re-initialize chat with new data
      const newChat = createChatSession(data);
      setChat(newChat);
      setChatHistory([{ role: 'model', text: "Núcleo reiniciado com novos dados. Ponte de Comando Alpha ativa. Aguardando ordens." }]);
    } catch (e: any) {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setSimulationData(JSON.parse(cachedData));
        setCacheWarning("Falha ao conectar com a API. Exibindo os últimos dados válidos do cache.");
      } else {
        setError(e.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }, [loading, shortTermFeedback]);

  const handleNewShortTermFeedback = useCallback((feedback: ShortTermTradeFeedback) => {
    setShortTermFeedback(feedback);
    setFeedbackReadyForRecalc(true);
  }, []);

  const handleReroll = useCallback(async (type: 'buy' | 'sell', index: number) => {
    if (!simulationData) return;

    const key = `${type}-${index}`;
    setIsRerolling(prev => ({ ...prev, [key]: true }));
    setRerollErrors(prev => ({ ...prev, [key]: null })); // Clear previous error

    const signals = type === 'buy' ? simulationData.presentDayBuySignals : simulationData.presentDaySellSignals;
    const currentSignal = signals[index];

    const allAssetNames = [
      ...simulationData.presentDayBuySignals.map(s => s.assetName),
      ...simulationData.presentDaySellSignals.map(s => s.assetName),
    ];

    try {
      const newSignal = await fetchNewSignal({
        signalType: currentSignal.signalType,
        horizon: currentSignal.horizon,
        excludeAssets: allAssetNames,
      });

      setSimulationData(prevData => {
        if (!prevData) return null;

        const newData = JSON.parse(JSON.stringify(prevData));

        if (type === 'buy') {
          newData.presentDayBuySignals[index] = newSignal;
        } else {
          newData.presentDaySellSignals[index] = newSignal;
        }
        return newData;
      });

    } catch (e) {
      console.error(`Failed to fetch new ${type} signal at index ${index}`, e);
      setRerollErrors(prev => ({ ...prev, [key]: "Falha ao buscar novo ativo." }));
      setTimeout(() => setRerollErrors(prev => ({ ...prev, [key]: null })), 3000); // Clear error after 3s
    } finally {
      setIsRerolling(prev => ({ ...prev, [key]: false }));
    }
  }, [simulationData]);

  const handleSendMessage = async (message: string) => {
    if (!chat || isChatLoading || !message.trim()) return;

    const newHistory = [...chatHistory, { role: 'user' as const, text: message }];
    setChatHistory(newHistory);
    setIsChatLoading(true);

    try {
      const response = await chat.sendMessage({ message });
      setChatHistory([...newHistory, { role: 'model' as const, text: response.text }]);
    } catch (e: any) {
      console.error("Chat error:", e);
      const errorText = e.message || "Ocorreu um erro de comunicação com o núcleo Alpha. Por favor, tente novamente.";
      setChatHistory([...newHistory, { role: 'model' as const, text: `Erro: ${errorText}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const backtestSummaryResult = useMemo(() => {
    if (!simulationData) {
      return { totalInvestment: 0, totalFinalValue: 0, totalProfit: 0, totalRoiPercentage: 0 };
    }
    const allBacktestSignals = [
      ...simulationData.signals24h,
      ...simulationData.signals7d,
      ...simulationData.signals30d,
    ];

    const totalInvestment = allBacktestSignals.reduce((acc, signal) => acc + signal.investment, 0);
    const totalFinalValue = allBacktestSignals.reduce((acc, signal) => acc + signal.finalValue, 0);
    const totalProfit = totalFinalValue - totalInvestment;
    const totalRoiPercentage = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    return { totalInvestment, totalFinalValue, totalProfit, totalRoiPercentage };
  }, [simulationData]);

  if (loading && !simulationData) {
    return <LoadingSpinner />;
  }

  if (error && !simulationData) {
    return <ErrorDisplay message={error} />;
  }

  if (!simulationData) {
    return <ErrorDisplay message="Não foi possível carregar os dados da simulação." />;
  }

  return (
    <div className="min-h-screen bg-background text-text p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <MoonPhaseIcon className="h-12 w-12 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text">Crypto Alpha Engine</h1>
              <p className="text-md text-text-secondary">Supervisor Mode: ON</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Clock />
            <button
              onClick={handleRecalculate}
              disabled={loading}
              className={`flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait ${feedbackReadyForRecalc ? 'animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
              title="Executar um novo ciclo de análise com base no aprendizado tático mais recente"
            >
              <RefreshIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analisando...' : 'Recalcular Análise'}
            </button>
          </div>
        </header>

        {cacheWarning && (
          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-300 p-3 rounded-lg text-center text-sm mb-8">
            {cacheWarning}
          </div>
        )}

        <main className="space-y-12">

          <CommandBridge
            history={chatHistory}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            disabled={!chat}
          />

          <QuickAnalysis />

          <ChartAnalysis onNewFeedback={handleNewShortTermFeedback} />

          <AICoreMonitor
            evolutionPercentage={simulationData.evolutionPercentage}
            realMoneySuccessProbability={simulationData.realMoneySuccessProbability}
            macroContext={simulationData.macroContext}
          />

          <RobustnessAudit />

          {simulationData.majorAssetAnalysis && (
            <MajorAssetSection analysis={simulationData.majorAssetAnalysis} />
          )}

          {simulationData.perfectionNotification && (
            <div className="bg-green-500/10 border border-green-500 text-green-300 p-4 rounded-lg text-center">
              <strong className="font-bold">Notificação de Calibração:</strong> {simulationData.perfectionNotification}
            </div>
          )}

          {simulationData.macroContext && (
            <MacroDashboard context={simulationData.macroContext} />
          )}

          <PresentDaySignalCard
            buySignals={simulationData.presentDayBuySignals}
            sellSignals={simulationData.presentDaySellSignals}
            onReroll={handleReroll}
            isRerolling={isRerolling}
            rerollErrors={rerollErrors}
            strengths={simulationData.presentDayStrengths}
            weaknesses={simulationData.presentDayWeaknesses}
          />

          <BacktestExplanationCard />

          <BacktestHorizonSection title="Resultados do Backtest - Horizonte 24 Horas" signals={simulationData.signals24h} />
          <BacktestHorizonSection title="Resultados do Backtest - Horizonte 7 Dias" signals={simulationData.signals7d} />
          <BacktestHorizonSection title="Resultados do Backtest - Horizonte 30 Dias" signals={simulationData.signals30d} />

          <BacktestSummaryCard
            totalInvestment={backtestSummaryResult.totalInvestment}
            totalFinalValue={backtestSummaryResult.totalFinalValue}
            totalProfit={backtestSummaryResult.totalProfit}
            totalRoiPercentage={backtestSummaryResult.totalRoiPercentage}
          />

          <EvolutionCycleCard
            analysis={simulationData.selfAnalysis}
            promptText={simulationData.evolutionPrompt}
            backtestStrengths={simulationData.backtestStrengths}
            backtestWeaknesses={simulationData.backtestWeaknesses}
            shortTermFeedback={shortTermFeedback}
            versionId={simulationData.versionId}
            dateGenerated={simulationData.dateGenerated}
          />

          <footer className="text-center mt-12 pt-8 border-t border-border">
            <p className="text-sm text-text-secondary">
              Esta ferramenta é para análise e estudo. Não constitui recomendação de investimento.
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Versão da IA: {simulationData.versionId}
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;
