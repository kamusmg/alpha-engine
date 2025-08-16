



import React from 'react';
import TechnicalAnalysisIcon from './TechnicalAnalysisIcon.tsx';
import EsotericAnalysisIcon from './EsotericAnalysisIcon.tsx';

interface AnalysisCardProps {
    title: string;
    content: string;
    type: 'technical' | 'esoteric';
    size?: 'sm' | 'base';
}

const typeConfig = {
    technical: { titleColor: 'text-primary', Icon: TechnicalAnalysisIcon },
    esoteric: { titleColor: 'text-secondary', Icon: EsotericAnalysisIcon }
};

const sizeConfig = {
    sm: {
        title: 'text-xs font-bold uppercase tracking-wider',
        icon: 'h-4 w-4',
        content: 'text-xs'
    },
    base: {
        title: 'text-sm font-bold uppercase tracking-wider',
        icon: 'h-5 w-5',
        content: 'text-sm'
    }
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ title, content, type, size = 'sm' }) => {
    const config = typeConfig[type];
    const s = sizeConfig[size];

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <config.Icon className={`${s.icon} ${config.titleColor}`} />
                <h4 className={`${s.title} ${config.titleColor}`}>{title}</h4>
            </div>
            <p className={`text-text-secondary leading-relaxed ${s.content}`}>{content}</p>
        </div>
    );
};

export default AnalysisCard;