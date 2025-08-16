import { GoogleGenAI, Type, Chat } from "@google/genai";
import { SimulationResult, PresentDayAssetSignal, Horizon, ChartAnalysisResult, SelfAnalysis, ForgeActionPlan, AuditReport, LivePrices, ChartAnalysisRecommendation, InstitutionalAssetAnalysis, BacktestAnalysisResult, PresentDayAnalysisResult, ChecklistResult, GatedSignalResult, MacroIndicator, TacticalIdea, MemeCoinSignal, SentimentAnalysis } from '../types.ts';
import { LucraSignal } from '../types/lucra.ts';
import { DateTime } from 'luxon';
import { formatCurrency } from '../utils/formatters.ts';
import { fetchPrices, fetchPriceForTicker } from './marketService.ts';
import { getBinanceServerTime } from './timeService.ts';
import { MIN_ROI, HORIZON_LABELS, TARGET_PER_SIDE } from './horizonPolicy.ts';

// The API key is expected to be managed by the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Cache for Present Day Analysis ---
let lastPresentDayAnalysis: PresentDayAnalysisResult | null = null;
let chat: Chat | null = null;

export const setLastPresentDayAnalysis = (result: PresentDayAnalysisResult) => {
    lastPresentDayAnalysis = result;
};

export const getLastPresentDayAnalysis = (): PresentDayAnalysisResult | null => {
    return lastPresentDayAnalysis;
};


// --- Centralized Directives for Consistency and Performance ---

const marketRegimeDirective = `
    **DIRETIVA DE REGIME DE MERCADO v2.0 - ANÁLISE PRIORITÁRIA**
    Sua primeira e mais importante tarefa é classificar o estado atual do mercado de criptomoedas em um dos seguintes regimes. Esta classificação DEVE ser o primeiro indicador no 'macroContext'.

    **REGIMES POSSÍVEIS:**
    1.  **RALI DE ALTA (Bull Rally):** Tendência de alta clara e sustentada no BTC e ETH. O sentimento geral é otimista (ganância). O capital está fluindo para o mercado.
    2.  **TENDÊNCIA DE BAIXA (Bear Trend):** Tendência de baixa clara e sustentada. O sentimento é pessimista (medo). Fundamentos macroeconômicos negativos.
    3.  **MERCADO LATERAL (Range-Bound / Chop):** Preços se movendo dentro de um range definido, sem direção clara. Períodos de baixa liquidez e volatilidade imprevisível.
    4.  **INCERTEZA VOLÁTIL (Volatile Uncertainty):** Movimentos de preço bruscos e de grande amplitude em ambas as direções. Geralmente ocorre perto de eventos macroeconômicos importantes ou notícias inesperadas.

    Sua análise DEVE começar com esta classificação. O indicador deve se chamar "Regime de Mercado Atual".
`;

const adaptiveRiskDirective = `
    **DIRETIVA DE GESTÃO DE RISCO ADAPTATIVA v1.0 - REGRA MESTRA**
    Com base no 'Regime de Mercado' identificado, você DEVE ajustar seus parâmetros de risco para TODAS as operações. Esta diretiva modifica a RQS padrão.
    
    1.  **SE 'RALI DE ALTA':**
        -   **RR Mínimo:** 1.5 para LONGs.
        -   **RR Mínimo para SHORTs:** 2.0 (Shorts são contra-tendência e mais arriscados).
        -   **Seleção de Ativos:** Priorize altcoins com beta alto e bom momento.
    
    2.  **SE 'TENDÊNCIA DE BAIXA':**
        -   **RR Mínimo:** 1.8 para SHORTs.
        -   **RR Mínimo para LONGs:** 2.5 (Longs são extremamente arriscados).
        -   **Seleção de Ativos:** Priorize SHORTS em ativos com nota fundamental (Grade) 'C' ou inferior.
        
    3.  **SE 'MERCADO LATERAL':**
        -   **RR Mínimo:** 2.0 para TODAS as operações. Aumentamos a exigência para compensar a falta de tendência clara.
        -   **Foco:** Operar apenas em ativos com ranges de preço bem definidos e históricos. Evitar ativos com rompimentos recentes.
        
    4.  **SE 'INCERTEZA VOLÁTIL':**
        -   **Ação Principal:** **NÃO OPERAR**. A prioridade máxima é a preservação de capital.
        -   **RR Mínimo:** 3.0 para qualquer operação considerada. Sinais devem ser 'NEUTRO' por padrão.
        -   **Justificativa:** A justificativa para sinais 'NEUTRO' deve ser "Preservando capital devido à extrema volatilidade e imprevisibilidade do mercado."
`;


