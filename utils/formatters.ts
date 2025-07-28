
export const formatCurrency = (value: number) => {
    if (value < 0.01 && value > -0.01 && value !== 0) {
         return `$${value.toPrecision(4)}`;
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
