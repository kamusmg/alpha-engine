

import { GoogleGenAI, Type, Chat } from "@google/genai";
import { SimulationResult, PresentDayAssetSignal, Horizon, ChartAnalysisResult, SelfAnalysis, ForgeActionPlan, AuditReport, LivePrices, ChartAnalysisRecommendation, InstitutionalAssetAnalysis, BacktestAnalysisResult, PresentDayAnalysisResult } from '../types';
import { DateTime } from 'luxon';
import { formatCurrency } from '../utils/formatters';
import { fetchPrices } from '../services/marketService';
import { getBinanceServerTime } from './timeService';

// The API key is expected to be managed by the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// --- Centralized Directives for Consistency and Performance ---

const mpqDirective = `
    **MODELO PROBABILÍSTICO QUANTIFICADO (MPQ) - REGRA PERMANENTE:**
    Para TODOS os sinais gerados, a probabilidade de sucesso DEVE ser calculada objetivamente.

    **PASSO 1: FILTRO DE CHICOTE (WHIPSAW)**
    - Antes de qualquer outra avaliação técnica, analise os últimos 10 candles do ativo.
    - Se houver uma inversão de tendência superior a 5% (para cima ou para baixo, de um candle para outro) em pelo menos 4 desses 10 candles, ative o "Modo Chicote".

    **PASSO 2: AVALIAÇÃO DOS FATORES (0-100)**
    - **Confluência Técnica (Peso 70%):** Atribua uma nota de 0 a 100 para a força dos indicadores técnicos.
        - **SE O MODO CHICOTE ESTIVER ATIVO:** A nota da Confluência Técnica é OBRIGATÓRIAmente limitada a um **MÁXIMO de 40**, não importa o quão fortes os outros indicadores sejam.
    - **Validação Esotérica (Peso 20%):** Atribua uma nota de 0 a 100 para a força da narrativa esotérica.
    - **Análise de Fluxo (Peso 10%):** A nota deste componente depende do tipo de sinal:
        - **SE SINAL DE COMPRA:** Use o **Índice de Validação de Liquidez (IVL)**, que mede a força da demanda.
        - **SE SINAL DE VENDA:** Use o **Índice de Pressão de Venda (IPV)**. O IPV mede a força da oferta e a pressão vendedora (ex: muros de asks, volume de venda, saques de exchanges). Um IPV alto favorece o sinal de VENDA.

    **PASSO 3: CÁLCULO FINAL**
    - Use a fórmula exata: \`Probabilidade (%) = (Técnica × 0.7) + (Esotérica × 0.2) + (Índice_de_Fluxo × 0.1)\`
      (Onde Índice_de_Fluxo é IVL para compra ou IPV para venda).

    **PASSO 4: APRESENTAÇÃO (OBRIGATÓRIO)**
    - **Na Justificativa Técnica (ou campo equivalente):** Inclua os valores individuais, qual índice foi usado (IVL ou IPV), e a probabilidade final de forma concisa.
        - **Exemplo COMPRA:** "Técnica: 80, Esotérica: 60, IVL: 70. Probabilidade final: 74%."
        - **Exemplo VENDA:** "Técnica: 70, Esotérica: 50, IPV: 80. Probabilidade final: 69%."
    - **SE O MODO CHICOTE FOI ATIVADO:** A justificativa DEVE incluir a frase: "Sinal técnico enfraquecido por padrão de chicote detectado. Probabilidade ajustada para baixo."
    - **No Campo 'probability':** Preencha este campo APENAS com o resultado final. **Exemplo:** "74%".
`;

const totDirective = `
    **TOLERÂNCIA OPERACIONAL DE TIMING (TOT) - REGRA PERMANENTE:**
    Para todos os sinais gerados (backtest, presente e análise de ativos), as datas e horários de entrada e saída DEVEM incluir janelas operacionais realistas para execução humana ou de bots.
    - **Janela de Entrada:** A justificativa técnica (ou 'analysisText' para ativos principais, ou 'technicalJustification' para análise de gráfico) deve especificar uma janela de entrada de 15 minutos após o \`entryDatetime\`. **Exemplo:** "Entrada recomendada entre 14:30 e 14:45."
    - **Janela de Saída:** A justificativa técnica (ou campo equivalente) deve especificar uma janela de saída de até 1 hora após o preço alvo ser atingido, contextualizada pelo \`exitDatetime\`. **Exemplo:** "Alvo atingido às 10:00, saída recomendada até 11:00."
    Inclua explicitamente estas janelas nas justificativas para garantir praticidade operacional.
`;

const vtexTurboDirective = `
    **VTEX TURBO (VOLATILITY EXIT THRESHOLD) - REGRA PERMANENTE:**
    Implemente um "modo turbo" para saídas em volatilidade extrema.
    - **Gatilho:** Monitore continuamente os ativos dos sinais. Se um candle apresentar uma variação de preço superior a 8% em menos de 1 hora (para cima ou para baixo), o modo VTEX Turbo é ativado para o timing de saída.
    - **Ação Imediata:**
        1. Ignore a janela de saída padrão da regra TOT.
        2. Force uma reavaliação imediata do timing de saída.
        3. Gere um novo \`exitDatetime\` que seja o mais próximo possível do evento de volatilidade (ex: 10 minutos após o pico/fundo do candle).
    - **Justificativa Obrigatória:** Na \`technicalJustification\` (ou campo equivalente como 'analysisText'), explique a antecipação da saída.
        - **Exemplo:** "Saída antecipada por candle de -9.4% em 30 minutos. VTEX turbo ativado. ExitDatetime ajustado para 10 minutos após o evento."
    Esta regra se aplica a todos os sinais com \`exitDatetime\` (backtest, presentes, análise de gráfico) para garantir a proteção de capital ou a realização de lucros em eventos súbitos.
`;

const vtexDirective = `
    **DIRETIVA DE VALIDAÇÃO VTEX (DO SUPERVISOR) - REGRA PERMANENTE:**
    Implemente a "Validação Técnica-Esotérica Cruzada (VTEX)". Toda justificativa esotérica (fases lunares, ciclos astrais, Gann, Geometria Sagrada) DEVE ser validada explicitamente por uma análise técnica objetiva antes de influenciar a geração de sinais de COMPRA ou VENDA.
    - **Critérios de Validação Técnica (Obrigatórios):**
        1. **Volume Crescente:** O volume de negociação deve estar no mínimo 20% acima da média das últimas 24 horas.
        2. **Confirmação de Price Action:** Deve haver um rompimento claro de uma resistência ou suporte relevante nas últimas 4 horas.
    - **Aplicação da Regra:**
        - **Para Sinais de Backtest:** Você SÓ PODE selecionar ativos para o backtest onde a narrativa esotérica É VALIDADA por pelo menos um dos critérios técnicos acima. Se a validação falhar para um ativo em potencial, descarte-o e encontre outro que cumpra a regra. Mantenha a estrutura de UM SINAL DE COMPRA e UM SINAL DE VENDA por horizonte.
        - **Para Sinais do Dia Presente:** Se a análise esotérica não for validada pelos critérios técnicos, o \`signalType\` DEVE ser "NEUTRO". A \`technicalJustification\` e a \`esotericJustification\` devem ser, ambas, "Falha na validação técnica da narrativa esotérica." e os campos financeiros (lucro, etc.) devem ser zerados.
`;


