
import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';

import AICoreMonitor from './AICoreMonitor';
import RobustnessAudit from './RobustnessAudit';

import AICoreMonitorSkeleton from './skeletons/AICoreMonitorSkeleton';

const AdvancedMonitoringLoader: React.FC = () => {
    const { 
        backtestData, 
        presentDayData,
        isBacktestLoading, 
        loadBacktestData 
    } = useData();
    
    useEffect(() => {
        loadBacktestData();
    }, [loadBacktestData]);

    return (
        <div className="space-y-12">
            {(isBacktestLoading || !backtestData || !presentDayData) ? (
                <AICoreMonitorSkeleton />
            ) : (
                <AICoreMonitor 
                    presentDayData={presentDayData} 
                    backtestData={backtestData} 
                />
            )}
            <RobustnessAudit />
        </div>
    );
};

export default AdvancedMonitoringLoader;
