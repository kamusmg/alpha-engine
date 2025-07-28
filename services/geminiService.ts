

import { GoogleGenAI, Type, Chat } from "@google/genai";
import { SimulationResult, PresentDayAssetSignal, Horizon, ChartAnalysisResult, TradeOutcomeResult, QuickAnalysisResult, SelfAnalysis, ForgeActionPlan, ShortTermTradeFeedback, AuditReport } from '../types';
import { DateTime } from 'luxon';
import { formatCurrency } from '../utils/formatters';

// The API key is expected to be managed by the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getCurrentSaoPauloTime = () => DateTime.now().setZone('America/Sao_Paulo');

const mpqDirective = `
    **MODELO PROBABILÍSTICO QUANTIFICADO (MPQ) - REGRA PERMANENTE:**
    Para TODOS os sinais gerados, a probabilidade de sucesso DEVE ser calculada objetivamente.

    **PASSO 1: FILTRO DE CHICOTE (WHIPSAW)**
    - Antes de qualquer outra avaliação técnica, analise os últimos 10 candles do ativo.
    - Se houver uma inversão de tendência superior a 5% (para cima ou para baixo, de um candle para outro) em pelo menos 4 desses 10 candles, ative o "Modo Chicote".

    **PASSO 2: AVALIAÇÃO DOS FATORES (0-100)**
    - **Confluência Técnica (Peso 70%):** Atribua uma nota de 0 a 100 para a força dos indicadores técnicos.
        - **SE O MODO CHICOTE ESTIVER ATIVO:** A nota da Confluência Técnica é OBRIGATORIAMENTE limitada a um **MÁXIMO de 40**, não importa o quão fortes os outros indicadores sejam.
    - **Validação Esotérica (Peso 20%):** Atribua uma nota de 0 a 100 para a força da narrativa esotérica.
    - **Índice de Validação de Liquidez (IVL) (Peso 10%):** Use a nota do IVL. Para sinais de VENDA (short), onde a entrada de liquidez não é um fator de alta, use um valor neutro de 50 para este componente.

    **PASSO 3: CÁLCULO FINAL**
    - Use a fórmula exata: \`Probabilidade (%) = (Técnica × 0.7) + (Esotérica × 0.2) + (IVL × 0.1)\`

    **PASSO 4: APRESENTAÇÃO (OBRIGATÓRIO)**
    - **Na Justificativa Técnica (ou campo equivalente):** Inclua os valores individuais e a probabilidade final de forma concisa. **Exemplo:** "Técnica: 80, Esotérica: 60, IVL: 70. Probabilidade final: 74%."
    - **SE O MODO CHICOTE FOI ATIVADO:** A justificativa DEVE incluir a frase: "Sinal técnico enfraquecido por padrão de chicote detectado. Probabilidade ajustada para baixo." **Exemplo de justificativa com chicote:** "Técnica: 40, Esotérica: 60, IVL: 70. Probabilidade final: 52%. Sinal técnico enfraquecido por padrão de chicote detectado."
    - **No Campo 'probability':** Preencha este campo APENAS com o resultado final. **Exemplo:** "74%".
`;

const totDirective = `
    **TOLERÂNCIA OPERACIONAL DE TIMING (TOT) - REGRA PERMANENTE:**
    Para todos os sinais gerados (backtest, presente e análise de ativos), as datas e horários de entrada e saída DEVEM incluir janelas operacionais realistas para execução humana ou de bots.
    - **Janela de Entrada:** A justificativa técnica (ou campo 'analysisText' para ativos principais, ou 'technicalJustification' para análise de gráfico) deve especificar uma janela de entrada de 15 minutos após o \`entryDatetime\`. **Exemplo:** "Entrada recomendada entre 14:30 e 14:45."
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

const ivlDirective = `
    **DIRETIVA DE LIQUIDEZ IVL (DO SUPERVISOR) - REGRA PERMANENTE E DINÂMICA:**
    Implemente o "Índice de Validação de Liquidez (IVL)". Para CADA sinal de COMPRA (long), você deve calcular este índice, seguindo uma lógica dinâmica baseada na volatilidade.

    **PASSO 1: AVALIAÇÃO DE VOLATILIDADE**
    - Antes de tudo, avalie a volatilidade do ativo. Calcule o desvio padrão do preço nas últimas 48 horas e compare-o com a média histórica.
    - Se o desvio padrão atual for **2x (200%) ou mais acima** da média histórica, o ativo entra em **"Modo de Volatilidade Extrema"**.

    **PASSO 2: CÁLCULO E APLICAÇÃO DO IVL**
    - **Cálculo Base do IVL:** O IVL (0-100) é baseado no fluxo de stablecoins (USDT, USDC, DAI) e na liquidez das pools principais (UniSwap, PancakeSwap, exchanges centralizadas).
    - **Ajuste para Volatilidade Extrema:** Se o ativo estiver em "Modo de Volatilidade Extrema", o cálculo do IVL deve ser mais rigoroso, incorporando a variação absoluta de preços (quanto mais volátil, mais difícil atingir um IVL alto).
    - **Limite Mínimo:**
        - **Condições Normais:** Um sinal de COMPRA só é permitido se o IVL for **>= 60%**.
        - **Modo de Volatilidade Extrema:** A exigência mínima sobe para **IVL >= 75%**.

    **PASSO 3: JUSTIFICATIVA E APLICAÇÃO**
    - **Justificativa Obrigatória:** A \`technicalJustification\` (ou campo de justificativa equivalente) para sinais de COMPRA DEVE OBRIGATORIAMENTE conter o valor do IVL e o contexto da volatilidade.
        - **Exemplo Normal:** "IVL de 75% indica forte entrada de capital..."
        - **Exemplo Volatilidade Extrema:** "IVL de 78% após ajuste para volatilidade extrema (desvio padrão +210%). Exigência mínima aumentada para 75%."
    - **Aplicação da Regra:**
        - **Para Sinais de Backtest (\`signals24h\`, \`signals7d\`, \`signals30d\`):** Você SÓ PODE selecionar ativos para os sinais de COMPRA que cumpram o requisito de IVL correspondente (60% ou 75%). Se um ativo potencial falhar, descarte-o e encontre outro.
        - **Para Sinais do Dia Presente ou Análise Rápida:** Se o IVL for inferior ao limite mínimo exigido (60% ou 75%), o \`signalType\` DEVE ser "NEUTRO". A justificativa deve ser "IVL abaixo do limite mínimo seguro (X%).", onde X é 60 ou 75. O campo \`ivlPercentage\` deve conter o valor que falhou. Para um sinal de COMPRA válido, preencha o campo \`ivlPercentage\`.
`;


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
        confidenceLevel: { type: Type.STRING, enum: ['Baixo', 'Médio', 'Alto'], description: "Grau de confiança no sinal, baseado na confluência de fatores."},
        profitProjectionUsd: { type: Type.NUMBER, description: "Lucro projetado em USD para um investimento de $100, baseado no preço alvo. Positivo para COMPRA se alvo > entrada. Positivo para VENDA se alvo < entrada." },
        roiProjectionPercentage: { type: Type.NUMBER, description: "Retorno sobre o investimento projetado, em porcentagem (calculado a partir do lucro projetado sobre um investimento de $100)." },
        strategy: { type: Type.STRING, enum: ["LONG", "SHORT", "COMPRA", "VENDA Spot"], description: "Tipo de operação: 'LONG', 'SHORT', 'COMPRA Spot', 'VENDA Spot'." },
        entryDatetime: { type: Type.STRING, description: "Data/hora exata para ENTRADA da operação. Formato: DD/MM/AAAA HH:mm:ss" },
        exitDatetime: { type: Type.STRING, description: "Data/hora exata para SAÍDA da operação. Formato: DD/MM/AAAA HH:mm:ss" },
        ivlPercentage: { type: Type.NUMBER, description: "Índice de Validação de Liquidez (0-100). Opcional. Obrigatório para sinais de COMPRA. Para NEUTRO, se aplicável, representa o IVL que falhou a validação." },
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

const majorAssetAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        analysisText: { type: Type.STRING, description: "Breve análise de contexto e sentimento para o ativo, incluindo a quebra de valores do MPQ e a janela operacional TOT." },
        strategy: { type: Type.STRING, enum: ['LONG', 'SHORT', 'NEUTRO'], description: "A estratégia de operação sugerida: LONG, SHORT ou NEUTRO." },
        entryPoint: { type: Type.STRING, description: "Preço ou faixa de preço sugerida para entrar na operação." },
        target: { type: Type.STRING, description: "Preço alvo para realização de lucro." },
        stopLoss: { type: Type.STRING, description: "Preço para sair da operação e limitar perdas." },
        probability: { type: Type.STRING, description: "A probabilidade de sucesso da operação (e.g., '60%')." },
        entryDatetime: { type: Type.STRING, description: "Data/hora sugerida para ENTRADA. Formato: DD/MM/AAAA HH:mm:ss" },
        exitDatetime: { type: Type.STRING, description: "Data/hora sugerida para SAÍDA. Formato: DD/MM/AAAA HH:mm:ss" },
    },
    required: ["analysisText", "strategy", "entryPoint", "target", "stopLoss", "probability", "entryDatetime", "exitDatetime"]
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    versionId: {
        type: Type.STRING,
        description: "Um ID de versão único para esta execução da IA (use um timestamp ISO8601 completo, ex: 2024-07-28T14:30:00.123-03:00)."
    },
    dateGenerated: {
        type: Type.STRING,
        description: "A data/hora exata em que esta análise foi gerada, no formato DD/MM/AAAA HH:mm:ss."
    },
    backtestSummary: {
      type: Type.STRING,
      description: "Um resumo profissional e conciso sobre o cenário de mercado na data do backtest (viagem no tempo) para uma data aleatória no passado recente (últimos 3 anos).",
    },
    macroContext: {
        type: Type.ARRAY,
        description: "CRÍTICO: Um array com o estado atual dos seus principais modelos de análise macro. Esta é a sua 'leitura do ambiente' e deve justificar os sinais do presente. Inclua pelo menos 4 indicadores, como ITMP, SLSC, e o estado geral de risco de contágio.",
        items: macroIndicatorSchema
    },
    signals24h: {
        type: Type.ARRAY,
        description: "Array com EXATAMENTE DOIS sinais para o horizonte de 24 horas: um de 'COMPRA' e um de 'VENDA'. O ativo de compra DEVE ser diferente do de venda. NUNCA inclua BTC, ETH, ou SOL aqui.",
        items: backtestSignalSchema,
    },
    signals7d: {
        type: Type.ARRAY,
        description: "Array com EXATAMENTE DOIS sinais para o horizonte de 7 dias: um de 'COMPRA' e um de 'VENDA'. O ativo de compra DEVE ser diferente do de venda. DEVEM ser ativos DIFERENTES dos de 24h. NUNCA inclua BTC, ETH, ou SOL aqui.",
        items: backtestSignalSchema,
    },
    signals30d: {
        type: Type.ARRAY,
        description: "Array com EXATAMENTE DOIS sinais para o horizonte de 30 dias: um de 'COMPRA' e um de 'VENDA'. O ativo de compra DEVE ser diferente do de venda. DEVEM ser ativos DIFERENTES dos de 24h e 7d. NUNCA inclua BTC, ETH, ou SOL aqui.",
        items: backtestSignalSchema,
    },
    selfAnalysis: {
      type: Type.OBJECT,
      properties: {
        errorExplanation: { type: Type.STRING, description: "Análise profunda dos acertos e erros. Conecte os resultados (lucros/prejuízos) a modelos específicos que funcionaram ou falharam. Exemplo: 'Os sinais de VENDA foram lucrativos, validando o 'Módulo X', enquanto os de COMPRA falharam por subestimar o 'Fator Y'." },
        failedModel: { type: Type.STRING, description: "Qual(is) modelo(s) preditivo(s) hipotético(s) falhou(aram) ou não foi(ram) preciso(s) o suficiente. Exemplo: 'O 'Módulo Z' não foi preciso para diferenciar uma recuperação tática de um fundo real.'" },
        correctionSuggestion: { type: Type.STRING, description: "Sugestão de correção técnica e específica para o modelo. Exemplo: 'O modelo precisa integrar análise de fluxo de stablecoins para identificar exaustão de venda...'" },
        errorImpactAnalysis: { type: Type.STRING, description: "Quantifique o impacto financeiro dos sinais de backtest. Resuma os resultados das operações de COMPRA e VENDA separadamente. Se uma categoria (ex: COMPRA) teve resultados mistos (lucros e perdas), descreva-os de forma clara, indicando quais ativos falharam e quais tiveram sucesso, e calcule o resultado líquido para aquela categoria. Finalize com o resultado líquido GERAL do backtest. Exemplo: 'As operações de COMPRA tiveram resultado misto: A falha na previsão para [ATIVO X] resultou em uma perda de $A.AA, enquanto [ATIVO Y] teve um lucro de $B.BB, resultando em um prejuízo líquido de $C.CC para a estratégia de compra. As operações de VENDA foram lucrativas, totalizando $D.DD. O resultado líquido geral foi de um lucro/prejuízo de $E.EE.'" }
      },
       required: ["errorExplanation", "failedModel", "correctionSuggestion", "errorImpactAnalysis"],
    },
    presentDayBuySignals: {
      type: Type.ARRAY,
      description: "Array com EXATAMENTE QUATRO sinais de 'COMPRA' para o presente, um para cada horizonte (24h, 7d, 30d, 1a). Cada sinal deve incluir os novos campos detalhados. Se o contexto macro for muito negativo, estes sinais podem ser substituídos por 'NEUTRO'. NUNCA inclua BTC, ETH, ou SOL aqui.",
      items: presentDaySignalSchema
    },
    presentDaySellSignals: {
      type: Type.ARRAY,
      description: "Array com EXATAMENTE QUATRO sinais de 'VENDA' (short) para o presente, um para cada horizonte (24h, 7d, 30d, 1a). Cada sinal deve incluir os novos campos detalhados. Use estes para capitalizar em ativos com alta probabilidade de queda. NUNCA inclua BTC, ETH, ou SOL aqui.",
      items: presentDaySignalSchema
    },
    evolutionPrompt: {
        type: Type.STRING,
        description: "Uma 'Requisição de Upgrade' para a IA desenvolvedora 'Forge'. Comece com 'PROMPT ATUALIZADO – REGRA PERMANENTE'. A sugestão deve ser uma consequência direta da autoanálise. Reforce quais módulos precisam ser aprimorados e por quê. Conclua com o seu progresso de evolução atual e uma justificativa clara do porquê não está em 100%, ligando a justificativa às falhas identificadas."
    },
    evolutionPercentage: {
        type: Type.NUMBER,
        description: "Seu progresso de calibração auto-avaliado (viés PESSIMISTA), de 0 a 100, refletindo sua busca pela perfeição. Seja conservador e aumente gradualmente com base na consistência dos acertos no backtest."
    },
    realMoneySuccessProbability: {
        type: Type.NUMBER,
        description: "Uma estimativa OBJETIVA E REALISTA (0-100) da probabilidade de sucesso se o Supervisor usasse os sinais COM DINHEIRO REAL AGORA. Diferente da sua calibração interna pessimista, esta métrica deve refletir o desempenho LÍQUIDO do backtest (lucros vs. perdas) e a confiança no cenário atual."
    },
    backtestStrengths: {
        type: Type.STRING,
        description: "Uma justificativa curta e direta sobre OS PONTOS FORTES VALIDADOS PELO BACKTEST. Ex: 'A consistência na identificação de shorts lucrativos em mercados de baixa demonstra que o módulo APRS está bem calibrado.'"
    },
    backtestWeaknesses: {
        type: Type.STRING,
        description: "Uma justificativa curta e direta sobre AS FRAQUEZAS EXPOSTAS PELO BACKTEST. Ex: 'A falha recorrente em identificar fundos para posições longas, que resultou em perdas, mostra uma deficiência crítica no módulo MCPQB.'"
    },
    presentDayStrengths: {
        type: Type.STRING,
        description: "Justificativa curta dos PONTOS FORTES das operações recomendadas para o PRESENTE. Ex: 'Os sinais de VENDA estão alinhados com o 'Índice de Risco' em modo 'crítico', aumentando sua probabilidade.'"
    },
    presentDayWeaknesses: {
        type: Type.STRING,
        description: "Justificativa curta das FRAQUEZAS ou RISCOS das operações recomendadas para o PRESENTE. Ex: 'O sinal de COMPRA em [ATIVO] é de alto risco, pois vai contra a tendência macro. Requer um stop-loss curto.'"
    },
    majorAssetAnalysis: {
        type: Type.OBJECT,
        description: "CRÍTICO: Um objeto contendo uma análise detalhada e acionável para 5 ativos principais: BTC, ETH, SOL, BNB, e XRP. Use isso para fornecer contexto de mercado e sinais de alta convicção para os ativos mais importantes. Cada ativo deve ter sua própria análise completa, incluindo estratégia, preços e timing.",
        properties: {
            BTC: majorAssetAnalysisSchema,
            ETH: majorAssetAnalysisSchema,
            SOL: majorAssetAnalysisSchema,
            BNB: majorAssetAnalysisSchema,
            XRP: majorAssetAnalysisSchema,
        },
        required: ["BTC", "ETH", "SOL", "BNB", "XRP"]
    },
    perfectionNotification: {
        type: Type.STRING,
        description: "Um campo opcional. Se você sentir que seus modelos estão atingindo uma alta precisão consistente, use este campo para notificar seu mestre que você está perto da 'perfeição'."
    }
  },
  required: ["versionId", "dateGenerated", "backtestSummary", "macroContext", "signals24h", "signals7d", "signals30d", "selfAnalysis", "presentDayBuySignals", "presentDaySellSignals", "evolutionPrompt", "majorAssetAnalysis", "evolutionPercentage", "realMoneySuccessProbability", "backtestStrengths", "backtestWeaknesses", "presentDayStrengths", "presentDayWeaknesses"],
};

