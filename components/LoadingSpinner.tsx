import React, { useState, useEffect } from 'react';
import AnalysisEngineIcon from './AnalysisEngineIcon';

const loadingSteps = [
    "Inicializando motor de análise preditiva...",
    "Conectando a fontes de dados de mercado em tempo real...",
    "Requisitando dados históricos para o backtest...",
    "Executando simulações em múltiplos horizontes de tempo...",
    "Aplicando modelos de risco e volatilidade (VTEX, IVL)...",
    "Processando resultados e calculando métricas de performance...",
    "Realizando auto-diagnóstico e identificando padrões de falha...",
    "Analisando o contexto macroeconômico atual...",
    "Gerando sinais de alta probabilidade para o cenário presente...",
    "Compilando relatório de inteligência e plano de ação...",
];

const LoadingSpinner: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prevStep) => (prevStep + 1) % loadingSteps.length);
        }, 2200); // Change step every 2.2 seconds

        return () => clearInterval(interval);
    }, []);

    const starBg1 = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'none\'/%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'0.5\' fill=\'%23F3F4F6\'/%3E%3C/svg%3E")';
    const starBg2 = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'150\' height=\'150\'%3E%3Crect width=\'150\' height=\'150\' fill=\'none\'/%3E%3Ccircle cx=\'20\' cy=\'80\' r=\'1\' fill=\'%239CA3AF\'/%3E%3Ccircle cx=\'100\' cy=\'30\' r=\'1\' fill=\'%239CA3AF\'/%3E%3C/svg%3E")';

    return (
        <div className="relative flex flex-col items-center justify-center h-screen text-text bg-background overflow-hidden">
            {/* Starry background layers for parallax effect */}
            <div className="absolute inset-0 bg-repeat bg-center animate-scroll-bg" style={{backgroundImage: starBg1, animationDuration: '150s'}}></div>
            <div className="absolute inset-0 bg-repeat bg-center animate-scroll-bg" style={{backgroundImage: starBg2, animationDuration: '100s'}}></div>
            
            <div className="relative flex flex-col items-center justify-center text-center z-10 p-4">
                
                {/* Analysis Engine Icon */}
                <div className="relative mb-8">
                     <AnalysisEngineIcon className="h-32 w-32 text-primary" />
                </div>
                
                {/* Loading Text */}
                <div className="relative w-full max-w-lg">
                     <h2 className="text-3xl font-bold mb-4 text-white">Calibrando Motor Preditivo</h2>
                     <div style={{minHeight: '28px'}}>
                        <p 
                            key={currentStep} 
                            className="text-lg text-text-secondary animate-text-fade-in"
                        >
                            {loadingSteps[currentStep]}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingSpinner;