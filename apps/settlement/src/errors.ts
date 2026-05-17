export class GatewayError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'GatewayError';
  }
}

export class GatewayTimeoutError extends GatewayError {
  constructor() {
    super('gateway timeout');
    this.name = 'GatewayTimeoutError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public issues?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}
