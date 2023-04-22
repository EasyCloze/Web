import sha256 from 'crypto-js/sha256';

export function hash(user: string, pass: string): string {
  return sha256(sha256(user).concat(sha256(pass))).toString();
}
