export declare const colors: {
    red: (text: string) => string;
    green: (text: string) => string;
    yellow: (text: string) => string;
    blue: (text: string) => string;
    magenta: (text: string) => string;
    cyan: (text: string) => string;
    gray: (text: string) => string;
    bold: (text: string) => string;
};
export declare function formatTokenCount(tokens: number): string;
export type TableColumn<T extends Record<string, unknown> = Record<string, unknown>> = {
    header: string;
    field: keyof T & string;
    width: number;
    align?: 'left' | 'right' | 'center';
    format?: (value: any, row: T) => string;
};
export declare function renderTable<T extends Record<string, unknown>>(rows: T[], columns: TableColumn<T>[]): string;
export declare function formatCostWithColor(cost: number): string;
export declare function formatDuration(milliseconds: number): string;
//# sourceMappingURL=formatting.d.ts.map