import React from 'react';
import { BacktestSignal } from '../types';
import SignalCard from './SignalCard';

interface BacktestHorizonSectionProps {
    title: string;
    signals: [BacktestSignal, BacktestSignal];
}

const BacktestHorizonSection: React.FC<BacktestHorizonSectionProps> = ({ title, signals }) => {
    return (
        <section>
            <h2 className="text-3xl font-bold text-text mb-6 pb-2 border-b-2 border-border">{title}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SignalCard signal={signals[0]} />
                <SignalCard signal={signals[1]} />
            </div>
        </section>
    );
}

export default BacktestHorizonSection;
