
import React from 'react';

const MoonPhaseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={className || "h-12 w-12 text-primary"}
    >
        <path d="M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5zM12 18.25a6.25 6.25 0 010-12.5 7.72 7.72 0 000 12.5z" />
    </svg>
);

export default MoonPhaseIcon;
