
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { PresentDayAssetSignal } from '../types';
import HistoryIcon from './HistoryIcon';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;

const SignalHistoryItem: React.FC<{ signal: PresentDayAssetSignal }> = ({ signal }) => {
    const { language } = useLanguage();
    const t = translations[language];
    const isBuy = signal.signalType === 'COMPRA';
    const profitColor = signal.profitProjectionUsd >= 0 ? 'text-success' : 'text-danger';

    return (
        <div className="bg-background/50 p-3 rounded-lg border border-border/50">
            <div className="grid grid-cols-3 items-center gap-4">
                <div className="col-span-1">
                    <p className="font-bold text-base text-white">{signal.assetName}</p>
                    <p className={`text-xs font-semibold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>{signal.signalType} - {signal.horizon}</p>
                </div>
                <div className="col-span-1 text-center">
                     <p className="text-xs text-text-secondary">{t.profitProjection}</p>
                     <p className={`font-semibold ${profitColor}`}>{formatCurrency(signal.profitProjectionUsd)}</p>
                </div>
                 <div className="col-span-1 text-center">
                    <p className="text-xs text-text-secondary">{t.confidence}</p>
                    <p className="font-semibold text-white">{signal.confidenceLevel}</p>
                </div>
            </div>
        </div>
    );
};

const SignalHistory: React.FC = () => {
    const { signalHistory } = useData();
    const { language } = useLanguage();
    const t = translations[language];
    const [isOpen, setIsOpen] = useState(false);

    if (signalHistory.length === 0) {
        return null;
    }

    return (
        <div className="bg-surface/50 border border-border/50 rounded-lg p-6 shadow-lg">
            <button
                className="w-full flex justify-between items-center text-left"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex items-center">
                    <div className="bg-primary/10 p-2 rounded-full mr-4">
                        <HistoryIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-text">{t.signalHistoryTitle}</h3>
                        <p className="text-text-secondary">{t.signalHistoryDescription}</p>
                    </div>
                </div>
                <div className="flex items-center">
                     <span className="bg-primary text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center mr-4">
                        {signalHistory.length}
                    </span>
                    <ChevronDownIcon className={`h-6 w-6 text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && (
                <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-surface">
                        {signalHistory.map((signal, index) => (
                            <SignalHistoryItem key={`${signal.assetName}-${index}`} signal={signal} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SignalHistory;
