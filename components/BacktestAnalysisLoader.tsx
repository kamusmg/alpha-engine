
import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';

// Import components directly, not lazy
import BacktestExplanationCard from './BacktestExplanationCard';
import BacktestHorizonSection from './BacktestHorizonSection';
import BacktestSummaryCard from './BacktestSummaryCard';
import EvolutionCycleCard from './EvolutionCycleCard';

// Import Skeletons
import BacktestHorizonSectionSkeleton from './skeletons/BacktestHorizonSectionSkeleton';
import BacktestSummaryCardSkeleton from './skeletons/BacktestSummaryCardSkeleton';
import EvolutionCycleCardSkeleton from './skeletons/EvolutionCycleCardSkeleton';

const BacktestAnalysisLoader: React.FC = () => {
    const { backtestData, isBacktestLoading, loadBacktestData } = useData();
    const { language } = useLanguage();
    const t = translations[language];
    
    useEffect(() => {
        loadBacktestData();
    }, [loadBacktestData]);
    
    if (isBacktestLoading || !backtestData) {
        return (
            <div className="space-y-12">
                <BacktestExplanationCard />
                <BacktestHorizonSectionSkeleton title={t.backtestResults24h} />
                <BacktestHorizonSectionSkeleton title={t.backtestResults7d} />
                <BacktestHorizonSectionSkeleton title={t.backtestResults30d} />
                <BacktestSummaryCardSkeleton />
                <EvolutionCycleCardSkeleton />
            </div>
        );
    }
    
    return (
        <div className="space-y-12">
            <BacktestExplanationCard />
            <BacktestHorizonSection title={t.backtestResults24h} backtestData={backtestData} horizon="24h" />
            <BacktestHorizonSection title={t.backtestResults7d} backtestData={backtestData} horizon="7d" />
            <BacktestHorizonSection title={t.backtestResults30d} backtestData={backtestData} horizon="30d" />
            <BacktestSummaryCard backtestData={backtestData} />
            <EvolutionCycleCard backtestData={backtestData} />
        </div>
    );
};

export default BacktestAnalysisLoader;