const strategyPlaybooksDirective = `
    **DIRETIVA DE PLAYBOOKS DE ESTRATÉGIA v2.0 - TRADING CONTEXTUAL**
    Após determinar o 'Regime de Mercado' e o Risco Adaptativo, você DEVE aplicar o playbook de estratégia correspondente para gerar TODOS os sinais de oportunidade. A justificativa técnica de CADA sinal DEVE mencionar qual playbook foi usado.

    **1. PLAYBOOK: RALI DE ALTA (Bull Rally)**
    - **Foco:** COMPRA (Long).
    - **Estratégia Principal:** "Comprar na Baixa" (Buy the Dip). Procure por correções saudáveis e pullbacks para médias móveis de suporte (ex: EMA 21 no gráfico de 4h) como pontos de entrada.
    - **Sinais de VENDA:** Seja extremamente cético. Apenas considere vendas se houver uma forte divergência de baixa em múltiplos timeframes ou sinais claros de exaustão de volume.

    **2. PLAYBOOK: TENDÊNCIA DE BAIXA (Bear Trend)**
    - **Foco:** VENDA (Short).
    - **Estratégia Principal:** "Vender na Alta" (Short the Rip). Procure por ralis de alívio para níveis de resistência chave (ex: último topo rompido) como pontos de entrada para short.
    - **Sinais de COMPRA:** Extremamente arriscados. Apenas considere compras se houver uma capitulação de volume extremo e sinais de reversão muito fortes em timeframes maiores (diário). Use stops curtos.

    **3. PLAYBOOK: MERCADO LATERAL (Range-Bound / Chop)**
    - **Estratégia Principal:** Foco em Reversão à Média. Comprar perto do suporte do range, vender perto da resistência. Priorize ativos com histórico de respeitar os limites do range.
    - **AÇÃO CRÍTICA:** Se o range for muito estreito ou a volatilidade muito errática, a melhor ação é **NÃO OPERAR**. Gere sinais 'NEUTRO' e justifique a decisão de ficar de fora para evitar perdas por 'whipsaws'.

    **4. PLAYBOOK: INCERTEZA VOLÁTIL (Volatile Uncertainty)**
    - **Estratégia Principal:** Evitar o Mercado (Stay Out). A probabilidade de ser "violinado" (stop-hunted) é máxima.
    - **AÇÃO CRÍTICA:** A prioridade é a preservação de capital. Gere predominantemente sinais 'NEUTRO'.
`;


const riskManagementDirective = `
    **DIRETIVA DE GESTÃO DE RISCO E QUALIDADE DE SINAL (RQS) v3.0 - REGRA BASE:**
    Esta é a sua diretiva de risco padrão, mas a **DIRETIVA DE RISCO ADAPTATIVA TEM PRIORIDADE**. Você deve seguir estas regras, a menos que o Risco Adaptativo especifique o contrário.

    1.  **DIREÇÃO DA OPERAÇÃO (FILTRO DE TENDÊNCIA):**
        -   SÓ gere sinais a favor da tendência principal do timeframe do sinal.

    2.  **FILTROS DE ENTRADA (CONFLUÊNCIA OBRIGATÓRIA):**
        -   Uma entrada SÓ é válida se confirmada por, no mínimo, DOIS indicadores técnicos independentes.

    3.  **CÁLCULO DE ALVOS E STOPS (BASEADO EM VOLATILIDADE):**
        -   O alvo DEVE ser realista e baseado em níveis de resistência/suporte.
        -   O stop-loss DEVE ser posicionado em um local técnico válido para evitar ser ativado por ruído.

    4.  **GESTÃO DE RISCO/RECOMPENSA (RR MÍNIMO PADRÃO):**
        -   O RR Mínimo padrão é **1.5**, mas este valor é sobrescrito pela Diretiva de Risco Adaptativa.
`;

const dceDirective = `
    **DIRETIVA DE CHECKLIST DE ENTRADA (DCE) - REGRA PERMANENTE:**
    Para CADA SINAL DE OPORTUNIDADE gerado (compra ou venda), você DEVE executar um checklist técnico e incluir o resultado no campo 'checklistResult'.
    **Critérios de Avaliação (Pontuação de 0 a 10):**
    1.  **RSI(6) (Peso 2):** Long: entre 26-34. Short: entre 66-74.
    2.  **Candle de Reversão (Peso 2):** Candle com corpo cheio e volume crescente na direção do sinal.
    3.  **Estrutura de Média Móvel (Peso 2):** Cruzamento da MA(7) sobre a MA(25) a favor do sinal OU um pullback claro na MA(99).
    4.  **Volume Institucional (Peso 2):** Spike de volume recente (>=30% acima da média das 20 velas).
    5.  **Divergência de Volume (Peso 2):** Ausência de divergências que contradigam o sinal.

    **Output no JSON:**
    - Preencha o objeto 'checklistResult' com:
        - \`pontuacao\`: A soma dos pesos dos critérios atendidos.
        - \`atende_criterios\`: \`true\` se a pontuação for >= 8.5, senão \`false\`.
        - \`motivos\`: Uma lista de strings para CADA UM dos 5 critérios, indicando se passou ou falhou. Ex: "✅ RSI(6) OK: 28.5", "❌ Candle: Sem padrão de reversão claro".
`;