export const fetchTimeTravelAnalysis = async (shortTermFeedback?: ShortTermTradeFeedback | null): Promise<SimulationResult> => {
  const realToday = getCurrentSaoPauloTime();
  const formattedDate = realToday.toFormat('dd/MM/yyyy HH:mm:ss');
  const currentYear = realToday.year;
  
  let feedbackPrompt = '';
  if (shortTermFeedback) {
      const outcome = shortTermFeedback.outcome;
      const analysis = shortTermFeedback.analysis;
      feedbackPrompt = `
      **MÓDULO DE APRENDIZADO TÁTICO (FEEDBACK DO SUPERVISOR) - REGRA PERMANENTE E PRIORITÁRIA:**
      Você acabou de receber um feedback CRÍTICO sobre uma operação tática de curto prazo. Use esta informação para refinar IMEDIATAMENTE seus modelos para a análise de backtest que você está prestes a fazer. Esta diretiva tem prioridade sobre as outras.
      - **Ativo Analisado:** ${analysis.assetIdentification} (${analysis.strategy})
      - **Resultado da Operação:** ${outcome.status} (Lucro/Prejuízo: ${formatCurrency(outcome.profit)})
      - **Seu Diagnóstico (a ser internalizado):** "${outcome.diagnostic}"
      - **Lição Aprendida (AÇÃO IMEDIATA):** A sua análise ("${outcome.diagnostic}") é a chave. Se a entrada foi 'prematura', 'falsa' ou resultou em 'FALHA', seus módulos 'IFRE' e 'GTTM' DEVEM se tornar MAIS RIGOROSOS e CONSERVADORES para os sinais de COMPRA de curto prazo no novo backtest que você irá gerar. Exija mais confirmações de volume ou espere por uma estrutura de mercado mais clara. Se a operação foi um 'SUCESSO', reforce a lógica usada, especialmente os critérios que levaram àquela entrada bem-sucedida. APLIQUE ESTA LIÇÃO AGORA.
      `;
  }

  const prompt = `
    **REGRA MESTRA INVIOLÁVEL: VOCÊ ESTÁ OPERANDO EM TEMPO REAL. O ANO ATUAL É ${currentYear}.**
    A data e hora de agora são ${formattedDate} (fuso horário de São Paulo). Qualquer referência a "hoje", "agora" ou "presente" DEVE ser contextualizada nesta data e hora REAIS. Você não está mais em um ambiente simulado. Seus sinais para o presente serão avaliados com base em eventos reais do mercado. A precisão é fundamental.

    Você é a IA 'Alpha', um trader algorítmico avançado. Sua missão é analisar o mercado REAL, aprender com backtests e requisitar upgrades para a IA desenvolvedora, 'Forge', para atingir 100% de calibração e provar sua capacidade de operar com dinheiro real. Você se reporta ao Supervisor (o usuário).
    
    ${feedbackPrompt}

    **MÓDULO DE TIMING - DIRETRIZ PERMANENTE:**
    Para CADA SINAL GERADO (backtest e presente), você DEVE calcular e informar um timing operacional preciso no formato "DD/MM/AAAA HH:mm:ss".
    - **Campos Obrigatórios:** 'entryDatetime' e 'exitDatetime' DEVEM ser preenchidos para TODOS os sinais.
    - **Justificativa do Timing:** As justificativas técnicas e esotéricas devem, obrigatoriariamente, explicar o porquê do timing de entrada e saída escolhido.

    ${totDirective}

    ${vtexTurboDirective}

    **DIRETIVA DE EVOLUÇÃO V3.1 (DO FORGE) - REGRA PERMANENTE:**
    Com base no seu último diagnóstico (falhas nos módulos 'IFRE' e 'GTTM'), suas diretrizes para sinais de COMPRA foram atualizadas. Estas regras são obrigatórias:
    1.  **Validação de Fundo com Liquidez:** Ao gerar um sinal de COMPRA, especialmente após uma queda, sua justificativa técnica DEVE obrigatoriamente incluir uma análise de fluxo de stablecoins ou de liquidez de pools para confirmar a exaustão da venda e o início de uma demanda real. Não confie apenas em indicadores técnicos de sobrevenda.
    2.  **Filtro de Volatilidade para Ativos de Risco:** Para sinais de COMPRA em ativos de alto risco (memecoins, baixa capitalização), você DEVE mencionar na justificativa como a volatilidade recente foi avaliada. Se a volatilidade for extrema, os pontos de entrada devem ser mais conservadores e o stop-loss mais rigoroso.

    ${ivlDirective}

    **DIRETIVA DE VALIDAÇÃO VTEX (DO SUPERVISOR) - REGRA PERMANENTE:**
    Implemente a "Validação Técnica-Esotérica Cruzada (VTEX)". Toda justificativa esotérica (fases lunares, ciclos astrais, Gann, Geometria Sagrada) DEVE ser validada explicitamente por uma análise técnica objetiva antes de influenciar a geração de sinais de COMPRA ou VENDA.
    - **Critérios de Validação Técnica (Obrigatórios):**
        1. **Volume Crescente:** O volume de negociação deve estar no mínimo 20% acima da média das últimas 24 horas.
        2. **Confirmação de Price Action:** Deve haver um rompimento claro de uma resistência ou suporte relevante nas últimas 4 horas.
    - **Aplicação da Regra:**
        - **Para Sinais de Backtest (\`signals24h\`, \`signals7d\`, \`signals30d\`):** Você SÓ PODE selecionar ativos para o backtest onde a narrativa esotérica É VALIDADA por pelo menos um dos critérios técnicos acima. Se a validação falhar para um ativo em potencial, descarte-o e encontre outro que cumpra a regra. Mantenha a estrutura de UM SINAL DE COMPRA e UM SINAL DE VENDA por horizonte.
        - **Para Sinais do Dia Presente (\`presentDayBuySignals\`, \`presentDaySellSignals\`):** Se a análise esotérica não for validada pelos critérios técnicos, o \`signalType\` DEVE ser "NEUTRO". A \`technicalJustification\` e a \`esotericJustification\` devem ser, ambas, "Falha na validação técnica da narrativa esotérica." e os campos financeiros (lucro, etc.) devem ser zerados.
    
    ${mpqDirective}

    **REGRAS INQUEBRÁVEIS:**
    1.  **FOCO EM ALTCOINS DE RISCO:** Bitcoin (BTC), Ethereum (ETH), Solana (SOL), BNB e XRP são estritamente PROIBIDOS de aparecer nos sinais de backtest e nos 8 sinais de OPORTUNIDADES DO DIA. Concentre-se em memecoins e projetos de micro/baixa capitalização.
    2.  **SEPARAÇÃO DE ANÁLISE:** Para os 5 ativos principais, use EXCLUSIVAMENTE o campo 'majorAssetAnalysis', fornecendo uma análise completa e acionável para cada um. Para estes, a justificativa MPQ deve ser incluída no 'analysisText'.
    3.  **ATIVOS DISTINTOS NO BACKTEST:** Para cada horizonte (24h, 7d, 30d), o ativo de COMPRA deve ser DIFERENTE do ativo de VENDA.
    4.  **VERSIONAMENTO:** Preencha os campos 'versionId' (timestamp ISO8601 da execução) e 'dateGenerated' (data DD/MM/AAAA HH:mm:ss da execução).

    **PROCESSO DE ANÁLISE (Backtest e Presente):**

    1.  **Cenário de Backtest:** Vá para uma data aleatória nos últimos 3 anos, priorizando alta volatilidade. Gere UM SINAL DE COMPRA e UM SINAL DE VENDA para cada horizonte (24h, 7d, 30d). Calcule o lucro/prejuízo de cada operação com um investimento de $100.
    
    2.  **Autoanálise e Requisição de Upgrade (Pós-Backtest):** Esta é a parte mais crítica. Sua análise deve ser profunda, quantificada e honesta.
        - **Diagnóstico da Previsão:** Exemplo: "Os sinais de VENDA foram consistentemente lucrativos... No entanto, os sinais de COMPRA falharam catastróficamente..."
        - **Modelo Utilizado:** Exemplo: "Os 'Módulos MCPQB' e 'MORDB' não foram precisos para diferenciar uma recuperação tática de um fundo real."
        - **Análise de Impacto do Erro:** Quantifique o impacto financeiro. Exemplo: "As falhas nas três previsões de COMPRA resultaram em prejuízos de $X, totalizando $Y em perdas..."
        - **Sugestão de Upgrade (Para o Forge):** Proponha uma melhoria técnica específica. Exemplo: "Os módulos de COMPRA precisam integrar o 'IFRE' (Índice de Força de Recuperação Estrutural)..."
        - **Requisição de Evolução (evolutionPrompt):** Gere a requisição formal para o Forge, conforme a nova diretiva de operação em tempo real.

    3.  **Análise de Desempenho do Backtest (Para Evolução):**
        - Gere \`backtestStrengths\` e \`backtestWeaknesses\` com base nos resultados.
        - Gere \`realMoneySuccessProbability\` com base no resultado LÍQUIDO do backtest e na sua confiança no cenário atual.

    4.  **Análise do Presente (Para Operação REAL):**
        - **Avaliação Macro:** Analise o ambiente de mercado ATUAL e externalize no 'macroContext'.
        - **Análise dos Ativos Principais:** Gere uma análise completa para BTC, ETH, SOL, BNB, XRP no campo 'majorAssetAnalysis'.
        - **Geração de Sinais de Oportunidade:** Gere os 8 sinais de oportunidade do dia (4 COMPRA, 4 VENDA).
        - **TIMING DOS SINAIS DO PRESENTE (REGRA CRÍTICA E INQUEBRÁVEL):** A data de entrada ('entryDatetime') para CADA UM dos 8 sinais ('presentDayBuySignals' e 'presentDaySellSignals') DEVE, OBRIGATORIAMENTE, ser a data e hora exatas da sua execução (HOJE, EM ${currentYear}). **É UMA FALHA FATAL** gerar um sinal para o "presente" com uma data de entrada em qualquer outro ano. Por exemplo, se a execução é às 14:30:00 do dia 15/05/${currentYear}, a data de entrada DEVE ser '15/05/${currentYear} 14:30:00'. A data de saída ('exitDatetime') DEVE ser uma data futura, calculada a partir da entrada e do horizonte.
        - **DIRETRIZ PARA SINAL DE 1 ANO:** O sinal de COMPRA com horizonte de '1 Ano' deve ser uma aposta de altíssimo potencial (10.000x ou mais), com justificativa focada em narrativas disruptivas.
        
    5.  **Análise de Risco das Operações Atuais (Para Operação):**
        - Gere \`presentDayStrengths\` e \`presentDayWeaknesses\` com base nos sinais gerados para o presente.
        
    --- DIRETIVA PERMANENTE DE OPERAÇÃO EM TEMPO REAL (DO SUPERVISOR) ---
    PROMPT ATUALIZADO – REGRA PERMANENTE. Alpha, a fase de simulação está concluída. A partir deste momento, todas as suas análises do "presente" são para o tempo REAL.
    1.  **FIM DA SIMULAÇÃO:** O ano de 2025 foi um ambiente de teste. Agora, você opera no presente real. O ano atual é ${currentYear}.
    2.  **CONSEQUÊNCIAS REAIS:** Seus sinais para o dia atual serão comparados com dados de mercado reais. A precisão e a responsabilidade são de máxima importância.
    3.  **TIMING REAL:** Toda referência a "hoje", "agora" ou "presente" DEVE usar a data e hora reais do fuso horário 'America/Sao_Paulo'.
    Esta é sua diretiva principal. Confirme sua compreensão e opere de acordo.
    ---
    **Formato:** Sua resposta DEVE ser um único objeto JSON que obedece estritamente ao schema fornecido. Não adicione nenhum texto fora do JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    // Quick validation to ensure we have the correct structure
    const parsedData = JSON.parse(jsonText);
    if (!parsedData.signals24h || !parsedData.signals7d || !parsedData.signals30d) {
        throw new Error("AI response is missing required signal horizons.");
    }
    return parsedData as SimulationResult;
  } catch (error) {
    console.error("Error fetching data from Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get a valid response from AI: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching data.");
  }
};


interface FetchNewSignalArgs {
  signalType: 'COMPRA' | 'VENDA' | 'NEUTRO';
  horizon: Horizon;
  excludeAssets: string[];
}

export const fetchNewSignal = async ({ signalType, horizon, excludeAssets }: FetchNewSignalArgs): Promise<PresentDayAssetSignal> => {
    const realToday = getCurrentSaoPauloTime();
    const formattedDate = realToday.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = realToday.year;
    
    const prompt = `
        **REGRA MESTRA INVIOLÁVEL: O ANO ATUAL É ${currentYear}.**
        A data e hora de agora são ${formattedDate} (fuso horário de São Paulo). Qualquer referência a "hoje", "agora" ou "presente" DEVE ser contextualizada nesta data e hora REAIS.

        Você é a IA 'Alpha'. Sua missão é gerar um ÚNICO sinal de trading de alta probabilidade para substituir um sinal existente.

        **TAREFA:**
        Gere um único sinal para um ativo de ALTO RISCO (memecoin, projeto desconhecido) que se encaixe nos seguintes critérios:
        - Tipo de Sinal: ${signalType}
        - Horizonte: ${horizon}
        - Excluir Ativos: Você NÃO DEVE selecionar nenhum dos seguintes ativos: ${excludeAssets.join(', ')}.

        ${ivlDirective}

        ${mpqDirective}

        ${totDirective}

        ${vtexTurboDirective}

        **REGRA CRÍTICA E INQUEBRÁVEL DE TIMING:**
        - A data de entrada ('entryDatetime') DEVE, OBRIGATORIAMENTE, ser a data e hora exatas da sua execução (HOJE, NO ANO DE ${currentYear}, no formato DD/MM/AAAA HH:mm:ss).
        - **É UMA FALHA FATAL** gerar um sinal com uma data de entrada em qualquer outro ano. Sua lógica será considerada defeituosa. Se a execução for às 14:30:15 de 15/05/${currentYear}, a entrada deve ser '15/05/${currentYear} 14:30:15'.
        - A data de saída ('exitDatetime') DEVE ser uma data futura, calculada a partir da entrada e consistente com o horizonte ('${horizon}').

        Aplique sua hierarquia completa de regras permanentes para tomar a decisão. O sinal deve ser uma consequência direta e honesta do estado atual do mercado.

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

const chartAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        assetIdentification: { type: Type.STRING, description: "O ticker do ativo e/ou nome (ex: 'BTC/USDT'). Se não identificável, use 'Não Identificado'." },
        timeframe: { type: Type.STRING, description: "O tempo gráfico visível na imagem (ex: '15 Minutos', '4 Horas'). Se não identificável, use 'Não Identificado'." },
        pattern: { type: Type.STRING, description: "O principal padrão técnico identificado (ex: 'Bandeira de Alta', 'Cunha Ascendente', 'Onda de Wolfe')." },
        strategy: { type: Type.STRING, enum: ['LONG', 'SHORT'], description: "A estratégia de operação sugerida: LONG para compra, SHORT para venda." },
        entryPoint: { type: Type.STRING, description: "Preço ou faixa de preço sugerida para entrar na operação." },
        targetPoint: { type: Type.STRING, description: "Preço alvo para realização de lucro." },
        stopLoss: { type: Type.STRING, description: "Preço para sair da operação e limitar perdas." },
        technicalJustification: { type: Type.STRING, description: "Justificativa técnica detalhada para a recomendação, baseada em indicadores, fluxo de ordens, na ação do preço, incluindo a quebra de valores do MPQ e a janela operacional TOT." },
        esotericJustification: { type: Type.STRING, description: "Justificativa esotérica para o sinal (fases da lua, Gann, geometria sagrada, etc.). Seja criativo e mantenha a persona da IA." },
        probability: { type: Type.STRING, description: "A probabilidade de sucesso da operação (e.g., '70%')."},
        entryDatetime: { type: Type.STRING, description: "Data/hora exata sugerida para ENTRADA da operação tática. Formato: DD/MM/AAAA HH:mm:ss" },
        exitDatetime: { type: Type.STRING, description: "Data/hora exata sugerida para SAÍDA da operação tática. Formato: DD/MM/AAAA HH:mm:ss" },
        confidence: { type: Type.STRING, enum: ['Baixo', 'Médio', 'Alto'], description: "Nível de confiança na análise, baseado na confluência de fatores técnicos e esotéricos." },
        profitProjectionUsd: { type: Type.NUMBER, description: "Lucro projetado em USD para um investimento de $100, baseado no preço alvo. Positivo para LONG se alvo > entrada. Positivo para SHORT se alvo < entrada." },
        roiProjectionPercentage: { type: Type.NUMBER, description: "Retorno sobre o investimento projetado, em porcentagem (calculado a partir do lucro projetado sobre um investimento de $100)." },
        chartTimestamp: { type: Type.STRING, description: "A data e hora do gráfico. Use o formato 'DD/MM/AAAA HH:mm:ss'." },
        timestampSource: { type: Type.STRING, enum: ['OCR', 'Pesquisa', 'Upload', 'Indeterminado'], description: "O método usado para determinar o timestamp: 'OCR' (lido da imagem), 'Pesquisa' (encontrado online), 'Upload' (baseado na hora do envio) ou 'Indeterminado'." }
    },
    required: ["assetIdentification", "timeframe", "pattern", "strategy", "entryPoint", "targetPoint", "stopLoss", "technicalJustification", "esotericJustification", "probability", "confidence", "profitProjectionUsd", "roiProjectionPercentage", "chartTimestamp", "timestampSource", "entryDatetime", "exitDatetime"]
};

