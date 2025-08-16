

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode, useRef } from 'react';
import { PresentDayAssetSignal, LivePrices, BacktestAnalysisResult, PresentDayAnalysisResult, MemeCoinSignal, CompletedTrade, SentimentAnalysis, Notification, ActiveTrade, ApiKey, OrderStatus } from '../types.ts';
import { ApiClient } from '../services/api/client.ts';
import { HorizonKey, HORIZON_LABELS } from '../services/horizonPolicy.ts';
import { DateTime } from 'luxon';
import { translations } from '../utils/translations.ts';
import { useLanguage } from './LanguageContext.tsx';


const SIGNAL_HISTORY_KEY = 'cryptoSignalHistory';
const COMPLETED_TRADES_KEY = 'cryptoCompletedTrades';
const WATCHLIST_KEY = 'cryptoWatchlist';
const NOTIFICATIONS_KEY = 'cryptoNotifications';
const ACTIVE_TRADES_KEY = 'cryptoActiveTrades';
const API_KEYS_KEY = 'cryptoApiKeys';

// --- Realism Simulation Constants ---
const TRADING_FEE_PERCENT = 0.1; // 0.1% fee per trade (entry and exit)
const MAX_SLIPPAGE_PERCENT = 0.05; // Max 0.05% slippage


export interface IDataContext {
    presentDayData: PresentDayAnalysisResult | null;
    backtestData: BacktestAnalysisResult | null;
    isInitialLoading: boolean;
    isBacktestLoading: boolean;
    isRecalculating: boolean;
    error: string | null;
    livePrices: LivePrices | null;
    signalHistory: PresentDayAssetSignal[];
    history: { role: 'user' | 'model', text: string }[];
    isChatLoading: boolean;
    memeCoinSignals: MemeCoinSignal[] | null;
    completedTrades: CompletedTrade[];
    activeTrades: ActiveTrade[];
    apiKeys: ApiKey[];
    watchlist: string[];
    watchlistAnalysisResult: PresentDayAssetSignal | null;
    isWatchlistLoading: boolean;
    watchlistError: string | null;
    sentimentData: SentimentAnalysis[] | null;
    notifications: Notification[];
    runFullAnalysis: () => Promise<void>;
    loadBacktestData: () => Promise<void>;
    handleSendMessage: (message: string) => Promise<void>;
    updatePresentDaySignal: (type: 'buy' | 'sell', index: number, newSignal: PresentDayAssetSignal) => Promise<void>;
    replaceSignalsForHorizon: (horizon: HorizonKey, side: 'buy' | 'sell', newSignals: PresentDayAssetSignal[]) => void;
    addPresentDaySignal: (side: 'buy' | 'sell', newSignal: PresentDayAssetSignal) => void;
    addSignalToHistory: (signal: PresentDayAssetSignal) => void;
    loadedHorizons: Set<HorizonKey>;
    horizonsLoading: { [key in HorizonKey]?: boolean };
    lazyLoadHorizon: (horizon: HorizonKey) => Promise<void>;
    resetChatHistory: (initialMessage: string) => void;
    addToWatchlist: (asset: string) => void;
    removeFromWatchlist: (asset: string) => void;
    analyzeWatchlistAsset: (asset: string) => Promise<void>;
    markAllNotificationsAsRead: () => void;
    clearAllNotifications: () => void;
    addApiKey: (key: ApiKey) => void;
    removeApiKey: (id: string) => void;
}

