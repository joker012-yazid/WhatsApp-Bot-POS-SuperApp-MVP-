declare module 'escpos' {
  export class Printer {
    constructor(device: any, options?: Record<string, unknown>);
    encode(...args: unknown[]): this;
    style(style: string): this;
    size(width: number, height: number): this;
    text(content: string): this;
    align(mode: string): this;
    newline(): this;
    cut(mode?: string): this;
    close(): void;
  }

  export class Network {
    constructor(address: string, port?: number);
    open(callback: (error: Error | null) => void): void;
    close(): void;
  }

  export class USB {
    constructor(vid?: number, pid?: number);
    open(callback: (error: Error | null) => void): void;
    close(): void;
  }

  const escpos: {
    Printer: typeof Printer;
    Network: typeof Network;
    USB: typeof USB;
    [key: string]: unknown;
  };

  export default escpos;
}

declare module 'escpos-usb';
declare module 'escpos-network';