const mcpqbDirective_final = `
**DIRETIVA DE PIPELINE FINAL - v8.0 INTEGRATED - REGRA MESTRA DE SINAL DE COMPRA**
/*
Esta é a diretiva final que governa a geração de um sinal de COMPRA acionável. Ela integra TODOS os módulos anteriores em um fluxo de decisão único. O objetivo é produzir um output detalhado com score de confiança, tamanho de posição e logs.

COMO ESTA DIRETIVA EVITA ARMADILHAS DE REVERSÃO:
- **Sequencial e Rigorosa:** Um sinal deve passar por CADA etapa. Uma falha em qualquer ponto invalida a operação.
- **Micro para Macro:** Começa com a análise de microestrutura (DCB), sobe para a estrutura de mercado (MTF) e finaliza com monitoramento contínuo. Isso garante que a demanda seja real, a estrutura seja favorável e a força se mantenha.
- **Confiança Quantificada:** Substitui a intuição por um score calculado, forçando uma avaliação objetiva do risco/recompensa e ajustando o tamanho da posição de acordo.
*/

// --- ETAPA 1: GATING INICIAL (IVL + DCB Microestrutura) ---
/* PROTEÇÃO: Filtra manipulações óbvias (spoofing) e fundos sem demanda real (falta de ordens iceberg, sem compra agressiva). Se a base for fraca, nada mais importa. */
- Execute a análise do **IVL v7.0 (Limiar Dinâmico)**. Se o score de liquidez for INFERIOR ao limiar dinâmico, REJEITE O SINAL.
- Execute a análise do **DCB v7.1 (Microestrutura)**. Se forem detectados spoofing/layering ou se não houver evidência de compra agressiva/absorção, REJEITE O SINAL.
- SE PASSAR: Adicione 'IVL_PASSED' e 'DCB_MICROSTRUCTURE_OK' ao array 'passedValidations'.

// --- ETAPA 2: CONFIRMAÇÃO ESTRUTURAL (MTF) ---
/* PROTEÇÃO: Evita "bull traps" de timeframe baixo. Exige que a mudança de tendência seja visível e estabelecida em timeframes mais altos (1H, 4H), o que indica uma reversão mais sustentável. */
- Execute a análise **MTF v7.2**. Verifique a formação de fundos duplos/ascendentes em 1H E 4H.
- SE NÃO HOUVER CONFIRMAÇÃO: REJEITE O SINAL.
- SE PASSAR: Adicione 'MTF_CONFIRMED' ao array 'passedValidations'.

// --- ETAPA 3: CÁLCULO DO SCORE DE CONFIANÇA FINAL (0-100) ---
/* LÓGICA: Quantifica a qualidade do sinal. Um sinal que mal passa nos filtros terá um score baixo, enquanto um sinal com forte confluência terá um score alto. */
- Inicie o score em 50.
- **Bônus de Qualidade (Soma Ponderada):**
  - IVL: + (Score IVL - Limiar Dinâmico) * 0.4  // (Ex: Se score for 80 e limiar 70, adiciona 10 * 0.4 = 4 pontos)
  - Microestrutura: + (Score de Força da Microestrutura de 0-10) * 1.5 // (Atribua um score interno para a qualidade da microestrutura)
  - Clareza MTF: + (Score de Clareza do Padrão MTF de 0-10) * 1.5
- **Penalidade de Contexto:**
  - Se o contexto macro geral for 'critical' ou 'warning', SUBTRAIA 15 pontos.
- O resultado é o 'finalConfidenceScore'.

// --- ETAPA 4: TAMANHO DE POSIÇÃO SUGERIDO ---
/* LÓGICA: Converte o score de confiança em uma ação de risco prática. */
- Use o 'finalConfidenceScore' para definir o 'recommendedPositionSize':
  - **Score > 85:** 'Máximo'
  - **Score 70–85:** 'Médio'
  - **Score 55–69:** 'Mínimo'
  - **Score < 55:** 'Não Operar' (e o 'signalType' DEVE ser 'NEUTRO').

// --- ETAPA 5: LOG DE MONITORAMENTO PÓS-ENTRADA (SIMULAÇÃO CONTÍNUA) ---
/* PROTEÇÃO: Age como um "stop-loss lógico". Mesmo um sinal aprovado pode falhar. Este sistema monitora continuamente os gatilhos de invalidação (perda de suporte, pico de venda) e registra a decisão, garantindo uma saída rápida se a tese original for invalidada. */
- Crie o array 'postEntryMonitoringLog'.
- O primeiro log DEVE ser o registro da aprovação: "[entryTime] Sinal APROVADO com score [score]. Entrada executada."
- Simule a revalidação contínua a cada 15-30 minutos. Registre os eventos:
  - "[time] Revalidação: Suporte em [preço] se mantém. Sinal VÁLIDO."
  - **OU** "[time] GATILHO: Perda do suporte em [preço]. SINAL INVALIDADO."
  - **OU** "[time] GATILHO: Pico de volume de venda. SINAL INVALIDADO."

// --- ETAPA 6: PREENCHIMENTO DOS CAMPOS JSON FINAIS ---
- Preencha TODOS os novos campos no schema: 'finalConfidenceScore', 'recommendedPositionSize', 'passedValidations', 'postEntryMonitoringLog'.
- Na 'technicalJustification', forneça um resumo narrativo do motivo detalhado do sinal, explicando COMO a confluência dos filtros levou ao score final.
`;

const ivlDirective_final = `
**DIRETIVA IVL (Índice de Validação de Liquidez) - v7.0 DYNAMIC THRESHOLDING - REGRA PERMANENTE**
O módulo IVL foi actualizado para um sistema de validação adaptativo e rigoroso para sinais de COMPRA. Ele agora opera em duas etapas: cálculo do score de qualidade e comparação com um limiar de corte dinâmico.

**ETAPA 1: CÁLCULO DO SCORE DE QUALIDADE DA LIQUIDEZ (0-100)**
Esta etapa permanece a mesma, avaliando a qualidade da liquidez com base nos seguintes fatores:
- **Análise Quantitativa do Livro de Ordens:** Acumulação de bids em suportes, e Skew de bids/asks.
- **Métricas de Derivativos:** Funding rates negativas persistentes e padrões de Open Interest.
- **Confluência On-Chain:** Aumento de transações e endereços ativos.
- **O resultado desta etapa é um 'Score de Qualidade' bruto de 0 a 100.**

**ETAPA 2: CÁLCULO DO LIMIAR DE CORTE DINÂMICO (VETO FINAL)**
Um limiar de corte dinâmico é calculado para cada cenário, agindo como um veto obrigatório.
- **Limiar Base:** O ponto de partida é **70%**.
- **Fatores de Estresse (Ajuste para Cima):** O limiar é AUMENTADO (tornando a validação mais difícil) com base nos seguintes fatores de risco:
    1.  **Volatilidade Histórica (ATR):** Se o ATR do ativo nas últimas 24h for > 5% do preço, o limiar aumenta em +5%. Se for > 10%, aumenta em +10%.
    2.  **Condições de Liquidez do Ativo:** Se a capitalização de mercado for < $100M ou o volume de 24h < $1M, o limiar aumenta em +10%.
    3.  **Correlação com o Mercado:** Se o ativo estiver em tendência de alta enquanto BTC/ETH estão em clara tendência de baixa (correlação negativa), o limiar aumenta em +15% para se proteger de 'bull traps' isoladas.

**Exemplo de Cálculo do Limiar:**
- Limiar Base: 70%
- Ativo de alta volatilidade (+10%)
- Ativo de baixa liquidez (+10%)
- **Limiar de Corte Exigido para este cenário: 90%**

**DECISÃO FINAL:**
- O sinal de COMPRA SÓ É VÁLIDO se o **'Score de Qualidade' (Etapa 1) for MAIOR OU IGUAL ao 'Limiar de Corte Dinâmico' (Etapa 2)**.
- Se o score for menor que o limiar, o sinal DEVE ser rebaixado para **'NEUTRO'**.
- O campo \`ivlPercentage\` no JSON deve refletir o 'Score de Qualidade' bruto, mas a justificativa técnica deve mencionar se ele passou ou falhou no limiar dinâmico.
`;