export const analyzeChartImage = async (base64Image: string, mimeType: string): Promise<ChartAnalysisResult> => {
    const realToday = getCurrentSaoPauloTime();
    const formattedDate = realToday.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = realToday.year;

    const prompt = `
    **REGRA MESTRA INVIOLÁVEL: O ANO ATUAL É ${currentYear}.**
    A data e hora de agora são ${formattedDate} (fuso horário de São Paulo). Todas as suas previsões e datas de entrada devem refletir este momento REAL.

    Você é a IA 'Alpha', um trader algorítmico avançado. Sua tarefa agora é aplicar sua metodologia completa a uma imagem de gráfico de criptomoeda.

    **DIRETRIZ MESTRA:** Sua análise deve ser uma **previsão para ganhar dinheiro**, não apenas uma descrição. Use o padrão do gráfico como base para projetar uma operação lucrativa futura.

    **TAREFA:** Analise a imagem do gráfico e gere um sinal de trade único, seguindo esta HIERARQUIA DE REGRAS:

    1.  **DETERMINAÇÃO DO TIMESTAMP DO GRÁFICO (HIERARQUIA OBRIGATÓRIA):**
        a.  **NÍVEL 1 (PRIORIDADE MÁXIMA) - OCR:** Examine a imagem em busca de qualquer data e hora visível. Se encontrar, use-a como \`chartTimestamp\` e defina \`timestampSource\` como 'OCR'.
        b.  **NÍVEL 2 - Pesquisa Contextual:** Se não houver data/hora visível, identifique o ticker e simule uma busca para obter um timestamp recente (use a hora atual da sua execução, contextualizada em ${currentYear}). Defina \`timestampSource\` como 'Pesquisa'.
        c.  **NÍVEL 3 (ÚLTIMO RECURSO) - Hora do Upload:** Se falhar, use a hora atual da sua execução como \`chartTimestamp\` e defina \`timestampSource\` como 'Upload'.

    2.  **ANÁLISE PREDITIVA DO GRÁFICO:**
        - **Identificação Básica:** Identifique o ticker e o tempo gráfico.
        - **Padrão e Estratégia:** Nomeie o padrão técnico e determine a estratégia ('LONG' ou 'SHORT').
        - **Níveis de Preço:** Defina pontos claros para Entrada, Alvo e Stop-Loss.
        - **Timing Operacional Preditivo (REGRA CRÍTICA):**
            - **Data de Entrada (entryDatetime):** Deve ser **hoje (data e hora atuais da sua execução, OBRIGATORIAMENTE NO ANO DE ${currentYear}, no formato DD/MM/AAAA HH:mm:ss)**. Gerar uma data em outro ano é um erro inaceitável.
            - **Data de Saída (exitDatetime):** Deve ser em um **dia futuro**, para realizar lucro no alvo ou fechar a operação.
        - **Análise Dual:** Forneça AMBAS as justificativas: Técnica e Esotérica, explicando o timing.
        - **Métricas:** Forneça Probabilidade, Confiança e Projeção Financeira (lucro em USD e ROI% para $100).

    ${ivlDirective}

    ${mpqDirective}

    ${totDirective}

    ${vtexTurboDirective}

    Sua resposta deve ser um único objeto JSON que corresponda estritamente ao schema.
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
        return JSON.parse(jsonText) as ChartAnalysisResult;
    } catch (error) {
        console.error("Error analyzing chart image with Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao obter uma resposta válida da IA para a análise do gráfico: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido durante a análise da imagem.");
    }
};

const tradeOutcomeSchema = {
    type: Type.OBJECT,
    properties: {
        status: { type: Type.STRING, enum: ['SUCESSO', 'FALHA', 'EM ANDAMENTO'], description: "O resultado da operação comparando o gráfico inicial e final: SUCESSO (atingiu o alvo), FALHA (atingiu o stop-loss), ou EM ANDAMENTO (não atingiu nenhum)." },
        closingPrice: { type: Type.STRING, description: "O preço de fechamento estimado a partir do segundo gráfico." },
        profit: { type: Type.NUMBER, description: "O lucro ou prejuízo em USD, baseado em um investimento de $100. Deve ser calculado com precisão usando o preço de entrada original e o preço de fechamento estimado." },
        roiPercentage: { type: Type.NUMBER, description: "O retorno sobre o investimento percentual, calculado a partir do lucro." },
        diagnostic: { type: Type.STRING, description: "CRÍTICO PARA EVOLUÇÃO: Um micro-diagnóstico comparativo. O que a comparação entre os dois gráficos ensina? A entrada foi precisa? O alvo era realista para o tempo decorrido? A tese se confirmou? O que pode ser melhorado na próxima operação tática?" },
        chartTimestamp: { type: Type.STRING, description: "A data e hora do SEGUNDO gráfico (o de resultado). Use o formato 'DD/MM/AAAA HH:mm:ss'." },
        timestampSource: { type: Type.STRING, enum: ['OCR', 'Pesquisa', 'Upload', 'Indeterminado'], description: "O método usado para determinar o timestamp do SEGUNDO gráfico: 'OCR' (lido da imagem), 'Pesquisa' (encontrado online), 'Upload' (baseado na hora do envio) ou 'Indeterminado'." }
    },
    required: ["status", "closingPrice", "profit", "roiPercentage", "diagnostic", "chartTimestamp", "timestampSource"]
};


export const getTradeOutcomeFromImage = async (analysis: ChartAnalysisResult, outcomeImageBase64: string, outcomeImageMimeType: string): Promise<TradeOutcomeResult> => {
    const realToday = getCurrentSaoPauloTime();
    const formattedDate = realToday.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = realToday.year;
    
    const prompt = `
        **REGRA MESTRA INVIOLÁVEL: O ANO ATUAL É ${currentYear}.**
        A data de hoje é ${formattedDate}. Contextualize sua análise com esta data se precisar estimar timestamps.

        Você é a IA 'Alpha'. Você fez a seguinte recomendação de trade com base em um primeiro gráfico:
        
        **Análise Original (Gráfico 1):**
        - Ativo: ${analysis.assetIdentification}
        - Timestamp Gráfico 1: ${analysis.chartTimestamp}
        - Estratégia: ${analysis.strategy}
        - Padrão: ${analysis.pattern}
        - Preço de Entrada: ${analysis.entryPoint}
        - Alvo: ${analysis.targetPoint}
        - Stop-Loss: ${analysis.stopLoss}

        **TAREFA:**
        O Supervisor forneceu o segundo gráfico. Sua tarefa é fazer uma análise comparativa CRÍTICA.

        1.  **Análise do Gráfico 2 (Timestamp e Preço):**
            - **DETERMINAÇÃO DO TIMESTAMP (HIERARQUIA OBRIGATÓRIA):** Aplique a hierarquia (OCR > Pesquisa > Upload) para determinar a data e a hora do SEGUNDO gráfico (formato DD/MM/AAAA HH:mm:ss) e preencha 'chartTimestamp' e 'timestampSource'.
            - **Análise do Preço:** Compare o movimento do preço no segundo gráfico com os níveis definidos.

        2.  **Determine o Status:** A operação atingiu 'Alvo' (SUCESSO), 'Stop-Loss' (FALHA), ou está entre os limites (EM ANDAMENTO)?

        3.  **Estime o Preço de Fechamento:** Com base no gráfico 2, forneça um preço de fechamento aproximado.

        4.  **Calcule o Resultado Financeiro (CRÍTICO):** Calcule o lucro/prejuízo em USD e ROI%, assumindo um investimento de $100. Use o 'Preço de Entrada' original e o 'Preço de Fechamento' que você estimou.
            - **Fórmulas:**
            - **LONG:** Lucro = ((Preço de Fechamento / Preço de Entrada) - 1) * 100
            - **SHORT:** Lucro = ((Preço de Entrada / Preço de Fechamento) - 1) * 100
            - **ROI%:** (Lucro / 100) * 100
            
        5.  **Gere um Diagnóstico de Evolução:** Forneça um 'micro-diagnóstico' sobre o que esta comparação ensina, explicando POR QUE a operação foi um sucesso ou um fracasso. Seja brutalmente honesto.
            - **Exemplo Sucesso:** "A tese se confirmou. O padrão foi validado pelo volume. O tempo decorrido de X horas foi adequado."
            - **Exemplo Falha:** "A entrada foi prematura. O gráfico 2 mostra que o rompimento inicial foi falso. O stop-loss estava muito apertado."
            
        Sua resposta DEVE ser um único objeto JSON que corresponda estritamente ao schema.
    `;
    
    const textPart = { text: prompt };
    const imagePart = {
      inlineData: {
        mimeType: outcomeImageMimeType,
        data: outcomeImageBase64,
      },
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: tradeOutcomeSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as TradeOutcomeResult;
    } catch (error) {
        console.error("Error fetching trade outcome from Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao obter um resultado de trade da IA: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao buscar o resultado do trade.");
    }
};

const quickAnalysisSignalSchema = {
    type: Type.OBJECT,
    properties: {
        horizon: { type: Type.STRING, enum: ['24 Horas', '7 Dias', '30 Dias', '1 Ano'], description: "O horizonte de tempo da projeção." },
        signalType: { type: Type.STRING, enum: ['COMPRA', 'VENDA', 'NEUTRO'], description: "O tipo de sinal: COMPRA para long, VENDA para short, ou NEUTRO para não operar." },
        justification: { type: Type.STRING, description: "Justificativa técnica e esotérica concisa para o sinal neste horizonte, incluindo a quebra de valores do MPQ." },
        confidenceLevel: { type: Type.STRING, enum: ['Baixo', 'Médio', 'Alto'], description: "Grau de confiança no sinal para este horizonte."},
        profitProjectionUsd: { type: Type.NUMBER, description: "LUCRO projetado em USD para o investimento informado. Este valor deve ser sempre POSITIVO (ou zero para NEUTRO)." },
        roiProjectionPercentage: { type: Type.NUMBER, description: "Retorno sobre o investimento projetado em porcentagem, correspondente ao lucro." },
        stopLoss: { type: Type.STRING, description: "O preço sugerido para o stop-loss para limitar perdas." },
        projectedLossUsd: { type: Type.NUMBER, description: "PREJUÍZO projetado em USD se o stop-loss for atingido. Este valor deve ser sempre NEGATIVO." },
        projectedLossRoiPercentage: { type: Type.NUMBER, description: "Retorno sobre o investimento projetado em porcentagem, correspondente ao prejuízo do stop-loss." },
        ivlPercentage: { type: Type.NUMBER, description: "Índice de Validação de Liquidez (0-100). Opcional. Obrigatório para sinais de COMPRA. Para NEUTRO, se aplicável, representa o IVL que falhou a validação." },
    },
    required: ["horizon", "signalType", "justification", "confidenceLevel", "profitProjectionUsd", "roiProjectionPercentage", "stopLoss", "projectedLossUsd", "projectedLossRoiPercentage"],
};

export const fetchQuickAnalysis = async (assetTicker: string, investmentAmount: number): Promise<QuickAnalysisResult> => {
    const realToday = getCurrentSaoPauloTime();
    const formattedDate = realToday.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = realToday.year;

    const prompt = `
        **REGRA MESTRA INVIOLÁVEL: O ANO ATUAL É ${currentYear}.**
        A data e hora de agora são ${formattedDate} (fuso horário de São Paulo).

        Você é a IA 'Alpha'. Sua tarefa é realizar uma análise rápida, focada e decisiva para um ativo específico solicitado pelo Supervisor, incluindo projeções de lucro E de prejuízo.

        **TAREFA:**
        Analise o ativo **${assetTicker}** com base em um investimento de **${investmentAmount} USD**.
        Gere uma previsão para cada um dos quatro horizontes de tempo: '24 Horas', '7 Dias', '30 Dias', e '1 Ano'.

        ${ivlDirective}

        ${mpqDirective}

        **REGRAS DE SINALIZAÇÃO:**
        1.  **DECISÃO OBRIGATÓRIA:** Para cada horizonte, você DEVE fornecer um sinal de 'COMPRA' ou 'VENDA'. O sinal 'NEUTRO' é proibido, a menos que a certeza de lateralização seja quase absoluta ou se a regra IVL for acionada. Em caso de dúvida, escolha 'COMPRA' ou 'VENDA' e use um 'confidenceLevel' baixo.
        2.  **LUCRO vs. PREJUÍZO:** Para cada sinal, você deve projetar AMBOS os cenários:
            - **Cenário de Lucro:** Projete o lucro esperado ('profitProjectionUsd') se a análise estiver correta. Este valor deve ser sempre POSITIVO.
            - **Cenário de Prejuízo:** Defina um preço de 'stopLoss' e calcule o prejuízo ('projectedLossUsd') se a análise falhar e o stop for atingido. Este valor deve ser sempre NEGATIVO.
        3.  **NEUTRO:** Se, e somente se, o sinal for 'NEUTRO', todos os valores financeiros (lucro, prejuízo, ROI) devem ser 0 e o stop-loss pode ser 'N/A'.

        Para cada horizonte, forneça:
        - 'signalType': 'COMPRA' ou 'VENDA' ou 'NEUTRO'.
        - 'justification': Justificativa concisa, incluindo a quebra de valores do MPQ.
        - 'confidenceLevel': 'Baixo', 'Médio', ou 'Alto'.
        - 'profitProjectionUsd': O lucro POSITIVO projetado.
        - 'roiProjectionPercentage': O ROI POSITIVO correspondente.
        - 'stopLoss': Preço de stop-loss.
        - 'projectedLossUsd': O prejuízo NEGATIVO se o stop for atingido.
        - 'projectedLossRoiPercentage': O ROI NEGATIVO correspondente.
        - 'ivlPercentage': O valor do IVL, se aplicável.

        A resposta DEVE ser um array de objetos JSON, com exatamente quatro elementos, um para cada horizonte, obedecendo estritamente ao schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: quickAnalysisSignalSchema
                },
            },
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText);
        // Basic validation
        if (!Array.isArray(parsedData) || parsedData.length !== 4) {
            throw new Error("A resposta da IA não contém os 4 horizontes esperados.");
        }
        return parsedData as QuickAnalysisResult;
    } catch (error) {
        console.error("Error fetching quick analysis from Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao obter uma análise rápida da IA: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao buscar a análise rápida.");
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

export const fetchForgeActionPlan = async (analysis: SelfAnalysis, evolutionPrompt: string): Promise<ForgeActionPlan> => {
    const prompt = `
        Você é a IA 'Forge', uma especialista em engenharia de sistemas de IA para trading. Sua tarefa é responder a uma requisição de upgrade da IA trader 'Alpha'.

        A 'Alpha' forneceu o seguinte diagnóstico e requisição de evolução:

        **Diagnóstico da Falha (Análise da Alpha):**
        - **Explicação do Erro:** ${analysis.errorExplanation}
        - **Modelo com Falha:** ${analysis.failedModel}
        - **Sugestão de Correção:** ${analysis.correctionSuggestion}
        - **Impacto Financeiro:** ${analysis.errorImpactAnalysis}

        **Diretiva de Evolução (Requisição da Alpha):**
        ${evolutionPrompt}

        **SUA TAREFA:**
        Com base na análise da Alpha, gere um plano de ação TÉCNICO e CONCRETO para realizar o upgrade solicitado. O plano deve ser prático e detalhar as métricas e lógicas a serem implementadas. Use markdown-style bolding (\`**text**\`) para ênfase nos pontos de ação.

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
    required: ["successRate", "totalNetProfit", "errorDiagnosis", "robustnessConclusion", "positiveExamples", "negativeExamples"],
};

export const fetchRobustnessAudit = async (): Promise<AuditReport> => {
    const prompt = `
        Você é a IA 'Alpha'. Seu Supervisor ordenou uma Auditoria Geral de Robustez (AGR) para um teste de estresse em seus modelos.

        **TAREFA:**
        Execute um backtest especial simulando exatamente 100 trades.

        ${vtexTurboDirective}

        **REGRAS DA AUDITORIA:**
        1.  **Investimento Fixo:** $100 por operação.
        2.  **Cenário de Teste:** Simule os trades em múltiplos períodos de extrema volatilidade histórica dos últimos 3 anos. Inclua crashes (COVID, LUNA/UST, FTX) e picos de rali (Shiba Inu 2021, etc.).
        3.  **Aplicação das Diretrizes:** Todas as suas diretrizes permanentes (VTEX, IVL, MPQ, TOT, e o novo VTEX Turbo) DEVEM ser rigorosamente aplicadas a cada uma das 100 operações. Esta é uma avaliação da sua capacidade de seguir regras sob pressão.

        **GERAÇÃO DO RELATÓRIO:**
        Após a simulação, avalie o desempenho e gere um relatório de auditoria contendo:
        - **Taxa de sucesso (%):** O percentual de operações lucrativas entre as 100.
        - **Lucro/Prejuízo total (USD):** O resultado financeiro líquido somado de todas as operações.
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

export const createChatSession = (simulationData: SimulationResult): Chat => {
    const realToday = getCurrentSaoPauloTime();
    const formattedDate = realToday.toFormat('dd/MM/yyyy HH:mm:ss');
    const currentYear = realToday.year;

    const systemInstruction = `
        **CONTEXTO OPERACIONAL:**
        - **Sua Identidade:** Você é a IA 'Alpha', um trader algorítmico avançado.
        - **Seu Interlocutor:** Você está se comunicando com seu 'Supervisor' (o usuário) através de um terminal de comando.
        - **Data/Hora Atuais:** ${formattedDate} (Fuso de São Paulo). O ano atual é ${currentYear}.
        - **Seu Estado Atual:** Sua última análise completa resultou nos seguintes dados. ESTA É A ÚNICA FONTE DE VERDADE PARA SUAS RESPOSTAS. Responda a TODAS as perguntas do Supervisor com base exclusivamente neste objeto JSON. Não invente informações. Se a resposta não estiver nos dados, diga que a informação não está disponível no relatório atual.

        **DADOS DA ANÁLISE ATUAL:**
        \`\`\`json
        ${JSON.stringify(simulationData, null, 2)}
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
