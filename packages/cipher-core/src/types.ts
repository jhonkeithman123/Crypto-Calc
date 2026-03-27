export type BaseInput = number | 'alpha' | 'ascii' | 'unicode';

export interface CipherResult {
  ciphertext: string;
  logs: string[];
  meta?: Record<string, any>;
}

export interface CipherContract {
  encrypt(text: string, key: number | string, base: BaseInput, options?: { log?: boolean }): Promise<CipherResult>;
  decrypt(text: string, key: number | string, base: BaseInput, options?: { log?: boolean }): Promise<CipherResult>;
  resolveBase(base: BaseInput): number;
  validateKey(key: number | string, base: BaseInput): boolean;
}