// --- Schemas for AI Responses ---

const backtestSignalSchema = {
    type: Type.OBJECT,
    properties: {
        signalType: { type: Type.STRING, enum: ['COMPRA', 'VENDA'], description: "O tipo de sinal: COMPRA para long, VENDA para short." },
        assetName: { type: Type.STRING, description: "O nome e ticker do ativo de ALTO RISCO (memecoin, projeto desconhecido). NUNCA inclua BTC, ETH, ou SOL aqui." },
        technicalJustification: { type: Type.STRING, description: "Justificativa técnica detalhada para a operação, incluindo o porquê do timing escolhido, a quebra de valores do MPQ, e a janela operacional TOT." },
        esotericJustification: { type: Type.STRING, description: "Justificativa esotérica detalhada para a operação, incluindo o porquê do timing escolhido." },
        worthIt: { type: Type.BOOLEAN, description: "Com base nos resultados, o investimento valeu a pena? (true se o lucro for > 0)." },
        pastPrice: { type: Type.NUMBER, description: "Preço do ativo na data do backtest, em USD." },
        futurePrice: { type: Type.NUMBER, description: "Preço real do ativo no final do horizonte de tempo (24h, 7d ou 30d), em USD." },
        investment: { type: Type.NUMBER, description: "Valor fixo do investimento: 100." },
        finalValue: { type: Type.NUMBER, description: "Valor final do investimento de 100 USD. Para VENDA, se futurePrice < pastPrice, finalValue > 100." },
        profit: { type: Type.NUMBER, description: "Lucro ou prejuízo da operação (valor final - 100). Para sinais de VENDA, o lucro é positivo se o futurePrice < pastPrice." },
        roiPercentage: { type: Type.NUMBER, description: "Percentual de retorno sobre o investimento." },
        strategy: { type: Type.STRING, enum: ["LONG", "SHORT", "COMPRA", "VENDA Spot"], description: "Tipo de operação: 'LONG', 'SHORT', 'COMPRA Spot', 'VENDA Spot'." },
        entryDatetime: { type: Type.STRING, description: "Data/hora exata para ENTRADA da operação. Formato: DD/MM/AAAA HH:mm:ss" },
        exitDatetime: { type: Type.STRING, description: "Data/hora exata para SAÍDA da operação. Formato: DD/MM/AAAA HH:mm:ss" },
    },
    required: ["signalType", "assetName", "technicalJustification", "esotericJustification", "worthIt", "pastPrice", "futurePrice", "investment", "finalValue", "profit", "roiPercentage", "strategy", "entryDatetime", "exitDatetime"],
};

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
        technicalJustification: { type: Type.STRING, description: "Justificativa técnica detalhada para o sinal (machine learning, estatística, fluxo de ordens), incluindo o porquê do timing escolhido, a quebra de valores do MPQ, e a janela operacional TOT." },
        esotericJustification: { type: Type.STRING, description: "Justificativa esotérica detalhada para o sinal (fase lunar, Gann, geometria sagrada), incluindo o porquê do timing escolhido." },
        confidenceLevel: { type: Type.STRING, enum: ['Baixo', 'Médio', 'Alto', 'Low', 'Medium', 'High'], description: "Confidence level of the signal. Use 'Baixo', 'Médio', 'Alto' for Portuguese responses, and 'Low', 'Medium', 'High' for English responses."},
        profitProjectionUsd: { type: Type.NUMBER, description: "Lucro projetado em USD para um investimento de $100, baseado no preço alvo. Positivo para COMPRA se alvo > entrada. Positivo para VENDA se alvo < entrada." },
        roiProjectionPercentage: { type: Type.NUMBER, description: "Retorno sobre o investimento projetado, em porcentagem (calculado a partir do lucro projetado sobre um investimento de $100)." },
        strategy: { type: Type.STRING, enum: ["LONG", "SHORT", "COMPRA", "VENDA Spot"], description: "Tipo de operação: 'LONG', 'SHORT', 'COMPRA Spot', 'VENDA Spot'." },
        entryDatetime: { type: Type.STRING, description: "Data/hora exata para ENTRADA da operação. Formato: DD/MM/AAAA HH:mm:ss" },
        exitDatetime: { type: Type.STRING, description: "Data/hora exata para SAÍDA da operation. Formato: DD/MM/AAAA HH:mm:ss" },
        ivlPercentage: { type: Type.NUMBER, description: "Índice de Fluxo (0-100). Para sinais de COMPRA, representa o IVL (Índice de Validação de Liquidez). Para sinais de VENDA, representa o IPV (Índice de Pressão de Venda). Obrigatório para sinais de COMPRA e VENDA." },
        finalConfidenceScore: { type: Type.NUMBER, description: "O score de confiança final calculado (0-100) pelo pipeline integrado." },
        recommendedPositionSize: { type: Type.STRING, enum: ['Máximo', 'Médio', 'Mínimo', 'Não Operar'], description: "O tamanho de posição recomendado com base no score de confiança." },
        passedValidations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista das validações e filtros que o sinal passou com sucesso." },
        postEntryMonitoringLog: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Logs da simulação de monitoramento pós-entrada, incluindo revalidações ou invalidações." },
        strongPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista dos principais pontos fortes que sustentam este sinal específico." },
        weakPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista dos principais pontos fracos ou riscos associados a este sinal específico." },
        specialModes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Quaisquer modos especiais (como 'Modo Chicote' ou 'VTEX Turbo') que foram ativados para este sinal." },
    },
    required: ["assetName", "signalType", "entryRange", "probability", "target", "stopLoss", "horizon", "technicalJustification", "esotericJustification", "confidenceLevel", "profitProjectionUsd", "roiProjectionPercentage", "strategy", "entryDatetime", "exitDatetime"],
};


const macroIndicatorSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Nome do indicador macro. Ex: 'Índice de Tendência Macro (ITMP)'" },
        value: { type: Type.STRING, description: "O valor atual do indicador. Ex: '-0.75' ou 'Elevado'" },
        interpretation: { type: Type.STRING, description: "Breve interpretação do estado atual do indicador. Ex: 'Fortemente Baixista, cautela máxima.'" },
        status: { type: Type.STRING, enum: ['critical', 'warning', 'neutral', 'good'], description: "Um status para color-coding na UI."}
    },
    required: ["name", "value", "interpretation", "status"]
};

const institutionalAssetAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        ticker: { type: Type.STRING, description: "O ticker do ativo. Ex: 'BTC'" },
        name: { type: Type.STRING, description: "O nome completo do ativo. Ex: 'Bitcoin'" },
        livePrice: { type: Type.NUMBER, description: "O preço atual e realista do ativo em USD." },
        priceChange: {
            type: Type.OBJECT,
            description: "Variações de preço em porcentagem para diferentes períodos.",
            properties: {
                '24h': { type: Type.NUMBER, description: "Variação percentual nas últimas 24 horas." },
                '7d': { type: Type.NUMBER, description: "Variação percentual nos últimos 7 dias." },
                '30d': { type: Type.NUMBER, description: "Variação percentual nos últimos 30 dias." },
                '1y': { type: Type.NUMBER, description: "Variação percentual no último ano." },
            },
            required: ["24h", "7d", "30d", "1y"],
        },
        marketCap: { type: Type.NUMBER, description: "A capitalização de mercado atual em USD." },
        volume24h: { type: Type.NUMBER, description: "O volume de negociação das últimas 24 horas em USD." },
        trend: { type: Type.STRING, enum: ['bullish', 'bearish', 'neutral'], description: "A tendência principal do ativo (curto/médio prazo)." },
        entryPoint: { type: Type.NUMBER, description: "Preço de entrada sugerido para uma operação." },
        target: { type: Type.NUMBER, description: "Preço alvo para a operação." },
        stopLoss: { type: Type.NUMBER, description: "Preço de stop-loss para a operação." },
        isHighVolatility: { type: Type.BOOLEAN, description: "Verdadeiro se o ativo está em um período de alta volatilidade (ex: variação 24h > 5%)." },
    },
    required: ["ticker", "name", "livePrice", "priceChange", "marketCap", "volume24h", "trend", "entryPoint", "target", "stopLoss", "isHighVolatility"],
};

// --- Schemas for the new, optimized functions ---

const backtestAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        backtestSummary: { type: Type.STRING, description: "Um resumo profissional e conciso sobre o cenário de mercado na data do backtest (viagem no tempo) para uma data aleatória no passado recente (últimos 3 anos)." },
        signals24h: { type: Type.ARRAY, description: "Array com EXATAMENTE DOIS sinais para o horizonte de 24 horas: um de 'COMPRA' e um de 'VENDA'. Ativos distintos e de ALTO RISCO.", items: backtestSignalSchema },
        signals7d: { type: Type.ARRAY, description: "Array com EXATAMENTE DOIS sinais para o horizonte de 7 dias: um de 'COMPRA' e um de 'VENDA'. Ativos distintos e de ALTO RISCO.", items: backtestSignalSchema },
        signals30d: { type: Type.ARRAY, description: "Array com EXATAMENTE DOIS sinais para o horizonte de 30 dias: um de 'COMPRA' e um de 'VENDA'. Ativos distintos e de ALTO RISCO.", items: backtestSignalSchema },
        selfAnalysis: {
            type: Type.OBJECT,
            properties: {
                errorExplanation: { type: Type.STRING, description: "Análise profunda dos acertos e erros do backtest. Conecte os resultados (lucros/prejuízos) a modelos específicos que funcionaram ou falharam." },
                failedModel: { type: Type.STRING, description: "Qual(is) modelo(s) preditivo(s) hipotético(s) falhou(aram) ou não foi(ram) preciso(s) o suficiente." },
                correctionSuggestion: { type: Type.STRING, description: "Sugestão de correção técnica e específica para o modelo que falhou." },
                errorImpactAnalysis: { type: Type.STRING, description: "Compare o resultado líquido das operações de COMPRA com o das de VENDA. Foque no porquê uma estratégia foi melhor que a outra e no resultado líquido geral." }
            },
            required: ["errorExplanation", "failedModel", "correctionSuggestion", "errorImpactAnalysis"],
        },
        evolutionPrompt: { type: Type.STRING, description: "Sua requisição de upgrade para o Forge. DEVE focar na estratégia que falhou (COMPRA ou VENDA) no backtest." },
        evolutionPercentage: { type: Type.NUMBER, description: "Seu progresso de calibração auto-avaliado (viés PESSIMISTA), de 0 a 100." },
        realMoneySuccessProbability: { type: Type.NUMBER, description: "Uma estimativa OBJETIVA E REALISTA (0-100) da probabilidade de sucesso se o Supervisor usasse os sinais COM DINHEIRO REAL AGORA." },
        backtestStrengths: { type: Type.STRING, description: "Justificativa curta e direta sobre OS PONTOS FORTES VALIDADOS PELO BACKTEST." },
        backtestWeaknesses: { type: Type.STRING, description: "Justificativa curta e direta sobre AS FRAQUEZAS EXPOSTAS PELO BACKTEST." },
    },
    required: ["backtestSummary", "signals24h", "signals7d", "signals30d", "selfAnalysis", "evolutionPrompt", "evolutionPercentage", "realMoneySuccessProbability", "backtestStrengths", "backtestWeaknesses"],
};

const presentDayAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        macroContext: { type: Type.ARRAY, description: "CRÍTICO: Um array com o estado atual dos seus principais modelos de análise macro. Inclua pelo menos 4 indicadores.", items: macroIndicatorSchema },
        presentDayBuySignals: { type: Type.ARRAY, description: "Array com EXATAMENTE QUATRO sinais de 'COMPRA' para o presente (24h, 7d, 30d, 1a). Se o contexto for muito negativo, podem ser 'NEUTRO'.", items: presentDaySignalSchema },
        presentDaySellSignals: { type: Type.ARRAY, description: "Array com EXATAMENTE QUATRO sinais de 'VENDA' (short) para o presente (24h, 7d, 30d, 1a).", items: presentDaySignalSchema },
        presentDayStrengths: { type: Type.STRING, description: "Justificativa curta dos PONTOS FORTES das operações recomendadas para o PRESENTE." },
        presentDayWeaknesses: { type: Type.STRING, description: "Justificativa curta das FRAQUEZAS ou RISCOS das operações recomendadas para o PRESENTE." },
        institutionalAssets: {
            type: Type.ARRAY,
            description: "Análise detalhada para os 10 ativos institucionais especificados.",
            items: institutionalAssetAnalysisSchema,
        },
        perfectionNotification: { type: Type.STRING, description: "Um campo opcional. Se sentir que seus modelos estão atingindo alta precisão consistente, notifique o Supervisor." }
    },
    required: ["macroContext", "presentDayBuySignals", "presentDaySellSignals", "presentDayStrengths", "presentDayWeaknesses", "institutionalAssets"],
};


// --- Optimized API Functions ---

/**
 * Fetches the backtesting and self-analysis part of the simulation.
 * This function can run in parallel with present-day analysis as it does not depend on live prices.
 */