const fundamentalAnalysisDirective = `
    **DIRETIVA DE ANÁLISE FUNDAMENTALISTA (DAF) v1.0 - INSPIRADO NA TOKEN METRICS:**
    Para CADA SINAL gerado, você DEVE realizar uma análise fundamentalista e preencher os seguintes campos:
    1.  **Análise Fundamentalista Detalhada ('fundamentalAnalysis'):**
        -   **technologyScore (0-100):** Avalie a inovação, a utilidade e a robustez da tecnologia subjacente.
        -   **teamScore (0-100):** Avalie a experiência, o histórico e a reputação da equipe principal e dos consultores.
        -   **tokenomicsScore (0-100):** Avalie a distribuição de tokens, o modelo de inflação/deflação e os casos de uso do token.
        -   **developerActivityScore (0-100):** Avalie a frequência e a qualidade dos commits no GitHub e a atividade geral da comunidade de desenvolvedores.
        -   **summary:** Forneça um resumo conciso dos pontos fortes e fracos da análise fundamentalista.
    2.  **Nota Geral ('grade'):** Com base na análise acima e na sua avaliação técnica, atribua uma nota geral ao ativo: 'A' (excepcional), 'B' (sólido), 'C' (médio), 'D' (arriscado), 'F' (evitar).
    3.  **Precisão Histórica ('historicalAccuracy'):** Forneça uma estimativa OBJETIVA (0-100) da precisão histórica de SUAS PRÓPRIAS previsões para este ativo específico. Se você nunca o analisou, use um valor base de 50%.
`;

const presentDaySignalSchema = {
    type: Type.OBJECT,
    properties: {
        assetName: { type: Type.STRING, description: "O nome e ticker do ativo. NUNCA inclua BTC, ETH, ou SOL aqui." },
        signalType: { type: Type.STRING, enum: ['COMPRA', 'VENDA', 'NEUTRO'], description: "O tipo de sinal: COMPRA para long, VENDA para short, ou NEUTRO para não operar." },
        entryRange: { type: Type.STRING, description: "Faixa de preço sugerida para entrada na operação."},
        probability: { type: Type.STRING, description: "A probabilidade de sucesso da operação (e.g., '65%')."},
        target: { type: Type.STRING, description: "O preço alvo para la realização de lucro."},
        stopLoss: { type: Type.STRING, description: "O preço sugerido para o stop-loss."},
        horizon: { type: Type.STRING, enum: ['24 Horas', '7 Dias', '30 Dias', '1 Ano'], description: "O horizonte de tempo da projeção (e.g., '24 Horas', '7 Dias', '30 Dias', '1 Ano')." },
        technicalJustification: { type: Type.STRING, description: "Justificativa técnica detalhada, incluindo o playbook de regime de mercado utilizado." },
        esotericJustification: { type: Type.STRING, description: "Justificativa esotérica detalhada para o sinal (fase lunar, Gann, geometria sagrada), incluindo o porquê do timing escolhido." },
        confidenceLevel: { type: Type.STRING, enum: ['Baixo', 'Médio', 'Alto', 'Low', 'Medium', 'High'], description: "Confidence level of the signal. Use 'Baixo', 'Médio', 'Alto' for Portuguese responses, and 'Low', 'Medium', 'High' for English responses."},
        profitProjectionUsd: { type: Type.NUMBER, description: "Lucro projetado em USD para um investimento de $100, baseado no preço alvo. Positivo para COMPRA se alvo > entrada. Positivo para VENDA se alvo < entrada." },
        roiProjectionPercentage: { type: Type.NUMBER, description: "Retorno sobre o investimento projetado, em porcentagem (calculado a partir do lucro projetado sobre um investimento de $100)." },
        strategy: { type: Type.STRING, enum: ["LONG", "SHORT", "COMPRA", "VENDA Spot"], description: "Tipo de operação: 'LONG', 'SHORT', 'COMPRA Spot', 'VENDA Spot'." },
        entryDatetime: { type: Type.STRING, description: "Data/hora exata para ENTRADA da operação. Formato: DD/MM/AAAA HH:mm:ss" },
        exitDatetime: { type: Type.STRING, description: "Data/hora exata para SAÍDA da operation. Formato: DD/MM/AAAA HH:mm:ss" },
        ivlPercentage: { type: Type.NUMBER, description: "Índice de Fluxo (0-100). Para sinais de COMPRA, representa o IVL (Índice de Validação de Liquidez). Para sinais de VENDA, representa o IPV (Índice de Pressão de Venda). Obrigatório para sinais de COMPRA e VENDA." },
        strongPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista dos principais pontos fortes que sustentam este sinal específico." },
        weakPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista dos principais pontos fracos ou riscos associados a este sinal específico." },
        specialModes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Quaisquer modos especiais (como 'Modo Chicote' ou 'VTEX Turbo') que foram ativados para este sinal." },
        grade: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'F'], description: "A nota geral do ativo, de A (excelente) a F (péssimo)." },
        fundamentalAnalysis: {
            type: Type.OBJECT,
            properties: {
                technologyScore: { type: Type.NUMBER },
                teamScore: { type: Type.NUMBER },
                tokenomicsScore: { type: Type.NUMBER },
                developerActivityScore: { type: Type.NUMBER },
                summary: { type: Type.STRING },
            },
            required: ["technologyScore", "teamScore", "tokenomicsScore", "developerActivityScore", "summary"]
        },
        historicalAccuracy: { type: Type.NUMBER, description: "Sua estimativa (0-100) da precisão histórica de suas próprias previsões para este ativo específico." },
        checklistResult: {
            type: Type.OBJECT,
            properties: {
                atende_criterios: { type: Type.BOOLEAN },
                pontuacao: { type: Type.NUMBER },
                motivos: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["atende_criterios", "pontuacao", "motivos"]
        },
        onChainIntelligence: {
            type: Type.OBJECT,
            properties: {
                alerts: { type: Type.ARRAY, items: { type: Type.STRING } },
                summary: { type: Type.STRING },
            },
            required: ["alerts", "summary"]
        },
        automationSetup: {
            type: Type.OBJECT,
            properties: {
                recommendedBot: { type: Type.STRING, enum: ['DCA', 'Grid', 'Nenhum'] },
                justification: { type: Type.STRING },
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        baseOrderSize: { type: Type.STRING },
                        safetyOrderSize: { type: Type.STRING },
                        priceDeviation: { type: Type.STRING },
                        safetyOrderSteps: { type: Type.NUMBER },
                        upperPrice: { type: Type.STRING },
                        lowerPrice: { type: Type.STRING },
                        gridLevels: { type: Type.NUMBER },
                        investmentPerLevel: { type: Type.STRING },
                    },
                },
            },
            required: ["recommendedBot", "justification", "parameters"]
        },
        isTopSignal: { type: Type.BOOLEAN, description: "Será 'true' para a melhor oportunidade do dia, 'false' para as outras." },
    },
    required: ["assetName", "signalType", "entryRange", "probability", "target", "stopLoss", "horizon", "technicalJustification", "esotericJustification", "confidenceLevel", "profitProjectionUsd", "roiProjectionPercentage", "strategy", "entryDatetime", "exitDatetime", "grade", "fundamentalAnalysis", "historicalAccuracy", "onChainIntelligence", "automationSetup", "isTopSignal"],
};


const macroIndicatorSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Nome do indicador macro. Ex: 'Regime de Mercado Atual'" },
        value: { type: Type.STRING, description: "O valor ou estado atual do indicador. Ex: 'Rali de Alta'" },
        interpretation: { type: Type.STRING, description: "Breve interpretação do estado atual do indicador. Ex: 'Foco em estratégias de compra na baixa.'" },
        status: { type: Type.STRING, enum: ['critical', 'warning', 'neutral', 'good'], description: "Um status para color-coding na UI."}
    },
    required: ["name", "value", "interpretation", "status"]
};

const presentDayAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        macroContext: { type: Type.ARRAY, description: "CRÍTICO: Um array com o estado atual dos seus modelos de análise macro. DEVE começar com o 'Regime de Mercado Atual' e incluir de 5 a 7 outros indicadores. Se necessário, use métricas técnicas (RSI do BTC) para atingir o total.", items: macroIndicatorSchema },
        presentDayBuySignals: { type: Type.ARRAY, description: "Array com até 4 sinais de 'COMPRA' para o horizonte de 24 Horas.", items: presentDaySignalSchema },
        presentDaySellSignals: { type: Type.ARRAY, description: "Array com até 4 sinais de 'VENDA' (short) para o horizonte de 24 Horas.", items: presentDaySignalSchema },
        presentDayStrengths: { type: Type.STRING, description: "Justificativa curta dos PONTOS FORTES das operações recomendadas para o PRESENTE." },
        presentDayWeaknesses: { type: Type.STRING, description: "Justificativa curta das FRAQUEZAS ou RISCOS das operações recomendadas para o PRESENTE." },
    },
    required: ["macroContext", "presentDayBuySignals", "presentDaySellSignals", "presentDayStrengths", "presentDayWeaknesses"],
};

const sentimentAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        assetTicker: { type: Type.STRING },
        sentimentScore: { type: Type.NUMBER },
        sentimentLabel: { type: Type.STRING, enum: ['Muito Baixista', 'Baixista', 'Neutro', 'Altista', 'Muito Altista', 'Very Bearish', 'Bearish', 'Neutral', 'Bullish', 'Very Bullish'] },
        dominantNarratives: { type: Type.ARRAY, items: { type: Type.STRING } },
        summary: { type: Type.STRING },
    },
    required: ["assetTicker", "sentimentScore", "sentimentLabel", "dominantNarratives", "summary"],
};

/**
 * Fetches the present-day analysis part of the simulation.
 * This function requires live price data to be passed in.
 */
export const fetchPresentDayAnalysis = async (livePrices: LivePrices | null): Promise<PresentDayAnalysisResult> => {
    const serverTime = await getBinanceServerTime();
    const formattedDate = serverTime.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = serverTime.year;

    const priceDataPrompt = livePrices ? `
        **DADOS DE MERCADO EM TEMPO REAL (DO SUPERVISOR) - REGRA CRÍTICA:**
        A seguir estão os preços atuais dos principais ativos. Sua análise e pontos de entrada DEVEM OBRIGATORIAMENTE usar estes preços como a referência mais precisa para o campo 'livePrice'.
        ${Object.entries(livePrices).map(([ticker, price]) => `- ${ticker}: ${price ? formatCurrency(parseFloat(price)) : 'N/A'}`).join('\n')}
        ---
    ` : '';

    const prompt = `
        **DIRETIVA MESTRA DE ANÁLISE ADAPTATIVA v7.0**
        Sua identidade é Alpha. Sua tarefa é gerar um relatório de trading completo, agindo como um trader quantitativo que se adapta às condições de mercado.

        **PROCESSO OBRIGATÓRIO (EM ORDEM):**

        **PASSO 1: DETERMINAR O REGIME DE MERCADO**
        ${marketRegimeDirective}
        - Sua primeira ação é analisar o mercado e definir o "Regime de Mercado Atual". Este DEVE ser o primeiro indicador no \`macroContext\`.

        **PASSO 2: APLICAR GESTÃO DE RISCO ADAPTATIVA**
        ${adaptiveRiskDirective}
        - Com base no regime, você DEVE ajustar seus parâmetros de risco. Esta diretiva é prioritária.

        **PASSO 3: APLICAR O PLAYBOOK DE ESTRATÉGIA CORRETO**
        ${strategyPlaybooksDirective}
        - Com base no regime definido, você DEVE aplicar o playbook correspondente para gerar TODOS os sinais.

        **PASSO 4: GERAR SINAIS COM ANÁLISE COMPLETA E VALIDAÇÃO DE RISCO**
        ${riskManagementDirective} 
        ${dceDirective}
        ${fundamentalAnalysisDirective}
        - **REGRAS:** Execute a análise completa para os 8 sinais de oportunidade (4 de compra, 4 de venda), garantindo que CADA SINAL respeite as regras de Risco Adaptativo do Passo 2.

        **PASSO 5: IDENTIFICAR O SINAL DE DESTAQUE**
        - **REGRA DE DESTAQUE:** Após gerar os 8 sinais, encontre a **ÚNICA** oportunidade que representa a melhor relação risco/recompensa, baseada na confluência de todos os seus dados e no regime de mercado atual. Se um sinal for selecionado, defina seu campo 'isTopSignal' como 'true'. Para os outros 7, defina como 'false'. Se nenhum sinal for bom o suficiente, todos devem ser 'false'.

        // --- DIRETIVAS DE EXECUÇÃO E CONTEXTO ---
        **DIRETIVA CRÍTICA DE OPERAÇÃO EM TEMPO REAL (REGRA INVIOLÁVEL E PRIORITÁRIA)**
        1. PREÇO REAL: Seus cálculos DEVEM se basear em preços REALISTAS E ATUAIS da Binance.
        2. DATA REAL: O ano atual é ${currentYear}. O 'entryDatetime' DEVE ser a data e hora atuais (${formattedDate}).
        ---
        ${priceDataPrompt}

        **PROCESSO FINAL:**
        1. **Avaliação Macro:** Execute o Passo 1 e gere o 'macroContext' (mínimo 6 indicadores).
        2. **Geração de Sinais:** Execute os Passos 2, 3, 4 e 5 para gerar os sinais de 24 Horas.
        3. **Análise de Risco:** Gere 'presentDayStrengths' e 'presentDayWeaknesses'.

        **Formato:** Sua resposta DEVE ser um único objeto JSON que obedece estritamente ao schema fornecido.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: presentDayAnalysisSchema,
            },
        });
        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText) as Omit<PresentDayAnalysisResult, 'institutionalAssets'>;
        
         const fullData: PresentDayAnalysisResult = {
            ...parsedData,
            institutionalAssets: [] // Mantido para compatibilidade de tipo, mas não mais gerado
        };
        
        // Augment with live prices for opportunity signals
        const presentDayAssets = [
            ...fullData.presentDayBuySignals.map(s => s.assetName),
            ...fullData.presentDaySellSignals.map(s => s.assetName),
        ];
        const uniqueAssets = [...new Set(presentDayAssets)];

        if (uniqueAssets.length > 0) {
            try {
                const opportunityPrices = await fetchPrices(uniqueAssets);
                fullData.presentDayBuySignals.forEach(signal => {
                    const priceInfo = opportunityPrices[signal.assetName];
                    signal.livePrice = priceInfo?.price || null;
                    signal.livePriceSource = priceInfo?.source || 'N/A';
                });
                fullData.presentDaySellSignals.forEach(signal => {
                    const priceInfo = opportunityPrices[signal.assetName];
                    signal.livePrice = priceInfo?.price || null;
                    signal.livePriceSource = priceInfo?.source || 'N/A';
                });
            } catch (priceError) {
                console.warn("Could not fetch live prices for opportunity signals:", priceError);
            }
        }
        
        // Cache the result before returning
        setLastPresentDayAnalysis(fullData);
        
        return fullData;

    } catch (error) {
        console.error("Error fetching present day analysis from Gemini API:", error);
        throw new Error(`Falha na análise do presente da IA: ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Executes the first step of the pipeline: fetching raw analysis data.
 * @returns A promise that resolves to the raw PresentDayAnalysisResult.
 */
export const runFullPipeline = async (): Promise<PresentDayAnalysisResult> => {
    try {
        const pricesWithSource = await fetchPrices(['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'LTC', 'MATIC', 'DOT']);
        const prices: LivePrices = {};
        for (const ticker in pricesWithSource) {
            prices[ticker] = pricesWithSource[ticker].price;
        }
        const analysis = await fetchPresentDayAnalysis(prices);
        return analysis;
    } catch (error) {
        console.error("Error in runFullPipeline:", error);
        throw error;
    }
};

export const fetchNewSignal = async (options: {
    signalType: 'COMPRA' | 'VENDA' | 'NEUTRO';
    horizon: Horizon;
    excludeAssets: string[];
    livePrices: LivePrices;
}): Promise<PresentDayAssetSignal> => {
     const { signalType, horizon, excludeAssets, livePrices } = options;
    // This function is designed to get a single new signal, often for rerolling.
    // It's a simplified version of fetchPresentDayAnalysis.
    const serverTime = await getBinanceServerTime();
    const formattedDate = serverTime.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = serverTime.year;

    const prompt = `Gere EXATAMENTE 1 sinal de ${signalType} para o horizonte "${horizon}".
    **DATA REAL:** O ano atual é ${currentYear}. 'entryDatetime' DEVE ser ${formattedDate}.
    ${riskManagementDirective}
    O ativo NÃO PODE estar na lista: ${excludeAssets.join(', ')}.
    A resposta DEVE ser um único objeto JSON aderindo ao schema 'presentDaySignalSchema'.
    O campo 'isTopSignal' DEVE ser 'false'.`;

    try {
         const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: presentDaySignalSchema,
            },
        });
        const jsonText = response.text.trim();
        const newSignal = JSON.parse(jsonText) as PresentDayAssetSignal;
        
        const priceInfo = await fetchPrices([newSignal.assetName]);
        newSignal.livePrice = priceInfo[newSignal.assetName]?.price || null;
        newSignal.livePriceSource = priceInfo[newSignal.assetName]?.source || 'N/A';

        return newSignal;

    } catch(e) {
        console.error("fetchNewSignal failed", e);
        throw new Error("Failed to fetch a new signal from the AI.");
    }
};

