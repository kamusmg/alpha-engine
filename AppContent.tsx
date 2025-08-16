

import React, { Suspense } from 'react';
import { useData } from './contexts/DataContext.tsx';
import { useLanguage } from './contexts/LanguageContext.tsx';
import { translations } from './utils/translations.ts';

import Clock from './components/Clock.tsx';
import MacroDashboard from './components/MacroDashboard.tsx';
import MajorAssetSection from './components/MajorAssetSection.tsx';
import ChartAnalysis from './components/ChartAnalysis.tsx';
import QuickAnalysis from './components/QuickAnalysis.tsx';
import CommandBridge from './components/CommandBridge.tsx';
import RealTradingGuide from './components/RealTradingGuide.tsx';
import PresentDaySignalCard from './components/PresentDaySignalCard.tsx';
import SignalHistory from './components/SignalHistory.tsx';
import MemeCoinWatchlist from './components/OpportunityIndicators.tsx';
import PerformancePanel from './components/PerformancePanel.tsx';
import Watchlist from './components/Watchlist.tsx';
import SentimentPanel from './components/SentimentPanel.tsx';
import NotificationCenter from './components/NotificationCenter.tsx';
import NotificationToasts from './components/NotificationToast.tsx';
import LivePositionsPanel from './components/LivePositionsPanel.tsx';
import ApiKeyManager from './components/ApiKeyManager.tsx';


import CollapsibleSection from './components/CollapsibleSection.tsx';
import LanguageToggle from './components/LanguageToggle.tsx';
import Logo from './components/Logo.tsx';
import NetworkIcon from './components/NetworkIcon.tsx';
import MonitorIcon from './components/MonitorIcon.tsx';
import CandleChartIcon from './components/CandleChartIcon.tsx';
import BookOpenIcon from './components/BookOpenIcon.tsx';
import RotateCwIcon from './components/RotateCwIcon.tsx';
import RocketIcon from './components/RocketIcon.tsx';
import TrophyIcon from './components/icons/TrophyIcon.tsx';
import StarIcon from './components/icons/StarIcon.tsx';
import MessageCircleIcon from './components/icons/MessageCircleIcon.tsx';
import ActivityIcon from './components/icons/ActivityIcon.tsx';
import KeyIcon from './components/icons/KeyIcon.tsx';



const BacktestAnalysisLoader = React.lazy(() => import('./components/BacktestAnalysisLoader.tsx'));
const AdvancedMonitoringLoader = React.lazy(() => import('./components/AdvancedMonitoringLoader.tsx'));

import AICoreMonitorSkeleton from './components/skeletons/AICoreMonitorSkeleton.tsx';
import BacktestHorizonSectionSkeleton from './components/skeletons/BacktestHorizonSectionSkeleton.tsx';

const AppContent: React.FC = () => {
  const { isRecalculating, error, runFullAnalysis, presentDayData, backtestData } = useData();
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="min-h-screen bg-background text-text p-2 sm:p-4 md:p-6 lg:p-8">
      <NotificationToasts />
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-start mb-8">
          <Logo title={t.appTitle} subtitle={t.appSubtitle} />
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <Clock />
              <LanguageToggle />
              <NotificationCenter />
            </div>
            <button
              onClick={() => runFullAnalysis()}
              disabled={isRecalculating}
              className={`flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait w-full`}
              title={t.recalculateTitle}
            >
              <RotateCwIcon className={`h-5 w-5 ${isRecalculating ? 'animate-spin' : ''}`} />
              {isRecalculating ? t.recalculatingButton : t.recalculateButton}
            </button>
          </div>
        </header>

        {error && (
            <div className="bg-danger/10 border border-danger/50 text-red-300 p-3 rounded-lg text-center text-sm mb-8">
              <strong>{t.errorAnalysis}</strong> {error}
            </div>
        )}
        
        <main className="space-y-12">
          
          {/* Phase 1: Performance Panel */}
          <CollapsibleSection
            title={t.performancePanelTitle}
            icon={<TrophyIcon className="h-8 w-8 text-primary" />}
            defaultOpen={true}
          >
            <PerformancePanel />
          </CollapsibleSection>

          {/* Phase 4.5: Live Positions Panel */}
          <CollapsibleSection
            title={t.livePositionsTitle}
            icon={<ActivityIcon className="h-8 w-8 text-primary" />}
            defaultOpen={true}
          >
            <LivePositionsPanel />
          </CollapsibleSection>

          {/* Phase 4.5, Pillar 2: API Key Management */}
          <CollapsibleSection
            title={t.apiKeyManagementTitle}
            icon={<KeyIcon className="h-8 w-8 text-primary" />}
            defaultOpen={true}
          >
            <ApiKeyManager />
          </CollapsibleSection>
          
          {/* Reordered Modules */}
          <QuickAnalysis />

          {/* Phase 2: Watchlist */}
          <CollapsibleSection
            title={t.watchlistTitle}
            icon={<StarIcon className="h-8 w-8 text-primary" />}
            defaultOpen={true}
          >
            <Watchlist />
          </CollapsibleSection>
          
          <ChartAnalysis />
          
          {/* New DegenAlpha Watchlist */}
          <CollapsibleSection
            title={t.memeCoinWatchlistTitle}
            icon={<RocketIcon className="h-8 w-8 text-primary" />}
            defaultOpen={true}
          >
            <MemeCoinWatchlist />
          </CollapsibleSection>

          {/* Main Signals */}
          <PresentDaySignalCard />

          <SignalHistory />
          <MacroDashboard />

          {/* Phase 3: Sentiment Panel */}
          <CollapsibleSection
            title={t.sentimentAnalysisTitle}
            icon={<MessageCircleIcon className="h-8 w-8 text-primary" />}
            defaultOpen={true}
          >
            <SentimentPanel />
          </CollapsibleSection>

          <MajorAssetSection />

          {presentDayData?.perfectionNotification && (
            <div className="bg-green-500/10 border border-green-500 text-green-300 p-4 rounded-lg text-center">
              <strong className="font-bold">{t.calibrationNotification}:</strong> {presentDayData.perfectionNotification}
            </div>
          )}

          {/* User requested to hide these sections to simplify the UI */}
          {/*
          <CollapsibleSection 
            title={t.commandBridgeTitle}
            icon={<NetworkIcon className="h-8 w-8 text-primary" />}
          >
             <CommandBridge />
          </CollapsibleSection>

           <CollapsibleSection 
            title={t.advancedMonitoringTitle}
            icon={<MonitorIcon className="h-8 w-8 text-primary" />}
          >
            <Suspense fallback={<AICoreMonitorSkeleton />}>
                <AdvancedMonitoringLoader />
            </Suspense>
          </CollapsibleSection>

          <CollapsibleSection 
            title={t.backtestEvolutionTitle}
            icon={<CandleChartIcon className="h-8 w-8 text-primary" />}
          >
             <Suspense fallback={<BacktestHorizonSectionSkeleton title="Loading..." />}>
                <BacktestAnalysisLoader />
            </Suspense>
          </CollapsibleSection>

           <CollapsibleSection 
            title={t.realTradingGuideTitle}
            icon={<BookOpenIcon className="h-8 w-8 text-primary" />}
          >
            <RealTradingGuide />
          </CollapsibleSection>
          */}


          <footer className="text-center mt-12 pt-8 border-t border-border">
            <p className="text-sm text-text-secondary">
              {t.footerDisclaimer}
            </p>
             <p className="text-xs text-text-secondary mt-1">
              {t.footerVersion} {backtestData ? backtestData.versionId : '...'}
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AppContent;