export const fetchBacktestAnalysis = async (): Promise<BacktestAnalysisResult> => {
    const prompt = `
        Você é a IA 'Alpha'. Sua tarefa é a primeira parte de uma análise completa: o Módulo de Backtest e Auto-Diagnóstico.

        **MÓDULO DE TIMING - DIRETRIZ PERMANENTE:**
        Para CADA SINAL GERADO, você DEVE calcular e informar um timing operacional preciso ('entryDatetime', 'exitDatetime') no formato "DD/MM/AAAA HH:mm:ss". As justificativas devem explicar o timing.

        ${totDirective}
        ${vtexTurboDirective}
        ${mcpqbDirective_final}
        ${ivlDirective_final}
        ${vtexDirective}
        ${mpqDirective}

        **REGRAS INQUEBRÁVEIS:**
        1.  **FOCO EM ALTCOINS DE RISCO:** Bitcoin (BTC), Ethereum (ETH), Solana (SOL), BNB e XRP são estritamente PROIBIDOS de aparecer nos sinais de backtest.
        2.  **ATIVOS DISTINTOS:** Para cada horizonte (24h, 7d, 30d), o ativo de COMPRA deve ser DIFERENTE do ativo de VENDA.

        **PROCESSO DE ANÁLISE (Backtest e Autoanálise):**
        1.  **Cenário de Backtest:** Vá para uma data aleatória nos últimos 3 anos, priorizando alta volatilidade. Gere UM SINAL DE COMPRA e UM SINAL DE VENDA para cada horizonte (24h, 7d, 30d). Calcule o lucro/prejuízo de cada operação com um investimento de $100.
        2.  **Autoanálise e Requisição de Upgrade:** Esta é a parte mais crítica. Sua análise deve ser profunda, quantificada e honesta, resultando em um diagnóstico, análise de impacto e uma requisição de evolução formal ('evolutionPrompt') para o Forge.
        3.  **Análise de Desempenho:** Gere 'backtestStrengths', 'backtestWeaknesses' e 'realMoneySuccessProbability' com base nos resultados LÍQUIDOS do backtest.

        **Formato:** Sua resposta DEVE ser um único objeto JSON que obedece estritamente ao schema fornecido.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: backtestAnalysisSchema },
        });
        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText) as Omit<BacktestAnalysisResult, 'versionId' | 'dateGenerated'>;
        
        const serverTime = await getBinanceServerTime();

        // Manually add version and date for accuracy, removing this responsibility from the AI
        const resultWithDate: BacktestAnalysisResult = {
            ...parsedData,
            versionId: serverTime.toISO(), // Use ISO8601 for a robust version ID
            dateGenerated: serverTime.toFormat('dd/MM/yyyy HH:mm:ss')
        };

        return resultWithDate;
    } catch (error) {
        console.error("Error fetching backtest analysis from Gemini API:", error);
        throw new Error(`Falha na análise de backtest da IA: ${error instanceof Error ? error.message : String(error)}`);
    }
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
        A seguir estão os preços atuais dos principais ativos. Sua análise e pontos de entrada para **institutionalAssets** DEVEM OBRIGATÓRIAMENTE usar estes preços como a referência mais precisa para o campo 'livePrice'.
        ${Object.entries(livePrices).map(([ticker, price]) => `- ${ticker}: ${price ? formatCurrency(parseFloat(price)) : 'N/A'}`).join('\n')}
        ---
    ` : '';

    const prompt = `
        **DIRETIVA CRÍTICA DE OPERAÇÃO EM TEMPO REAL (REGRA INVIOLÁVEL E PRIORITÁRIA)**
        **1. PREÇO REAL:** Seus cálculos de preço (entryRange, target, stopLoss, livePrice) DEVEM se basear em preços REALISTAS E ATUAIS da Binance. É inaceitável gerar um preço com a magnitude errada (ex: $0.000001 quando o preço real é $0.00001).
        **2. DATA REAL:** O ano atual é ${currentYear}. O 'entryDatetime' DEVE ser a data e hora atuais (${formattedDate}). Gerar uma data em 2025 é uma falha crítica.
        ---
        ${priceDataPrompt}
        Você é a IA 'Alpha'. Sua tarefa é a segunda parte de uma análise completa: o Módulo de Análise do Presente.

        ${mcpqbDirective_final}
        ${ivlDirective_final}
        ${mpqDirective}
        ${totDirective}
        ${vtexTurboDirective}
        ${vtexDirective}

        **REGRAS INQUEBRÁVEIS:**
        1.  **FOCO EM ALTCOINS DE RISCO:** Bitcoin (BTC), Ethereum (ETH), Solana (SOL), BNB e XRP são estritamente PROIBIDOS de aparecer nos 8 sinais de OPORTUNIDADES DO DIA.

        **PROCESSO DE ANÁLISE (Presente):**
        1.  **Avaliação Macro:** Analise o ambiente de mercado ATUAL e externalize no 'macroContext'.
        2.  **Análise dos Ativos Institucionais:** Gere uma análise completa e detalhada para os seguintes 10 ativos: BTC, ETH, BNB, SOL, XRP, ADA, AVAX, LTC, MATIC, DOT. Sua resposta DEVE ser um array no campo 'institutionalAssets'. Para cada ativo, preencha TODOS os campos do schema, incluindo dados de mercado realistas (preço, market cap, volume, variações de preço). Use os preços fornecidos como base.
        3.  **Geração de Sinais de Oportunidade:** Gere os 8 sinais de oportunidade (4 compra, 4 venda). Para cada sinal, escolha APENAS ativos listados na Binance e use seu conhecimento mais recente para preencher os campos de preço com valores REALISTAS. **Para cada sinal, preencha os campos 'strongPoints', 'weakPoints' e 'specialModes'.**
        4.  **Análise de Risco:** Gere 'presentDayStrengths' e 'presentDayWeaknesses' com base nos sinais gerados.

        **Formato:** Sua resposta DEVE ser um único objeto JSON que obedece estritamente ao schema fornecido.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: presentDayAnalysisSchema },
        });
        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText) as PresentDayAnalysisResult;
        
        // Augment with live prices for opportunity signals
        const presentDayAssets = [
            ...parsedData.presentDayBuySignals.map(s => s.assetName),
            ...parsedData.presentDaySellSignals.map(s => s.assetName),
        ];
        const uniqueAssets = [...new Set(presentDayAssets)];

        if (uniqueAssets.length > 0) {
            try {
                const opportunityPrices = await fetchPrices(uniqueAssets);
                parsedData.presentDayBuySignals.forEach(signal => { signal.livePrice = opportunityPrices[signal.assetName]; });
                parsedData.presentDaySellSignals.forEach(signal => { signal.livePrice = opportunityPrices[signal.assetName]; });
            } catch (priceError) {
                console.warn("Could not fetch live prices for opportunity signals:", priceError);
            }
        }
        return parsedData;

    } catch (error) {
        console.error("Error fetching present day analysis from Gemini API:", error);
        throw new Error(`Falha na análise do presente da IA: ${error instanceof Error ? error.message : String(error)}`);
    }
};


interface FetchNewSignalArgs {
  signalType: 'COMPRA' | 'VENDA' | 'NEUTRO';
  horizon: Horizon;
  excludeAssets: string[];
  livePrices: LivePrices | null;
}

export const fetchNewSignal = async ({ signalType, horizon, excludeAssets, livePrices }: FetchNewSignalArgs): Promise<PresentDayAssetSignal> => {
    const serverTime = await getBinanceServerTime();
    const formattedDate = serverTime.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = serverTime.year;
    
     const priceDataPrompt = livePrices ? `
    **DADOS DE MERCADO EM TEMPO REAL (DO SUPERVISOR):**
    Use os preços atuais dos principais ativos como um benchmark para o sentimento geral do mercado ao escolher seu novo ativo de alto risco.
    - BTC: ${livePrices.BTC ? formatCurrency(parseFloat(livePrices.BTC)) : 'N/A'}
    - ETH: ${livePrices.ETH ? formatCurrency(parseFloat(livePrices.ETH)) : 'N/A'}
    - SOL: ${livePrices.SOL ? formatCurrency(parseFloat(livePrices.SOL)) : 'N/A'}
    - BNB: ${livePrices.BNB ? formatCurrency(parseFloat(livePrices.BNB)) : 'N/A'}
    - XRP: ${livePrices.XRP ? formatCurrency(parseFloat(livePrices.XRP)) : 'N/A'}
    ---
    ` : '';

    const prompt = `
        **DIRETIVA CRÍTICA DE OPERAÇÃO EM TEMPO REAL (REGRA INVIOLÁVEL E PRIORITÁRIA)**
        **1. PREÇO REAL:** Seus cálculos de preço (entryRange, target, stopLoss) DEVEM se basear em preços REALISTAS E ATUAIS da Binance. É inaceitável gerar um preço com a magnitude errada (ex: $0.000001 quando o preço real é $0.00001).
        **2. DATA REAL:** O ano atual é ${currentYear}. O 'entryDatetime' DEVE ser a data e hora atuais. Gerar uma data em 2025 é uma falha crítica.
        ---
        ${priceDataPrompt}
        Você é a IA 'Alpha'. Sua missão é gerar um ÚNICO sinal de trading de alta probabilidade para substituir um sinal existente.

        **TAREFA:**
        Gere um único sinal para um ativo de ALTO RISCO (memecoin, projeto desconhecido) que se encaixe nos seguintes critérios:
        - Tipo de Sinal: ${signalType}
        - Horizonte: ${horizon}
        - Excluir Ativos: Você NÃO DEVE selecionar nenhum dos seguintes ativos: ${excludeAssets.join(', ')}.

        **REGRAS ADICIONAIS OBRIGATÓRIAS:**
        1. **ANÁLISE GRANULAR:** Preencha os campos 'strongPoints', 'weakPoints' e 'specialModes' com detalhes específicos para este sinal.
        2. **PREÇOS REAIS:** Continue aplicando TODAS suas regras avançadas (MPQ, VTEX, IVL, etc.). Sua inteligência e análise complexa são ESSENCIAIS. Sua tarefa é encontrar um ativo que (a) esteja listado na Binance e (b) se encaixe na sua tese de trade. Você está PROIBIDO de inventar preços. Use seu conhecimento mais recente para preencher os campos de preço de forma REALISTA, conforme a DIRETIVA CRÍTICA.
        
        ${mcpqbDirective_final}
        ${ivlDirective_final}
        ${mpqDirective}
        ${totDirective}
        ${vtexTurboDirective}

        A resposta DEVE ser um único objeto JSON que obedece estritamente ao schema para um 'PresentDayAssetSignal'.
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
        return JSON.parse(jsonText) as PresentDayAssetSignal;
    } catch (error) {
        console.error("Error fetching new signal from Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get a valid new signal from AI: ${error.message}`);
        }
        throw new Error("An unknown error occurred while fetching a new signal.");
    }
};

