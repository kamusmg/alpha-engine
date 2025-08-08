
import React, { useState, useEffect } from 'react';
import { fetchTacticalAnalysis } from '../services/geminiService';
import { fetchPriceForTicker } from '../services/marketService';
import { PresentDayAssetSignal } from '../types';
import { SignalBlock } from './PresentDaySignalCard';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import { useData } from '../contexts/DataContext';
import SignalBlockSkeleton from './skeletons/SignalBlockSkeleton';

// Icons
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>);
const LightningIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>);


const QuickAnalysis: React.FC = () => {
    const { language } = useLanguage();
    const t = translations[language];
    const { presentDayData } = useData();

    const [asset, setAsset] = useState('');
    const [result, setResult] = useState<PresentDayAssetSignal | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [history, setHistory] = useState<string[]>([]);
    const popularAssets = ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK'];


    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('lucraCryptoSearchHistory');
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error("Failed to parse search history from localStorage", e);
            setHistory([]);
        }
    }, []);

    const updateHistory = (newAsset: string) => {
        const updatedHistory = [newAsset, ...history.filter(h => h.toUpperCase() !== newAsset.toUpperCase())].slice(0, 5);
        setHistory(updatedHistory);
        localStorage.setItem('lucraCryptoSearchHistory', JSON.stringify(updatedHistory));
    };

    const handleSearch = async (searchAsset: string) => {
        if (!searchAsset) {
            setError(t.searchError);
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);
        setAsset(searchAsset.toUpperCase());

        try {
            const price = await fetchPriceForTicker(searchAsset);
            if (!price) {
                throw new Error(t.searchNotFound);
            }

            const data = await fetchTacticalAnalysis(searchAsset, price, language);
            setResult(data);
            updateHistory(searchAsset.toUpperCase());
        } catch (e: any) {
            setError(e.message || t.searchFailed);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(asset);
    }

    const isAssetInOpportunities = result && presentDayData && 
        [...presentDayData.presentDayBuySignals, ...presentDayData.presentDaySellSignals]
        .some(s => s.assetName.toUpperCase().includes(result.assetName.toUpperCase()));

    return (
        <div className="bg-gradient-to-br from-surface to-background/50 border border-border/70 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <LightningIcon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-text ml-4">{t.tacticalSearchTitle}</h3>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                <div className="md:col-span-2">
                    <label htmlFor="tactical-asset-ticker" className="block text-sm font-medium text-text-secondary mb-1">{t.assetLabel}</label>
                    <input
                        id="tactical-asset-ticker"
                        type="text"
                        value={asset}
                        onChange={(e) => setAsset(e.target.value.toUpperCase())}
                        placeholder={t.assetPlaceholder}
                        className="w-full bg-background/50 border border-border rounded-md px-3 py-2 text-white placeholder-text-secondary/50 focus:ring-2 focus:ring-primary focus:border-primary transition"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full md:col-span-1 bg-primary text-white font-bold py-2 px-4 rounded-md flex items-center justify-center hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-wait"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            {t.analyzing}
                        </>
                    ) : (
                        <>
                            <SearchIcon className="h-5 w-5 mr-2" />
                            {t.searchButton}
                        </>
                    )}
                </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-xs mb-8">
                <span className="font-semibold text-text-secondary mr-2">{t.popularAssets}:</span>
                {popularAssets.map(pAsset => (
                    <button key={pAsset} onClick={() => handleSearch(pAsset)} disabled={isLoading} className="bg-surface hover:bg-border text-text-secondary px-3 py-1.5 rounded-full transition-colors disabled:opacity-50">{pAsset}</button>
                ))}
                {history.length > 0 && <span className="text-text-secondary">|</span>}
                 {history.length > 0 && <span className="font-semibold text-text-secondary mr-2">{t.searchHistory}:</span>}
                {history.map(hAsset => (
                     <button key={hAsset} onClick={() => handleSearch(hAsset)} disabled={isLoading} className="bg-surface hover:bg-border text-text-secondary px-3 py-1.5 rounded-full transition-colors disabled:opacity-50">{hAsset}</button>
                ))}
            </div>

            {error && (
                <div className="mt-4 text-center p-4 bg-danger/20 text-danger rounded-lg">
                    <p>{error}</p>
                </div>
            )}
            
            {isLoading && (
                 <div className="mt-6 max-w-lg mx-auto">
                    <SignalBlockSkeleton />
                </div>
            )}

            {result && (
                <div className="mt-8 max-w-lg mx-auto animate-fade-in">
                    <SignalBlock 
                        signal={result} 
                        showProminentProfit={true} 
                        isTacticalSearch={true} 
                    />
                    {isAssetInOpportunities && (
                        <button className="mt-4 w-full text-center bg-primary/20 text-primary font-semibold py-2 rounded-lg hover:bg-primary/30 transition-colors">
                        {t.viewInPanel}
                        </button>
                    )}
                </div>
            )}

            <div className="text-center mt-6 pt-4 border-t border-border/50">
                <p className="text-xs text-text-secondary">
                    {t.searchDisclaimer}
                </p>
            </div>
        </div>
    );
};

export default QuickAnalysis;