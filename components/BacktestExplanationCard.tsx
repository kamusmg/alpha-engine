
import React from 'react';
import TimeAstronautIcon from './TimeAstronautIcon';

const BacktestExplanationCard: React.FC = () => (
    <div className="bg-surface/50 border border-border/50 rounded-xl p-6 mb-12 flex flex-col sm:flex-row gap-6 items-center">
        <div className="flex-shrink-0">
            <TimeAstronautIcon className="h-20 w-20 text-primary" />
        </div>
        <div>
            <h3 className="text-xl font-bold text-primary mb-2">Como o Backtest Funciona?</h3>
            <p className="text-text-secondary leading-relaxed">
                O motor de IA realiza uma "viagem no tempo" para uma data aleatória no passado, operando em um cenário de mercado onde não conhece o futuro. Ele toma decisões de compra e venda com base nos seus modelos preditivos. Depois, os resultados são comparados com os dados reais do que aconteceu, e o sistema analisa seus acertos e erros para evoluir e aprimorar seus próprios algoritmos. É um campo de treinamento para deixar a IA mais inteligente.
            </p>
        </div>
    </div>
);

export default BacktestExplanationCard;
