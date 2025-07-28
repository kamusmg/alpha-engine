
import React from 'react';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface BacktestSummaryCardProps {
  totalInvestment: number;
  totalFinalValue: number;
  totalProfit: number;
  totalRoiPercentage: number;
}

const TrophyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a2.25 2.25 0 010-4.5h9a2.25 2.25 0 010 4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12.75l.75-2.25h9l.75 2.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 6.75h4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-2.25" />
    </svg>
);


const BacktestSummaryCard: React.FC<BacktestSummaryCardProps> = ({ totalInvestment, totalFinalValue, totalProfit, totalRoiPercentage }) => {
    const isProfit = totalProfit > 0;

    return (
        <div className="bg-gradient-to-br from-indigo-900/50 via-surface to-background/30 border border-secondary/50 rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
                <div className="bg-secondary/10 p-3 rounded-full">
                    <TrophyIcon />
                </div>
                <h3 className="text-2xl font-bold text-text ml-4">Resultado Final do Backtest</h3>
            </div>
            <div className="text-center">
                <p className="text-text-secondary text-lg mb-2">
                    Investimento Total: <span className="font-bold text-text">{formatCurrency(totalInvestment)}</span>
                </p>
                <div className="flex items-center justify-center gap-4 text-2xl font-bold text-text mb-4">
                    <span>➔</span>
                    <span className={isProfit ? 'text-green-400' : 'text-red-400'}>{formatCurrency(totalFinalValue)}</span>
                </div>
                <div className="bg-background/50 rounded-lg p-4 inline-block">
                    <p className="text-sm text-text-secondary">Lucro / Prejuízo Líquido</p>
                    <p className={`text-4xl font-bold ${isProfit ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(totalProfit)}
                    </p>
                    <p className={`text-xl font-semibold ${isProfit ? 'text-success' : 'text-danger'}`}>
                        ({formatPercentage(totalRoiPercentage)})
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BacktestSummaryCard;