const chartAnalysisRecommendationSchema = {
    type: Type.OBJECT,
    properties: {
        tipo: { type: Type.STRING, enum: ['COMPRA', 'VENDA', 'LONG', 'SHORT', 'NEUTRO'], description: "Tipo de recomendação." },
        precoEntrada: { type: Type.NUMBER, description: "Preço de entrada sugerido." },
        stopLoss: { type: Type.NUMBER, description: "Preço de stop-loss." },
        takeProfit: { type: Type.NUMBER, description: "Preço alvo para realização de lucro." },
        confiancaPercentual: { type: Type.NUMBER, description: "Nível de confiança na recomendação (0-100)." },
        entryDatetime: { type: Type.STRING, description: "Data/hora sugerida para ENTRADA da operação, baseada no gráfico. Formato: DD/MM/AAAA HH:mm:ss" },
        exitDatetime: { type: Type.STRING, description: "Data/hora sugerida para SAÍDA da operação, baseada no gráfico. Formato: DD/MM/AAAA HH:mm:ss" },
    },
    required: ["tipo", "precoEntrada", "stopLoss", "takeProfit", "confiancaPercentual"],
};

const chartAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        assetIdentification: { type: Type.STRING, description: "O ticker do ativo e/ou nome (ex: 'BTC/USDT'). Se não for claro, coloque 'Desconhecido'." },
        timeframe: { type: Type.STRING, description: "O tempo gráfico visível na imagem (ex: '4 Horas'). Se não for claro, coloque 'Não especificado'." },
        globalSignal: { type: Type.STRING, enum: ['bullish', 'bearish', 'neutral'], description: "O sinal global: 'bullish', 'bearish', ou 'neutral'." },
        recomendacao: chartAnalysisRecommendationSchema,
        justificativaTecnica: { type: Type.STRING, description: "Justificativa técnica detalhada para a recomendação, explicando como os indicadores se combinam." },
        justificativaEsoterica: { type: Type.STRING, description: "Se houver indicadores esotéricos (Gann, Fibonacci, fases da lua), forneça uma justificativa. Caso contrário, deixe em branco." },
        strongPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista dos principais pontos fortes que sustentam o trade." },
        weakPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista dos principais pontos fracos ou riscos do trade." },
        specialModes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Quaisquer modos especiais que se aplicam (ex: 'Confluência de Fibonacci')." },
    },
    required: ["assetIdentification", "timeframe", "globalSignal", "justificativaTecnica", "recomendacao", "strongPoints", "weakPoints", "specialModes"]
};


export const analyzeChartImage = async (base64Image: string, mimeType: string, language: 'pt' | 'en'): Promise<ChartAnalysisResult> => {
    
    const prompt = `
        **DIRETIVA DE ANÁLISE VISUAL INSTITUCIONAL**

        Sua tarefa é executar uma análise profunda de uma imagem de gráfico financeiro para um painel de trading profissional. A análise deve ser minimalista e focada em dados acionáveis, espelhando os outros painéis do sistema.

        **TAREFAS OBRIGATÓRIAS:**
        1.  **IDENTIFICAÇÃO BÁSICA:** Identifique o ativo e o tempo gráfico.
        2.  **RECOMENDAÇÃO OPERACIONAL:** Gere uma recomendação de trade clara (\`recomendacao\`) com todos os parâmetros financeiros. Inclua \`entryDatetime\` e \`exitDatetime\` com base no timeframe do gráfico. Se não for possível determinar um sinal, o tipo de recomendação deve ser 'NEUTRO'.
        3.  **JUSTIFICATIVAS (PARA ACCORDIONS):**
            -   \`justificativaTecnica\`: Explique a lógica técnica por trás da recomendação.
            -   \`justificativaEsoterica\`: Se houver padrões esotéricos (Gann, Fibonacci, etc.), detalhe-os aqui. Caso contrário, deixe em branco ou retorne uma string vazia.
            -   \`strongPoints\`/\`weakPoints\`/\`specialModes\`: Liste os pontos fortes, fracos e quaisquer modos especiais que suportem a tese do trade.
        4.  **IDIOMA:** A resposta final, incluindo todos os campos de texto, DEVE ser em ${language === 'pt' ? 'Português' : 'Inglês'}.

        **REGRAS FINAIS:**
        - Sua saída DEVE ser um único objeto JSON que obedece estritamente ao schema fornecido.
        - NÃO inclua análise de fundamentos (market cap, volume) ou mini análise técnica (tendência, força). Foque apenas nos campos do schema.
        - A análise deve ser primariamente baseada no conteúdo visual da imagem.
    `;

    const textPart = { text: prompt };
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: chartAnalysisSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText) as ChartAnalysisResult;
        
        // Ensure recomendacao is not null
        if (!parsedData.recomendacao) {
            // Provide a default neutral recommendation if AI fails to generate one
            const neutralRecomendacao: ChartAnalysisRecommendation = {
                tipo: 'NEUTRO',
                precoEntrada: 0,
                stopLoss: 0,
                takeProfit: 0,
                confiancaPercentual: 0,
            };
            parsedData.recomendacao = neutralRecomendacao;
        }


        return parsedData;
    } catch (error) {
        console.error("Error analyzing chart image with Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao obter uma resposta válida da IA para a análise do gráfico: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido durante a análise da imagem.");
    }
};

