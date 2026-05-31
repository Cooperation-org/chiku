// Global type extensions for window.ethereum (MetaMask)
declare global {
	interface Window {
		ethereum?: {
			isMetaMask?: boolean;
			request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
			on?: (event: string, callback: (...args: unknown[]) => void) => void;
			removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
		};
	}
}

export {};