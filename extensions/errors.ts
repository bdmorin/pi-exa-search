export class ValidationError extends Error {
	constructor(
		readonly code: string,
		message: string,
		readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "ValidationError";
	}
}

export class ConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigError";
	}
}

export class ProviderError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ProviderError";
	}
}