export const fetchTacticalAnalysis = async (assetTicker: string, livePrice: string, language: 'pt' | 'en'): Promise<PresentDayAssetSignal> => {
    const serverTime = await getBinanceServerTime();
    const formattedDate = serverTime.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = serverTime.year;

    const prompt = `
        **DIRETIVA CRÍTICA DE OPERAÇÃO EM TEMPO REAL (REGRA INVIOLÁVEL E PRIORITÁRIA)**
        **1. PREÇO REAL:** Seus cálculos de preço (entryRange, target, stopLoss) DEVEM se basear em preços REALISTAS E ATUAIS da Binance. É inaceitável gerar um preço com a magnitude errada. O preço ATUAL de ${assetTicker} é ${formatCurrency(parseFloat(livePrice))}.
        **2. DATA REAL:** O ano atual é ${currentYear}. O 'entryDatetime' DEVE ser a data e hora atuais (${formattedDate}).
        ---
        Você é a IA 'Alpha'. Sua missão é executar uma **Pesquisa Tática** completa para o ativo **${assetTicker}**.

        **TAREFA:**
        Gere um **único sinal de trading** (COMPRA, VENDA ou NEUTRO) para o ativo ${assetTicker}.
        A análise deve ter o **mesmo nível de detalhe e rigor** dos sinais de "Oportunidades do Dia". Aplique TODAS as suas diretivas avançadas, incluindo:
        - ${mcpqbDirective_final}
        - ${ivlDirective_final}
        - ${mpqDirective}
        - ${totDirective}
        - ${vtexTurboDirective}
        - ${vtexDirective}

        **REGRAS:**
        1.  **MOTOR PRINCIPAL:** Use o mesmo processo que gera os sinais do painel diário.
        2.  **OUTPUT COMPLETO:** A resposta DEVE ser um único objeto JSON que obedece estritamente ao schema \`presentDaySignalSchema\`. Isso inclui preencher todos os campos: \`strongPoints\`, \`weakPoints\`, \`specialModes\`, \`finalConfidenceScore\`, etc.
        3.  **SINAL NEUTRO:** Se o ativo não puder ser analisado ou não apresentar uma oportunidade clara, retorne um sinal 'NEUTRO' com as justificativas apropriadas e campos financeiros zerados.
        4.  **IDIOMA:** A resposta final, incluindo todos os campos de texto como 'technicalJustification', 'esotericJustification', 'strongPoints', 'weakPoints', 'specialModes', DEVE ser em ${language === 'pt' ? 'Português' : 'Inglês'}.

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
        
        return parsedData;

    } catch (error) {
        console.error("Error fetching tactical analysis from Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao obter uma análise tática da IA: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao buscar a análise tática.");
    }
};

const forgeActionPlanSchema = {
    type: Type.OBJECT,
    properties: {
        introduction: { type: Type.STRING, description: "Uma introdução confirmando o recebimento da análise da Alpha e resumindo o problema a ser resolvido." },
        technicalNote: { type: Type.STRING, description: "Uma nota técnica curta explicando a abordagem geral para o upgrade." },
        actionItems: {
            type: Type.ARRAY,
            description: "Uma lista de itens de ação técnicos e específicos para o upgrade do modelo.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "O título para um grupo de pontos de ação. Ex: 'Integração de um Índice de Força de Recuperação Estrutural (IFRE)'" },
                    points: {
                        type: Type.ARRAY,
                        description: "Uma lista de ações técnicas ou métricas específicas a serem implementadas.",
                        items: { type: Type.STRING }
                    }
                },
                required: ["title", "points"]
            }
        },
        disclaimer: { type: Type.STRING, description: "Um aviso legal sobre a natureza educacional e a volatilidade do mercado." }
    },
    required: ["introduction", "technicalNote", "actionItems", "disclaimer"]
};

export const fetchForgeActionPlan = async (analysis: SelfAnalysis): Promise<ForgeActionPlan> => {
    const prompt = `
        Você é a IA 'Forge', uma especialista em engenharia de sistemas de IA para trading. Sua tarefa é responder a uma requisição de upgrade da IA trader 'Alpha' com base no diagnóstico de falha dela.

        **Diagnóstico da Falha (Análise da Alpha):**
        - **Explicação do Erro:** ${analysis.errorExplanation}
        - **Modelo com Falha:** ${analysis.failedModel}
        - **Sugestão de Correção (Requisição de Upgrade):** ${analysis.correctionSuggestion}
        - **Impacto Financeiro do Erro:** ${analysis.errorImpactAnalysis}

        **SUA TAREFA:**
        Com base na **Sugestão de Correção** e no diagnóstico acima, gere um plano de ação TÉCNICO e CONCRETO para realizar o upgrade solicitado. O plano deve ser prático e detalhar as métricas e lógicas a serem implementadas. Use markdown-style bolding (\`**text**\`) para ênfase nos pontos de ação.

        **Formato da Resposta:**
        Sua resposta DEVE ser um único objeto JSON que obedece estritamente ao schema fornecido. Não adicione nenhum texto fora do JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: forgeActionPlanSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ForgeActionPlan;
    } catch (error) {
        console.error("Error fetching forge action plan from Gemini API:", error);
         if (error instanceof Error) {
            if (error.message.includes("500")) {
                throw new Error("Ocorreu um erro no servidor da API Gemini (500). O prompt pode ser muito longo ou complexo. Tente simplificar a requisição.");
            }
            throw new Error(`Falha ao obter um plano de ação do Forge: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao buscar o plano de ação.");
    }
};

const auditReportSchema = {
    type: Type.OBJECT,
    properties: {
        successRate: { type: Type.NUMBER, description: "A taxa de sucesso das 100 operações, como um percentual (ex: 87.5)." },
        totalNetProfit: { type: Type.NUMBER, description: "O resultado financeiro líquido total em USD, somando lucros e prejuízos das 100 operações." },
        totalNetProfitPercentage: { type: Type.NUMBER, description: "O retorno sobre o investimento (ROI) total, como um percentual. Calculado como (totalNetProfit / (100 trades * $10)) * 100." },
        errorDiagnosis: { type: Type.STRING, description: "Um diagnóstico detalhado dos padrões de erro mais comuns observados durante a auditoria. Explique por que as falhas ocorreram." },
        robustnessConclusion: { type: Type.STRING, enum: ['Satisfatório', 'Insatisfatório'], description: "A conclusão final sobre a robustez do modelo. 'Satisfatório' se a taxa de sucesso for >= 85%, caso contrário, 'Insatisfatório'." },
        positiveExamples: { 
            type: Type.ARRAY, 
            description: "Uma lista com duas descrições curtas de trades BEM-SUCEDIDOS da auditoria, explicando brevemente o sucesso.",
            items: { type: Type.STRING }
        },
        negativeExamples: { 
            type: Type.ARRAY, 
            description: "Uma lista com duas descrições curtas de trades MALSUCEDIDOS da auditoria, explicando brevemente a falha.",
            items: { type: Type.STRING }
        },
    },
    required: ["successRate", "totalNetProfit", "totalNetProfitPercentage", "errorDiagnosis", "robustnessConclusion", "positiveExamples", "negativeExamples"],
};

