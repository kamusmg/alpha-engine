
import React, { Suspense } from 'react';
import { DataProvider, useData } from './contexts/DataContext.tsx';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext.tsx';
import { translations } from './utils/translations.ts';

import Clock from './components/Clock';
import MacroDashboard from './components/MacroDashboard';
import MajorAssetSection from './components/MajorAssetSection';
import ChartAnalysis from './components/ChartAnalysis';
import QuickAnalysis from './components/QuickAnalysis';
import CommandBridge from './components/CommandBridge';
import RealTradingGuide from './components/RealTradingGuide';
import PresentDaySignalCard from './components/PresentDaySignalCard';
import SignalHistory from './components/SignalHistory';

import CollapsibleSection from './components/CollapsibleSection';
import LanguageToggle from './components/LanguageToggle';
import Logo from './components/Logo.tsx';
import NetworkIcon from './components/NetworkIcon.tsx';
import MonitorIcon from './components/MonitorIcon.tsx';
import CandleChartIcon from './components/CandleChartIcon.tsx';
import BookOpenIcon from './components/BookOpenIcon.tsx';
import RotateCwIcon from './components/RotateCwIcon.tsx';

// --- Lazy-loaded components and their loaders ---
const BacktestAnalysisLoader = React.lazy(() => import('./components/BacktestAnalysisLoader'));
const AdvancedMonitoringLoader = React.lazy(() => import('./components/AdvancedMonitoringLoader'));

import AICoreMonitorSkeleton from './components/skeletons/AICoreMonitorSkeleton';
import BacktestHorizonSectionSkeleton from './components/skeletons/BacktestHorizonSectionSkeleton';


const AppContent: React.FC = () => {
  const { isRecalculating, error, runFullAnalysis, presentDayData, backtestData } = useData();
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="min-h-screen bg-background text-text p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-start mb-8">
          <Logo title={t.appTitle} subtitle={t.appSubtitle} />
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <Clock />
              <LanguageToggle />
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
          
          <PresentDaySignalCard />
          <SignalHistory />
          <ChartAnalysis />
          <MacroDashboard />
          <MajorAssetSection />
          <QuickAnalysis />

          {presentDayData?.perfectionNotification && (
            <div className="bg-green-500/10 border border-green-500 text-green-300 p-4 rounded-lg text-center">
              <strong className="font-bold">{t.calibrationNotification}:</strong> {presentDayData.perfectionNotification}
            </div>
          )}

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


const App: React.FC = () => {
  return (
    <LanguageProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </LanguageProvider>
  );
};


export default App;
