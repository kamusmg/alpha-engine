
import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { PresentDayAssetSignal, LivePrices, BacktestAnalysisResult, PresentDayAnalysisResult } from '../types';
import { fetchBacktestAnalysis, fetchPresentDayAnalysis, createChatSession } from '../services/geminiService';
import { fetchLivePrices, fetchPrices } from '../services/marketService';
import type { Chat } from '@google/genai';

const SIGNAL_HISTORY_KEY = 'cryptoSignalHistory';

export interface IDataContext {
    presentDayData: PresentDayAnalysisResult | null;
    backtestData: BacktestAnalysisResult | null;
    isInitialLoading: boolean;
    isBacktestLoading: boolean;
    isRecalculating: boolean;
    error: string | null;
    livePrices: LivePrices | null;
    signalHistory: PresentDayAssetSignal[];
    chat: Chat | null;
    history: { role: 'user' | 'model', text: string }[];
    isChatLoading: boolean;
    runFullAnalysis: () => Promise<void>;
    loadBacktestData: () => Promise<void>;
    handleSendMessage: (message: string) => Promise<void>;
    updatePresentDaySignal: (type: 'buy' | 'sell', index: number, newSignal: PresentDayAssetSignal) => void;
    addSignalToHistory: (signal: PresentDayAssetSignal) => void;
    getSignalHistory: () => PresentDayAssetSignal[];
    resetChatHistory: (initialMessage: string) => void;
}

export const DataContext = createContext<IDataContext | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- State Management ---
    const [presentDayData, setPresentDayData] = useState<PresentDayAnalysisResult | null>(null);
    const [backtestData, setBacktestData] = useState<BacktestAnalysisResult | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
    const [isBacktestLoading, setIsBacktestLoading] = useState<boolean>(false);
    const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [livePrices, setLivePrices] = useState<LivePrices | null>(null);
    const [chat, setChat] = useState<Chat | null>(null);
    const [history, setHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
    const [signalHistory, setSignalHistory] = useState<PresentDayAssetSignal[]>([]);

    // --- Signal History Management ---
    const getSignalHistory = useCallback((): PresentDayAssetSignal[] => {
        try {
            const storedHistory = localStorage.getItem(SIGNAL_HISTORY_KEY);
            return storedHistory ? JSON.parse(storedHistory) : [];
        } catch (e) {
            console.warn("Could not retrieve signal history from localStorage", e);
            return [];
        }
    }, []);

    const addSignalToHistory = useCallback((signal: PresentDayAssetSignal) => {
        setSignalHistory(prevHistory => {
            const newHistory = [signal, ...prevHistory].slice(0, 20); // Keep last 20
            try {
                localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(newHistory));
            } catch (e) {
                console.warn("Could not save signal history to localStorage", e);
            }
            return newHistory;
        });
    }, []);
    
    useEffect(() => {
        setSignalHistory(getSignalHistory());
    }, [getSignalHistory]);

    // --- Core Data Fetching Logic ---
    const _internalRunAnalysis = useCallback(async () => {
        setError(null);
        setIsInitialLoading(true);

        try {
            const prices = await fetchLivePrices();
            setLivePrices(prices);

            const presentDayResult = await fetchPresentDayAnalysis(prices);
            setPresentDayData(presentDayResult);
            
            const chatSession = await createChatSession(presentDayResult, null);
            setChat(chatSession);

        } catch (e: any) {
            setError(e.message || 'An unknown error occurred during the initial analysis.');
        } finally {
            setIsInitialLoading(false);
        }
    }, []);

    const runFullAnalysis = useCallback(async () => {
        setIsRecalculating(true);
        setBacktestData(null); // Clear old backtest data
        await _internalRunAnalysis();
        setIsRecalculating(false);
    }, [_internalRunAnalysis]);

    const loadBacktestData = useCallback(async () => {
        if (backtestData || isBacktestLoading) return; // Don't refetch if already loaded or loading

        setIsBacktestLoading(true);
        setError(null);

        try {
            const backtestResult = await fetchBacktestAnalysis();
            setBacktestData(backtestResult);

            if (presentDayData) {
                const chatSession = await createChatSession(presentDayData, backtestResult);
                setChat(chatSession);
            }
        } catch (e: any) {
            setError(e.message || "An unknown error occurred while loading backtest data.");
        } finally {
            setIsBacktestLoading(false);
        }
    }, [backtestData, isBacktestLoading, presentDayData]);

    useEffect(() => {
        _internalRunAnalysis();
    }, [_internalRunAnalysis]);

    // --- Chat Management ---
    const handleSendMessage = useCallback(async (message: string) => {
        if (!chat) return;

        setIsChatLoading(true);
        setHistory(prev => [...prev, { role: 'user', text: message }]);
        
        try {
            const response = await chat.sendMessage({ message });
            const modelResponse = response.text;
            setHistory(prev => [...prev, { role: 'model', text: modelResponse }]);
        } catch (e: any) {
            console.error("Error sending message to chat:", e);
            setHistory(prev => [...prev, { role: 'model', text: 'Error: Could not get a response.' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [chat]);
    
    const resetChatHistory = useCallback((initialMessage: string) => {
        setHistory([{ role: 'model', text: initialMessage }]);
    }, []);
    
    // --- Signal Update Logic ---
    const updatePresentDaySignal = useCallback((type: 'buy' | 'sell', index: number, newSignal: PresentDayAssetSignal) => {
        setPresentDayData(prevData => {
            if (!prevData) return null;

            const newData = { ...prevData };
            const signals = type === 'buy' ? [...newData.presentDayBuySignals] : [...newData.presentDaySellSignals];
            
            if (signals[index]) {
                addSignalToHistory(signals[index]);
            }
                
            signals[index] = newSignal;

            if (type === 'buy') {
                newData.presentDayBuySignals = signals;
            } else {
                newData.presentDaySellSignals = signals;
            }
            
            // Recreate chat with updated present day data
            createChatSession(newData, backtestData).then(setChat);

            return newData;
        });
    }, [addSignalToHistory, backtestData]);

    const value: IDataContext = {
        presentDayData,
        backtestData,
        isInitialLoading,
        isBacktestLoading,
        isRecalculating,
        error,
        livePrices,
        signalHistory,
        chat,
        history,
        isChatLoading,
        runFullAnalysis,
        loadBacktestData,
        handleSendMessage,
        updatePresentDaySignal,
        addSignalToHistory,
        getSignalHistory,
        resetChatHistory,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = (): IDataContext => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
