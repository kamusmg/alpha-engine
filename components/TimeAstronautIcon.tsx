
import React from 'react';

const TimeAstronautIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className || "h-6 w-6"} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5"
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
        <path d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M9 19a7.1 7.1 0 016 0" />
    </svg>
);

export default TimeAstronautIcon;
