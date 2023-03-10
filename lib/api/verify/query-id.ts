import { APIError } from 'lib/model/error';

export function verifyQueryIdNum(query: Record<string, unknown>): number {
  if (Number.isNaN(Number(query.id))) {
    const msg = 'Expected query to contain an ID param with type number';
    throw new APIError(msg, 400);
  }
  return Number(query.id);
}

export function verifyQueryId(query: Record<string, unknown>): string {
  if (typeof query.id !== 'string') {
    const msg = 'Expected query to contain an ID param with type string';
    throw new APIError(msg, 400);
  }
  return query.id;
}
