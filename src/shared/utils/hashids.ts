import Hashids from "hashids";

const SALT = "super-secure-saas-url-shortener";
const MIN_LENGTH = 6;

const hashids = new Hashids(SALT, MIN_LENGTH);

export function encodeId(id: number | bigint): string {
  return hashids.encode(Number(id));
}

export function decodeId(hash: string): number | null {
  const decoded = hashids.decode(hash);

  if (!decoded.length) return null;

  return Number(decoded[0]);
}
