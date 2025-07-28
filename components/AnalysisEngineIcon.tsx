import React from 'react';

const AnalysisEngineIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    {/* Core */}
    <circle cx="50" cy="50" r="8" className="stroke-primary animate-core-pulse" strokeWidth="2"/>

    {/* Rings */}
    <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" className="animate-spin" style={{animationDuration: '10s', transformOrigin: '50% 50%'}} />
    <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" opacity="0.3" className="animate-spin-reverse" style={{animationDuration: '15s', transformOrigin: '50% 50%'}} />
    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.5" opacity="0.2" className="animate-spin" style={{animationDuration: '25s', transformOrigin: '50% 50%'}} />
    
    {/* Data points orbiting */}
    <g className="animate-spin" style={{animationDuration: '8s', transformOrigin: '50% 50%'}}>
        <circle cx="70" cy="50" r="2.5" fill="currentColor" className="text-primary/80" />
    </g>
     <g className="animate-spin-reverse" style={{animationDuration: '12s', transformOrigin: '50% 50%'}}>
        <circle cx="18" cy="50" r="2" fill="currentColor" className="text-secondary/80" />
    </g>
  </svg>
);

export default AnalysisEngineIcon;
