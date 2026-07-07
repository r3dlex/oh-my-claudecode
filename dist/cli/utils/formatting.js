export const colors = {
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    magenta: (text) => `\x1b[35m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`
};
export function formatTokenCount(tokens) {
    if (tokens < 1000)
        return `${tokens}`;
    if (tokens < 1000000)
        return `${(tokens / 1000).toFixed(1)}k`;
    return `${(tokens / 1000000).toFixed(2)}M`;
}
function padCell(value, width, align = 'left') {
    const visible = value.length;
    if (visible >= width)
        return value;
    const padding = width - visible;
    if (align === 'right')
        return `${' '.repeat(padding)}${value}`;
    if (align === 'center') {
        const left = Math.floor(padding / 2);
        const right = padding - left;
        return `${' '.repeat(left)}${value}${' '.repeat(right)}`;
    }
    return `${value}${' '.repeat(padding)}`;
}
export function renderTable(rows, columns) {
    const header = columns.map((column) => padCell(column.header, column.width, column.align)).join('  ');
    const separator = columns.map((column) => '-'.repeat(Math.max(3, column.width))).join('  ');
    const body = rows.map((row) => columns.map((column) => {
        const raw = row[column.field];
        const text = column.format ? column.format(raw, row) : raw == null ? '' : String(raw);
        return padCell(text, column.width, column.align);
    }).join('  '));
    return [header, separator, ...body].join('\n');
}
export function formatCostWithColor(cost) {
    const formatted = `$${cost.toFixed(4)}`;
    if (cost < 1)
        return colors.green(formatted);
    if (cost < 5)
        return colors.yellow(formatted);
    return colors.red(formatted);
}
export function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60)
        return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60)
        return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}
//# sourceMappingURL=formatting.js.map