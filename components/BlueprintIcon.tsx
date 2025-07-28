
import React from 'react';

const BlueprintIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-12a2.25 2.25 0 01-2.25-2.25V3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-3.75m0 0a3.75 3.75 0 013.75-3.75h1.5a3.75 3.75 0 013.75 3.75m-7.5 0a3.75 3.75 0 00-3.75-3.75h-1.5a3.75 3.75 0 00-3.75 3.75m10.5 0v3.75" />
    </svg>
);

export default BlueprintIcon;