const DataContext = createContext<IDataContext | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode, apiClient: ApiClient }> = ({ children, apiClient }) => {
    const { language } = useLanguage();
    const t = translations[language];

    const [presentDayData, setPresentDayData] = useState<PresentDayAnalysisResult | null>(null);
    const [backtestData, setBacktestData] = useState<BacktestAnalysisResult | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isBacktestLoading, setIsBacktestLoading] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [livePrices, setLivePrices] = useState<LivePrices | null>(null);
    const [signalHistory, setSignalHistory] = useState<PresentDayAssetSignal[]>([]);
    const [history, setHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [memeCoinSignals, setMemeCoinSignals] = useState<MemeCoinSignal[] | null>(null);
    const [completedTrades, setCompletedTrades] = useState<CompletedTrade[]>([]);
    
    // --- Phase 2: Watchlist State ---
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [watchlistAnalysisResult, setWatchlistAnalysisResult] = useState<PresentDayAssetSignal | null>(null);
    const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);
    const [watchlistError, setWatchlistError] = useState<string | null>(null);

    // --- Phase 3: Sentiment Analysis State ---
    const [sentimentData, setSentimentData] = useState<SentimentAnalysis[] | null>(null);

    // --- Phase 4: Notification State ---
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const previousTopSignalRef = useRef<string | null>(null);

    // --- Phase 4.5: Paper Trading State ---
    const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);


    const [loadedHorizons, setLoadedHorizons] = useState(new Set<HorizonKey>(['24h']));
    const [horizonsLoading, setHorizonsLoading] = useState<{[key in HorizonKey]?: boolean}>({});

    useEffect(() => {
        const savedHistory = localStorage.getItem(SIGNAL_HISTORY_KEY);
        if (savedHistory) {
            try { setSignalHistory(JSON.parse(savedHistory)); } catch (e) { console.error("Failed to parse signal history", e); }
        }
        const savedCompleted = localStorage.getItem(COMPLETED_TRADES_KEY);
        if (savedCompleted) {
            try { setCompletedTrades(JSON.parse(savedCompleted)); } catch (e) { console.error("Failed to parse completed trades", e); }
        }
        const savedWatchlist = localStorage.getItem(WATCHLIST_KEY);
        if (savedWatchlist) {
            try { setWatchlist(JSON.parse(savedWatchlist)); } catch (e) { console.error("Failed to parse watchlist", e); }
        }
        const savedNotifications = localStorage.getItem(NOTIFICATIONS_KEY);
        if (savedNotifications) {
            try { setNotifications(JSON.parse(savedNotifications)); } catch (e) { console.error("Failed to parse notifications", e); }
        }
        const savedActive = localStorage.getItem(ACTIVE_TRADES_KEY);
        if (savedActive) {
            try { setActiveTrades(JSON.parse(savedActive)); } catch (e) { console.error("Failed to parse active trades", e); }
        }
        const savedApiKeys = localStorage.getItem(API_KEYS_KEY);
        if (savedApiKeys) {
            try { setApiKeys(JSON.parse(savedApiKeys)); } catch (e) { console.error("Failed to parse API keys", e); }
        }
    }, []);

    const addSignalToHistory = useCallback((signal: PresentDayAssetSignal) => {
        setSignalHistory(prev => {
            const newHistory = [signal, ...prev].slice(0, 20); // Keep last 20 signals
            localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        setNotifications(prev => {
            const newNotification: Notification = {
                ...notification,
                id: `${notification.type}_${notification.assetName || ''}_${Date.now()}`,
                timestamp: new Date().toISOString(),
                read: false,
            };
            const updatedNotifications = [newNotification, ...prev].slice(0, 50); // Keep last 50
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
            return updatedNotifications;
        });
    }, []);

    const runFullAnalysis = useCallback(async () => {
        setIsRecalculating(true);
        setError(null);
        try {
            setBacktestData(null);
            
            const majorAssetsForSentiment = ['BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'PEPE', 'WIF'];
            
            const [presentDay, memeCoins, sentiment] = await Promise.all([
                apiClient.runFullAnalysis(),
                apiClient.fetchMemeCoinAnalysis(),
                apiClient.fetchSentimentAnalysis(majorAssetsForSentiment, language)
            ]);
            
            // Phase 4: Check for new top signal
            const newTopSignal = [...presentDay.presentDayBuySignals, ...presentDay.presentDaySellSignals].find(s => s.isTopSignal);
            if (newTopSignal && newTopSignal.assetName !== previousTopSignalRef.current) {
                addNotification({
                    type: 'new_top_signal',
                    message: t.newTopSignalAlert.replace('{assetName}', newTopSignal.assetName),
                    assetName: newTopSignal.assetName,
                });
                previousTopSignalRef.current = newTopSignal.assetName;
            } else if (!newTopSignal) {
                previousTopSignalRef.current = null;
            }

            // Phase 4.5: Automatically create active paper trades from new signals
            const allNewSignals = [...presentDay.presentDayBuySignals, ...presentDay.presentDaySellSignals];
            const newActiveTrades: ActiveTrade[] = allNewSignals
                .filter(signal => signal.signalType !== 'NEUTRO' && signal.livePrice)
                .map((signal): ActiveTrade => {
                    const initialEntryPrice = parseFloat(signal.livePrice!);
                    // Apply entry slippage
                    const slippage = (Math.random() * 2 - 1) * (MAX_SLIPPAGE_PERCENT / 100);
                    const finalEntryPrice = initialEntryPrice * (1 + slippage);
                    
                    return {
                        ...signal,
                        signalType: signal.signalType as 'COMPRA' | 'VENDA',
                        id: `${signal.assetName}-${signal.entryDatetime}`,
                        status: 'active',
                        entryPrice: finalEntryPrice,
                        currentPrice: finalEntryPrice,
                        livePnlUsd: 0,
                        livePnlPercentage: 0,
                        orderStatus: 'Pending',
                        executionDetails: t.statusPending,
                    };
                });

            setActiveTrades(prev => {
                const updatedTrades = [...prev, ...newActiveTrades];
                localStorage.setItem(ACTIVE_TRADES_KEY, JSON.stringify(updatedTrades));
                return updatedTrades;
            });

            // Set other data
            setPresentDayData(presentDay);
            setMemeCoinSignals(memeCoins);
            setSentimentData(sentiment);
            setLoadedHorizons(new Set<HorizonKey>(['24h']));
            
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsRecalculating(false);
            if (isInitialLoading) setIsInitialLoading(false);
        }
    }, [apiClient, isInitialLoading, language, addNotification, t]);
    

    // Phase 4.5, Pilar 3: Simulate order execution for pending trades
    useEffect(() => {
        const pendingTrades = activeTrades.filter(t => t.orderStatus === 'Pending');
        if (pendingTrades.length === 0) return;
    
        const timer = setTimeout(() => {
            setActiveTrades(currentTrades => {
                const updatedTrades = currentTrades.map(trade => {
                    if (trade.orderStatus === 'Pending') {
                        return { 
                            ...trade, 
                            orderStatus: 'Filled' as OrderStatus, 
                            executionDetails: t.tooltipFilled 
                        };
                    }
                    return trade;
                });
                localStorage.setItem(ACTIVE_TRADES_KEY, JSON.stringify(updatedTrades));
                return updatedTrades;
            });
        }, 1500 + Math.random() * 1000); // Simulate network latency
    
        return () => clearTimeout(timer);
    
    }, [activeTrades, t.tooltipFilled]);


    // Phase 4.5: Live monitoring of active paper trades with fees and slippage
    useEffect(() => {
        const monitorInterval = setInterval(async () => {
            const currentActiveTrades = JSON.parse(localStorage.getItem(ACTIVE_TRADES_KEY) || '[]') as ActiveTrade[];

            if (currentActiveTrades.length === 0) return;

            const assetsToUpdate = [...new Set(currentActiveTrades.map(t => t.assetName))];
            if (assetsToUpdate.length === 0) return;

            try {
                const prices = await apiClient.fetchPrices(assetsToUpdate);
                let tradesClosed = false;
                
                const updatedActiveTrades = [...currentActiveTrades];
                const newCompletedTrades: CompletedTrade[] = [];

                for (let i = updatedActiveTrades.length - 1; i >= 0; i--) {
                    const trade = updatedActiveTrades[i];
                    const priceInfo = prices[trade.assetName];

                    if (priceInfo && priceInfo.price) {
                        const currentPrice = parseFloat(priceInfo.price);
                        trade.currentPrice = currentPrice;
                        
                        // Calculate P/L with fees
                        const baseInvestment = 100;
                        let grossLivePnlPercentage;
                        if (trade.signalType === 'COMPRA') {
                            grossLivePnlPercentage = (currentPrice / trade.entryPrice - 1) * 100;
                        } else { // VENDA
                            grossLivePnlPercentage = (trade.entryPrice / currentPrice - 1) * 100;
                        }
                        const grossLivePnlUsd = (grossLivePnlPercentage / 100) * baseInvestment;
                        const entryFee = baseInvestment * (TRADING_FEE_PERCENT / 100);
                        const currentValue = baseInvestment + grossLivePnlUsd;
                        const estimatedExitFee = currentValue * (TRADING_FEE_PERCENT / 100);
                        const totalEstimatedFees = entryFee + estimatedExitFee;

                        trade.livePnlUsd = grossLivePnlUsd - totalEstimatedFees;
                        trade.livePnlPercentage = (trade.livePnlUsd / baseInvestment) * 100;

                        // Check for closure
                        const targetPrice = parseFloat(trade.target);
                        const stopLossPrice = parseFloat(trade.stopLoss);
                        let closed = false;
                        
                        if (trade.signalType === 'COMPRA' && (currentPrice >= targetPrice || currentPrice <= stopLossPrice)) {
                            closed = true;
                        } else if (trade.signalType === 'VENDA' && (currentPrice <= targetPrice || currentPrice >= stopLossPrice)) {
                            closed = true;
                        }

                        if (closed) {
                            tradesClosed = true;
                            // Apply exit slippage
                            const exitSlippage = (Math.random() * 2 - 1) * (MAX_SLIPPAGE_PERCENT / 100);
                            const adjustedExitPrice = currentPrice * (1 - exitSlippage); // Slippage against you

                            let grossPnlPercentage;
                            if (trade.signalType === 'COMPRA') {
                                grossPnlPercentage = (adjustedExitPrice / trade.entryPrice - 1) * 100;
                            } else { // VENDA
                                grossPnlPercentage = (trade.entryPrice / adjustedExitPrice - 1) * 100;
                            }
                            const grossPnlUsd = (grossPnlPercentage / 100) * baseInvestment;
                            
                            const finalEntryFee = baseInvestment * (TRADING_FEE_PERCENT / 100);
                            const exitValue = baseInvestment + grossPnlUsd;
                            const finalExitFee = exitValue * (TRADING_FEE_PERCENT / 100);
                            const totalFees = finalEntryFee + finalExitFee;

                            const netProfitUsd = grossPnlUsd - totalFees;
                            const netRoiPercentage = (netProfitUsd / baseInvestment) * 100;
                            
                            const outcome = netProfitUsd > 0.05 ? 'Win' : (netProfitUsd < -0.05 ? 'Loss' : 'Breakeven');

                            newCompletedTrades.push({
                                id: trade.id,
                                assetName: trade.assetName,
                                signalType: trade.signalType,
                                entryDatetime: trade.entryDatetime,
                                exitDatetime: new Date().toISOString(),
                                entryPrice: trade.entryPrice,
                                exitPrice: adjustedExitPrice,
                                target: trade.target,
                                stopLoss: trade.stopLoss,
                                outcome: outcome,
                                actualProfitUsd: netProfitUsd,
                                actualRoiPercentage: netRoiPercentage,
                                status: 'Closed',
                                feesUsd: totalFees,
                            });
                            updatedActiveTrades.splice(i, 1);
                        }
                    }
                }
                
                // Update states
                setActiveTrades(updatedActiveTrades);
                localStorage.setItem(ACTIVE_TRADES_KEY, JSON.stringify(updatedActiveTrades));

                if (tradesClosed) {
                    setCompletedTrades(prev => {
                        const allCompleted = [...newCompletedTrades, ...prev];
                        localStorage.setItem(COMPLETED_TRADES_KEY, JSON.stringify(allCompleted));
                        return allCompleted;
                    });
                }

            } catch (error) {
                console.error("Error during live monitoring:", error);
            }
        }, 20000); // Check every 20 seconds

        return () => clearInterval(monitorInterval);
    }, [apiClient]);


    // Phase 4 Logic: Continuous monitoring for notifications
    useEffect(() => {
        const interval = setInterval(() => {
            if (!presentDayData) return;

            const allSignals = [...presentDayData.presentDayBuySignals, ...presentDayData.presentDaySellSignals];
            
            for (const signal of allSignals) {
                if (!signal.livePrice || signal.signalType === 'NEUTRO') continue;

                const livePrice = parseFloat(signal.livePrice);
                const [entryStartStr, entryEndStr] = signal.entryRange.split('-').map(s => s.trim());
                const entryStart = parseFloat(entryStartStr);
                const entryEnd = entryEndStr ? parseFloat(entryEndStr) : entryStart;

                if (isNaN(livePrice) || isNaN(entryStart)) continue;

                const proximityThreshold = 0.02; // 2%
                let isNear = false;

                if (signal.signalType === 'COMPRA') {
                    const lowerBound = entryEnd * (1 - proximityThreshold);
                    if (livePrice >= lowerBound && livePrice <= entryEnd) {
                        isNear = true;
                    }
                } else { // VENDA
                    const upperBound = entryStart * (1 + proximityThreshold);
                     if (livePrice <= upperBound && livePrice >= entryStart) {
                        isNear = true;
                    }
                }

                if (isNear) {
                    const recentNotification = notifications.find(n => 
                        n.assetName === signal.assetName &&
                        n.type === 'price_proximity' &&
                        DateTime.fromISO(n.timestamp).diffNow('hours').as('hours') > -1 // Check if notified in the last hour
                    );
                    if (!recentNotification) {
                        addNotification({
                            type: 'price_proximity',
                            message: t.priceProximityAlert.replace('{assetName}', signal.assetName),
                            assetName: signal.assetName,
                        });
                    }
                }
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [presentDayData, notifications, addNotification, t.priceProximityAlert]);


    useEffect(() => {
        if(isInitialLoading) {
            runFullAnalysis();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const loadBacktestData = useCallback(async () => {
        setIsBacktestLoading(true);
        setError(null);
        try {
            const data = await apiClient.fetchBacktestAnalysis();
            setBacktestData(data);
        } catch (e: any) {
            console.error("Failed to load backtest data:", e.message);
            setError(e.message);
        } finally {
            setIsBacktestLoading(false);
        }
    }, [apiClient]);

    const updatePresentDaySignal = useCallback(async (type: 'buy' | 'sell', index: number, newSignal: PresentDayAssetSignal) => {
        setPresentDayData(prev => {
            if (!prev) return null;
            const signals = type === 'buy' ? [...prev.presentDayBuySignals] : [...prev.presentDaySellSignals];
            
            if (signals[index]) {
                addSignalToHistory(signals[index]);
            }

            signals[index] = newSignal;
            if (type === 'buy') {
                return { ...prev, presentDayBuySignals: signals };
            } else {
                return { ...prev, presentDaySellSignals: signals };
            }
        });
    }, [addSignalToHistory]);

    const addPresentDaySignal = useCallback((side: 'buy' | 'sell', newSignal: PresentDayAssetSignal) => {
        setPresentDayData(prev => {
            if (!prev) return null;
            if (side === 'buy') {
                return {
                    ...prev,
                    presentDayBuySignals: [...prev.presentDayBuySignals, newSignal]
                };
            } else {
                return {
                    ...prev,
                    presentDaySellSignals: [...prev.presentDaySellSignals, newSignal]
                };
            }
        });
    }, []);

    const replaceSignalsForHorizon = useCallback((horizon: HorizonKey, side: 'buy' | 'sell', newSignals: PresentDayAssetSignal[]) => {
        const horizonLabel = HORIZON_LABELS[horizon];
        setPresentDayData(prev => {
            if (!prev) return null;

            const signals = side === 'buy' ? [...prev.presentDayBuySignals] : [...prev.presentDaySellSignals];
            
            const otherHorizonsSignals = signals.filter(s => s.horizon !== horizonLabel);
            const updatedSignals = [...otherHorizonsSignals, ...newSignals];

            return side === 'buy'
                ? { ...prev, presentDayBuySignals: updatedSignals }
                : { ...prev, presentDaySellSignals: updatedSignals };
        });
    }, []);

    const lazyLoadHorizon = useCallback(async (horizon: HorizonKey) => {
        if (!presentDayData || loadedHorizons.has(horizon) || horizonsLoading[horizon]) return;
        
        setHorizonsLoading(prev => ({ ...prev, [horizon]: true }));
        try {
            const allAssetNames = [
                ...presentDayData.presentDayBuySignals.map(s => s.assetName),
                ...presentDayData.presentDaySellSignals.map(s => s.assetName),
            ];
            
            const [newBuySignals, newSellSignals] = await Promise.all([
                apiClient.fetchNewSignalsForHorizon(horizon, 'buy', 4, allAssetNames),
                apiClient.fetchNewSignalsForHorizon(horizon, 'sell', 4, allAssetNames)
            ]);
            
            replaceSignalsForHorizon(horizon, 'buy', newBuySignals);
            replaceSignalsForHorizon(horizon, 'sell', newSellSignals);

            setLoadedHorizons(prev => new Set(prev).add(horizon));
            
        } catch(e: any) {
            console.error(`Failed to lazy load horizon ${horizon}:`, e);
        } finally {
            setHorizonsLoading(prev => ({ ...prev, [horizon]: false }));
        }
    }, [apiClient, presentDayData, loadedHorizons, horizonsLoading, replaceSignalsForHorizon]);

    const resetChatHistory = useCallback((initialMessage: string) => {
        setHistory([{ role: 'model', text: initialMessage }]);
    }, []);

    const handleSendMessage = useCallback(async (message: string) => {
        if (!presentDayData) return;

        setHistory(prev => [...prev, { role: 'user', text: message }]);
        setIsChatLoading(true);

        try {
            const response = await apiClient.sendMessage({
                message,
                presentDayData,
                backtestData,
            });
            setHistory(prev => [...prev, { role: 'model', text: response.text }]);
        } catch (e: any) {
            setHistory(prev => [...prev, { role: 'model', text: `Error: ${e.message}` }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [presentDayData, backtestData, apiClient]);

    // --- Phase 2: Watchlist Functions ---
    const addToWatchlist = useCallback((asset: string) => {
        const upperAsset = asset.toUpperCase();
        if (!upperAsset || watchlist.includes(upperAsset)) return;

        setWatchlist(prev => {
            const newWatchlist = [upperAsset, ...prev];
            localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newWatchlist));
            return newWatchlist;
        });
    }, [watchlist]);

    const removeFromWatchlist = useCallback((asset: string) => {
        setWatchlist(prev => {
            const newWatchlist = prev.filter(a => a !== asset);
            localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newWatchlist));
            return newWatchlist;
        });
    }, []);

    const analyzeWatchlistAsset = useCallback(async (asset: string) => {
        setIsWatchlistLoading(true);
        setWatchlistError(null);
        setWatchlistAnalysisResult(null);
        try {
            // Using '24 Horas' as the default horizon for on-demand analysis
            const data = await apiClient.fetchTacticalAnalysis(asset, 'pt', '24 Horas');
            setWatchlistAnalysisResult(data);
        } catch (e: any) {
            setWatchlistError(e.message || 'Análise falhou.');
        } finally {
            setIsWatchlistLoading(false);
        }
    }, [apiClient]);

    // --- Phase 4: Notification Management ---
    const markAllNotificationsAsRead = useCallback(() => {
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, read: true }));
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
        localStorage.removeItem(NOTIFICATIONS_KEY);
    }, []);

    // --- Phase 4.5, Pillar 2: API Key Management ---
    const addApiKey = useCallback((key: ApiKey) => {
        setApiKeys(prev => {
            const newKeys = [...prev, key];
            localStorage.setItem(API_KEYS_KEY, JSON.stringify(newKeys));
            return newKeys;
        });
    }, []);

    const removeApiKey = useCallback((id: string) => {
        setApiKeys(prev => {
            const newKeys = prev.filter(k => k.id !== id);
            localStorage.setItem(API_KEYS_KEY, JSON.stringify(newKeys));
            return newKeys;
        });
    }, []);


    return (
        <DataContext.Provider value={{
            presentDayData,
            backtestData,
            isInitialLoading,
            isBacktestLoading,
            isRecalculating,
            error,
            livePrices,
            signalHistory,
            history,
            isChatLoading,
            memeCoinSignals,
            completedTrades,
            activeTrades,
            apiKeys,
            watchlist,
            watchlistAnalysisResult,
            isWatchlistLoading,
            watchlistError,
            sentimentData,
            notifications,
            runFullAnalysis,
            loadBacktestData,
            handleSendMessage,
            updatePresentDaySignal,
            addPresentDaySignal,
            replaceSignalsForHorizon,
            addSignalToHistory,
            loadedHorizons,
            horizonsLoading,
            lazyLoadHorizon,
            resetChatHistory,
            addToWatchlist,
            removeFromWatchlist,
            analyzeWatchlistAsset,
            markAllNotificationsAsRead,
            clearAllNotifications,
            addApiKey,
            removeApiKey,
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = (): IDataContext => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};