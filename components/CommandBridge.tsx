import React, { useState, useRef, useEffect } from 'react';
import MoonPhaseIcon from './MoonPhaseIcon';
import UserIcon from './UserIcon';
import SendIcon from './SendIcon';

interface CommandBridgeProps {
  history: { role: 'user' | 'model'; text: string }[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

const CommandBridge: React.FC<CommandBridgeProps> = ({ history, onSendMessage, isLoading, disabled }) => {
    const [input, setInput] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    }

    useEffect(scrollToBottom, [history, isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading && !disabled) {
            onSendMessage(input);
            setInput('');
        }
    };

    const handleSuggestedPrompt = (prompt: string) => {
        if (!isLoading && !disabled) {
            onSendMessage(prompt);
        }
    }

    const suggestedPrompts = [
        "Resuma os pontos fortes do backtest.",
        "Qual é o maior risco para os sinais de compra de hoje?",
        "Explique a justificativa esotérica para o sinal de BTC.",
        "Por que a probabilidade de sucesso real está como está?",
    ];

    return (
        <div className="bg-gradient-to-br from-surface to-background/50 border border-border/70 rounded-xl p-6 shadow-lg">
            <h3 className="text-2xl font-bold text-text mb-4">Ponte de Comando Alpha</h3>
            
            <div 
                ref={scrollContainerRef}
                className="h-80 overflow-y-auto bg-background/50 p-4 rounded-lg mb-4 flex flex-col space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-surface"
            >
                {history.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 max-w-lg ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-secondary/20' : 'bg-primary/20'}`}>
                            {msg.role === 'user' ? <UserIcon className="h-5 w-5 text-secondary" /> : <MoonPhaseIcon className="h-5 w-5 text-primary" />}
                        </div>
                        <div className={`p-3 rounded-lg text-sm leading-relaxed ${msg.role === 'user' ? 'bg-secondary/20 text-text' : 'bg-surface text-text-secondary'}`}>
                           <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 max-w-lg self-start">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-primary/20">
                            <MoonPhaseIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="p-3 rounded-lg bg-surface text-text-secondary">
                           <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 bg-primary/50 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></span>
                                <span className="h-2 w-2 bg-primary/50 rounded-full animate-pulse" style={{animationDelay: '200ms'}}></span>
                                <span className="h-2 w-2 bg-primary/50 rounded-full animate-pulse" style={{animationDelay: '400ms'}}></span>
                           </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mb-4">
                <p className="text-xs text-text-secondary mb-2">Sugestões de comando:</p>
                <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map(prompt => (
                        <button 
                            key={prompt} 
                            onClick={() => handleSuggestedPrompt(prompt)}
                            disabled={isLoading || disabled}
                            className="text-xs bg-surface hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed text-text-secondary px-3 py-1 rounded-full transition-colors"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={disabled ? "Aguardando inicialização do núcleo Alpha..." : "Digite sua ordem ou pergunta..."}
                    disabled={isLoading || disabled}
                    className="flex-grow w-full bg-background/50 border border-border rounded-lg px-4 py-2 text-white placeholder-text-secondary/50 focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-50"
                    aria-label="Caixa de texto para enviar mensagem à IA Alpha"
                />
                <button 
                    type="submit" 
                    disabled={isLoading || disabled || !input.trim()} 
                    className="flex-shrink-0 bg-primary text-white p-3 rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Enviar mensagem"
                >
                    <SendIcon className="h-5 w-5" />
                </button>
            </form>
        </div>
    );
};

export default CommandBridge;