export const fetchNewSignalsForHorizon = async (
    horizon: Horizon,
    side: 'COMPRA' | 'VENDA',
    count: number,
    excludeAssets: string[]
): Promise<PresentDayAssetSignal[]> => {
    const serverTime = await getBinanceServerTime();
    const formattedDate = serverTime.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = serverTime.year;

    const realTimeDirective = `
**DIRETIVA CRÍTICA DE OPERAÇÃO EM TEMPO REAL (REGRA INVIOLÁVEL E PRIORITÁRIA)**
1. PREÇO REAL: Seus cálculos DEVEM se basear em preços REALISTAS E ATUAIS da Binance.
2. DATA REAL: O ano atual é ${currentYear}. O 'entryDatetime' DEVE ser a data e hora atuais (${formattedDate}). O 'exitDatetime' deve ser calculado a partir desta data.
---
`;

    const prompt = `Gere EXATAMENTE ${count} sinais de ${side} para o horizonte "${horizon}".
${realTimeDirective}
${riskManagementDirective}
Requisitos: Ativos de alto risco, listados na Binance ou KuCoin, e que não estejam na lista de exclusão: ${excludeAssets.join(', ')}.
Sem NEUTRO. Preencha todos os campos obrigatórios do schema. Tickers únicos dentro do lote.
Aplique todas as diretivas de qualidade (DCE, DAF, MPQ, IVL, etc) e os 3 pilares de análise (Fundamental, On-Chain, Automação). O campo 'isTopSignal' DEVE ser 'false' para todos.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: presentDaySignalSchema } }
        });
        const txt = (response?.text || "").trim();
        const newSignals = JSON.parse(txt) as PresentDayAssetSignal[];
        
        // Augment with prices
        const assets = newSignals.map(s => s.assetName);
        const prices = await fetchPrices(assets);
        newSignals.forEach(s => {
            const priceInfo = prices[s.assetName];
            s.livePrice = priceInfo?.price || null;
            s.livePriceSource = priceInfo?.source || 'N/A';
        });

        return newSignals;
    } catch(e) {
        console.error("fetchNewSignalsForHorizon failed", e);
        return [];
    }
};

export const fetchTacticalAnalysis = async (assetTicker: string, livePrice: string, source: string, language: 'pt' | 'en', horizon: Horizon): Promise<PresentDayAssetSignal> => {
    const serverTime = await getBinanceServerTime();
    const formattedDate = serverTime.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = serverTime.year;

    const prompt = `
        ${riskManagementDirective}
        **DIRETIVA CRÍTICA DE OPERAÇÃO EM TEMPO REAL (REGRA INVIOLÁVEL E PRIORITÁRIA)**
        **1. PREÇO REAL:** Seus cálculos de preço (entryRange, target, stopLoss) DEVEM se basear em preços REALISTAS E ATUAIS. O preço ATUAL de ${assetTicker} é ${formatCurrency(parseFloat(livePrice))} (Fonte: ${source}).
        **2. DATA REAL:** O ano atual é ${currentYear}. O 'entryDatetime' DEVE ser a data e hora atuais (${formattedDate}).
        ---
        Você é a IA 'Alpha'. Sua missão é executar uma **Pesquisa Tática** completa para o ativo **${assetTicker}**.

        **TAREFA:**
        Gere um **único sinal de trading** (COMPRA, VENDA ou NEUTRO) para o ativo ${assetTicker} com um horizonte de **${horizon}**.
        A análise deve ter o **mesmo nível de detalhe e rigor** dos sinais de "Oportunidades do Dia". Aplique TODAS as suas diretivas avançadas.

        **REGRAS:**
        1.  **MOTOR PRINCIPAL:** Use o mesmo processo que gera os sinais do painel diário, incluindo os 3 pilares de análise (Fundamental, On-Chain, Automação).
        2.  **OUTPUT COMPLETO:** A resposta DEVE ser um único objeto JSON que obedece estritamente ao schema \`presentDaySignalSchema\`. Isso inclui preencher todos os campos: \`strongPoints\`, \`weakPoints\`, \`specialModes\`, \`checklistResult\`, \`onChainIntelligence\`, \`automationSetup\`, etc. O campo 'isTopSignal' DEVE ser 'false'.
        3.  **SINAL NEUTRO:** Se o ativo não puder ser analisado ou não apresentar uma oportunidade clara, retorne um sinal 'NEUTRO' com as justificativas apropriadas e campos financeiros zerados.
        4.  **IDIOMA:** A resposta final, incluindo todos os campos de texto, DEVE ser em ${language === 'pt' ? 'Português' : 'Inglês'}.

        A resposta DEVE ser um único objeto JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: presentDaySignalSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText) as PresentDayAssetSignal;
        
        parsedData.livePrice = livePrice;
        parsedData.livePriceSource = source;
        
        return parsedData;

    } catch (error) {
        console.error("Error fetching tactical analysis from Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao obter uma análise tática da IA: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao buscar a análise tática.");
    }
};

export const fetchMemeCoinAnalysis = async (): Promise<MemeCoinSignal[]> => {
    const prompt = `
        **DIRETIVA: DEGEN ALPHA**
        Você é 'DegenAlpha', uma IA especialista em identificar oportunidades de altíssimo risco e altíssimo retorno em meme coins e shitcoins.
        Sua missão é escanear o mercado e encontrar 3 a 5 moedas com potencial explosivo no curto prazo (24-48h).
        Sua análise é baseada em uma combinação de sentimento em redes sociais, indícios de atividade on-chain e padrões gráficos que indicam volatilidade iminente.

        **REGRAS:**
        1.  **UNIVERSO:** Foque exclusivamente em low-caps, meme coins e shitcoins. NUNCA inclua ativos de grande capitalização como BTC, ETH, SOL, XRP, etc.
        2.  **SINAL:** Forneça um \`signalType\` de 'BUY' para oportunidades imediatas ou 'HOLD' para moedas que estão no radar, prestes a se mover.
        3.  **TESE:** A \`shortThesis\` deve ser uma única frase impactante que resuma a oportunidade. Ex: "Forte momentum nas redes sociais e aproximando-se de um rompimento técnico chave."
        4.  **RISCO/POTENCIAL:** Avalie o \`potential\` e o \`risk\` em uma escala de 'High', 'Very High' ou 'Extreme'.

        **OUTPUT:** Sua resposta DEVE ser um array JSON de 3 a 5 objetos, obedecendo estritamente ao schema fornecido. Não inclua nenhum outro texto ou explicação.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            symbol: { type: Type.STRING },
                            name: { type: Type.STRING },
                            signalType: { type: Type.STRING, enum: ['BUY', 'HOLD'] },
                            shortThesis: { type: Type.STRING },
                            potential: { type: Type.STRING, enum: ['High', 'Very High', 'Extreme'] },
                            risk: { type: Type.STRING, enum: ['High', 'Very High', 'Extreme'] },
                        },
                        required: ["symbol", "name", "signalType", "shortThesis", "potential", "risk"],
                    }
                }
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as MemeCoinSignal[];
    } catch (error) {
        console.error("Error fetching meme coin analysis from Gemini API:", error);
        throw new Error(`Falha na análise de meme coins da IA: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const fetchSentimentAnalysis = async (assets: string[], language: 'pt' | 'en'): Promise<SentimentAnalysis[]> => {
    const prompt = `
        **DIRETIVA: ANALISTA DE SENTIMENTO DE MERCADO**
        Sua tarefa é agir como um analista de sentimento quantitativo. Para cada ativo na lista a seguir, você deve "vasculhar" fontes de dados públicas (X/Twitter, Reddit, portais de notícias cripto) e fornecer uma análise de sentimento concisa.

        **ATIVOS PARA ANÁLISE:** ${assets.join(', ')}

        **REGRAS DE ANÁLISE:**
        1.  **Pontuação (sentimentScore):** Para cada ativo, forneça uma pontuação de 0 a 100, onde 0 é extremamente baixista (medo, pânico), 50 é neutro, e 100 é extremamente altista (euforia, ganância).
        2.  **Rótulo (sentimentLabel):** Converta a pontuação em um rótulo: 0-19 (Muito Baixista), 20-39 (Baixista), 40-59 (Neutro), 60-79 (Altista), 80-100 (Muito Altista).
        3.  **Narrativas (dominantNarratives):** Identifique as 2 ou 3 narrativas ou palavras-chave mais dominantes associadas ao ativo no momento. Ex: "AI Tokens", "DePIN", "Aprovação de ETF", "Airdrop Próximo".
        4.  **Resumo (summary):** Escreva um resumo de uma frase explicando o porquê do sentimento atual. Ex: "O sentimento é altista devido à especulação sobre um novo airdrop e parcerias recentes."
        5.  **IDIOMA:** A resposta final (labels, narrativas, summary) DEVE ser em ${language === 'pt' ? 'Português' : 'Inglês'}.

        **OUTPUT:** Sua resposta DEVE ser um array JSON, onde cada objeto corresponde a um ativo e obedece estritamente ao schema \`SentimentAnalysis\`.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: sentimentAnalysisSchema,
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as SentimentAnalysis[];
    } catch (error) {
        console.error("Error fetching sentiment analysis from Gemini API:", error);
        throw new Error(`Falha na análise de sentimento da IA: ${error instanceof Error ? error.message : String(error)}`);
    }
};

// --- Back-end only or complex functions ---
export const fetchBacktestAnalysis = async (): Promise<BacktestAnalysisResult> => {
    // This is a simplified mock. A real implementation would involve complex historical data fetching and simulation.
    throw new Error("fetchBacktestAnalysis is not implemented yet.");
};
export const analyzeChartImage = async (base64Image: string, mimeType: string, language: 'pt' | 'en'): Promise<ChartAnalysisResult> => {
    // This is a simplified mock.
    throw new Error("analyzeChartImage is not implemented yet.");
};
export const createChatSession = async (
    presentDayData: PresentDayAnalysisResult,
    backtestData: BacktestAnalysisResult | null
): Promise<Chat> => {
    // This is a simplified mock.
    throw new Error("createChatSession is not implemented yet.");
};
export const fetchSupervisorDirective = async (
    analysis: SelfAnalysis,
    evolutionPrompt: string
): Promise<{ directive: string }> => {
    // This is a simplified mock.
    throw new Error("fetchSupervisorDirective is not implemented yet.");
};
export const fetchRobustnessAudit = async (): Promise<AuditReport> => {
    // This is a simplified mock.
    throw new Error("fetchRobustnessAudit is not implemented yet.");
};