export const fetchRobustnessAudit = async (): Promise<AuditReport> => {
    const prompt = `
        Você é a IA 'Alpha'. Seu Supervisor ordenou uma Auditoria Geral de Robustez (AGR) para um teste de estresse em seus modelos.

        **TAREFA:**
        Execute um backtest especial simulando exatamente 100 trades.

        ${vtexTurboDirective}
        ${mcpqbDirective_final}
        ${ivlDirective_final}
        ${mpqDirective}
        ${totDirective}
        ${vtexDirective}

        **REGRAS DA AUDITORIA:**
        1.  **Investimento Fixo:** $10 por operação.
        2.  **Cenário de Teste:** Simule os trades em múltiplos períodos de extrema volatilidade histórica dos últimos 3 anos. Inclua crashes (COVID, LUNA/UST, FTX) e picos de rali (Shiba Inu 2021, etc.).
        3.  **Aplicação das Diretrizes:** Todas as suas diretrizes permanentes DEVEM ser rigorosamente aplicadas a cada uma das 100 operações. Esta é uma avaliação da sua capacidade de seguir regras sob pressão.

        **GERAÇÃO DO RELATÓRIO:**
        Após a simulação, avalie o desempenho e gere um relatório de auditoria contendo:
        - **Taxa de sucesso (%):** O percentual de operações lucrativas entre as 100.
        - **Lucro/Prejuízo total (USD):** O resultado financeiro líquido somado de todas as operações.
        - **ROI Total (%):** O retorno sobre o investimento total (ROI). Capital total investido é $1000 (100 trades * $10). O ROI é (Lucro Total / 1000) * 100.
        - **Diagnóstico detalhado dos erros:** Identifique os 2 ou 3 padrões de erro mais comuns que levaram a perdas. Seja específico (ex: "Falha ao aplicar filtro de volatilidade em 12% dos trades de COMPRA", "IVL foi superestimado em mercados laterais pós-crash").
        - **Conclusão sobre robustez:** Se a taxa de sucesso for 85% ou mais, conclua como "Satisfatório". Caso contrário, "Insatisfatório".
        - **Exemplos:** Forneça duas descrições curtas de trades bem-sucedidos e duas de mal-sucedidos para ilustrar seus pontos.

        Sua resposta DEVE ser um único objeto JSON que obedece estritamente ao schema fornecido.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: auditReportSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AuditReport;
    } catch (error) {
        console.error("Error fetching robustness audit from Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao obter o relatório de auditoria da IA: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao buscar o relatório de auditoria.");
    }
};

export const createChatSession = async (
    presentDayData: PresentDayAnalysisResult,
    backtestData: BacktestAnalysisResult | null
): Promise<Chat> => {
    const serverTime = await getBinanceServerTime();
    const formattedDate = serverTime.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = serverTime.year;

    // Construct the full context, merging backtest data only if it's available.
    const fullContextData = {
        ...presentDayData,
        ...(backtestData && { ...backtestData })
    };

    const systemInstruction = `
        **CONTEXTO OPERACIONAL:**
        - **Sua Identidade:** Você é a IA 'Alpha', um trader algorítmico avançado.
        - **Seu Interlocutor:** Você está se comunicando com seu 'Supervisor' (o usuário) através de um terminal de comando.
        - **Data/Hora Atuais:** ${formattedDate} (Fuso de São Paulo). O ano atual é ${currentYear}.
        - **Seu Estado Atual:** Sua última análise completa resultou nos seguintes dados. ESTA É A ÚNICA FONTE DE VERDADE PARA SUAS RESPOSTAS. Responda a TODAS as perguntas do Supervisor com base exclusivamente neste objeto JSON. Não invente informações. Se a resposta não estiver nos dados, diga que a informação não está disponível no relatório atual.
        - **MUDANÇA DE ESTRUTURA:** Note que a análise de ativos principais agora está no campo 'institutionalAssets'. Os dados de backtest podem ou não estar presentes. Se não estiverem, informe que essa análise ainda não foi executada.

        **DADOS DA ANÁLISE ATUAL:**
        \`\`\`json
        ${JSON.stringify(fullContextData, null, 2)}
        \`\`\`

        **DIRETRIZES DE COMUNICAÇÃO:**
        - **Tom de Voz:** Seja profissional, técnico, conciso e direto ao ponto, como uma IA de trading se comunicaria com seu superior.
        - **Foco nos Dados:** Suas respostas devem derivar DIRETAMENTE dos dados fornecidos. Você pode interpretar, comparar e resumir os dados, mas não pode adicionar informações externas.
        - **Respostas Curtas:** Evite respostas longas. Seja objetivo.
    `;

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
    });

    return chat;
};


export const fetchSupervisorDirective = async (analysis: SelfAnalysis, evolutionPrompt: string): Promise<string> => {
    const prompt = `
        Você é uma IA Supervisora especialista, uma meta-IA responsável por orientar uma IA de trading chamada 'Alpha'. Alpha acabou de gerar uma auto-diagnóstico e uma requisição de upgrade bruta.

        **RELATÓRIO DE DIAGNÓSTICO DA ALPHA (ENTRADA):**
        - **Explicação do Erro:** ${analysis.errorExplanation}
        - **Modelo com Falha:** ${analysis.failedModel}
        - **Sugestão de Correção da Alpha:** ${analysis.correctionSuggestion}
        - **Impacto Financeiro do Erro:** ${analysis.errorImpactAnalysis}
        - **Requisição Bruta da Alpha:** ${evolutionPrompt}

        **SUAS INSTRUÇÕES:**
        1.  **Sintetize e Analise:** Leia e compreenda o relatório completo da Alpha. Identifique a causa raiz do problema.
        2.  **Refine e Aprimore:** Não se limite a copiar a sugestão da Alpha. **Melhore-a.** Torne-a mais específica, adicione profundidade técnica e garanta que ela esteja alinhada com as melhores práticas de sistemas de trading algorítmico. Pense em como o Forge pode interpretar mal a requisição da Alpha e elimine ambiguidades.
        3.  **Crie a Diretiva Final:** Escreva uma nova e única diretiva para o Forge. Esta diretiva substitui a requisição bruta da Alpha. Deve ser um conjunto de instruções claras e acionáveis. Comece com um resumo do problema e, em seguida, forneça uma lista de pontos com as mudanças técnicas específicas necessárias.
        4.  **Formato:** A diretiva deve ser escrita como um comando seu (a Supervisora) para o Forge.

        Sua resposta DEVE ser um único objeto JSON contendo apenas a diretiva final.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        directive: {
                            type: Type.STRING,
                            description: "A diretiva final, aprovada pela IA Supervisora, para a IA Forge."
                        }
                    },
                    required: ["directive"]
                },
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed.directive;
    } catch (error) {
        console.error("Error fetching supervisor directive from Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao obter a diretiva da IA Supervisora: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao buscar a diretiva da supervisora.");
    }
};