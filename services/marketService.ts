
import { LivePrices } from '../types';

/**
 * Formats a given ticker string into the format expected by Binance API (e.g., 'BTC' -> 'BTCUSDT').
 * This is a robust formatter to handle various inputs (e.g., "Pepe (PEPE)", "BTC/USDT") and prevent N/A errors,
 * which is critical for real-time operation.
 */
const formatBinanceTicker = (ticker: string): string => {
    let symbol = ticker.trim();
    
    // Handles "Pepe (PEPE)" -> "PEPE"
    const match = symbol.match(/\(([^)]+)\)/);
    if (match) {
        symbol = match[1];
    }

    // Handles "BTC/USDT" -> "BTCUSDT"
    symbol = symbol.replace('/', '');

    // Ensures it ends with USDT if not already present, avoiding double suffixes
    if (!symbol.endsWith('USDT')) {
        symbol = `${symbol}USDT`;
    }

    return symbol.toUpperCase();
};

/**
 * Fetches the live price for a single asset ticker from Binance.
 * @param ticker The asset ticker (e.g., 'BTC', 'WIF').
 * @returns The price as a string, or null if not found or an error occurs.
 */
export const fetchPriceForTicker = async (ticker: string): Promise<string | null> => {
    const symbol = formatBinanceTicker(ticker);
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`);
        if (!response.ok) {
            console.warn(`Could not fetch price for ${symbol}, status: ${response.status}`);
            return null;
        }
        const data = await response.json();
        return data.price;
    } catch (error) {
        console.error(`Error fetching price for ${ticker}:`, error);
        return null;
    }
};

/**
 * Fetches live prices for a list of asset tickers from Binance in a single batch request.
 * @param tickers An array of asset tickers (e.g., ['BTC', 'ETH']).
 * @returns A LivePrices object mapping original tickers to their prices.
 */
export const fetchPrices = async (tickers: string[]): Promise<LivePrices> => {
    if (tickers.length === 0) {
        return {};
    }

    const tickerMap = new Map<string, string>();
    tickers.forEach(t => {
        tickerMap.set(formatBinanceTicker(t), t);
    });

    const formattedTickers = Array.from(tickerMap.keys());
    const symbolsParam = JSON.stringify(formattedTickers);
    // FIX: The 'symbols' parameter for the Binance API expects a URL-encoded JSON string array.
    // The previous implementation passed the unencoded string, causing a "Failed to fetch" error due to invalid URL characters.
    // We now use encodeURIComponent to correctly format the parameter.
    const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(symbolsParam)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch batch prices from Binance API: ${response.statusText}`);
            throw new Error(`Binance API error: ${response.statusText}`);
        }
        const data: { symbol: string; price: string }[] = await response.json();

        const prices: LivePrices = {};
        data.forEach(item => {
            const originalTicker = tickerMap.get(item.symbol);
            if (originalTicker) {
                prices[originalTicker] = item.price;
            }
        });

        // Ensure all requested tickers are present in the final object, even if as null
        tickers.forEach(t => {
            if (!(t in prices)) {
                prices[t] = null;
            }
        });
        
        return prices;
    } catch (error) {
        console.error('Error fetching batch prices:', error);
        // On error, return an object with all tickers mapped to null.
        const errorPrices: LivePrices = {};
        tickers.forEach(t => { errorPrices[t] = null; });
        return errorPrices;
    }
};

/**
 * Fetches the live prices for the major assets required by the main dashboard.
 * @returns A LivePrices object for major assets.
 */
export const fetchLivePrices = async (): Promise<LivePrices> => {
    const majorAssets = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'LTC', 'MATIC', 'DOT'];
    return fetchPrices(majorAssets);
};
