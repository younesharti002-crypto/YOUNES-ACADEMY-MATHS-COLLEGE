import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_PASSWORD_BYTES = 1_024;

const PREFIX = "scrypt";

type ParsedPasswordHash = {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
};

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

function assertPasswordIsHashable(password: string): void {
  const size = Buffer.byteLength(password, "utf8");

  if (size === 0) {
    throw new Error("Password must not be empty");
  }

  if (size > MAX_PASSWORD_BYTES) {
    throw new Error("Password is too large");
  }
}

function parsePasswordHash(encoded: string): ParsedPasswordHash | null {
  const parts = encoded.split("$");

  if (parts.length !== 6 || parts[0] !== PREFIX) {
    return null;
  }

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);

  if (
    !Number.isSafeInteger(n) ||
    !Number.isSafeInteger(r) ||
    !Number.isSafeInteger(p) ||
    n <= 1 ||
    r <= 0 ||
    p <= 0
  ) {
    return null;
  }

  try {
    const salt = Buffer.from(saltRaw, "base64url");
    const hash = Buffer.from(hashRaw, "base64url");

    if (salt.length === 0 || hash.length === 0) {
      return null;
    }

    return { n, r, p, salt, hash };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordIsHashable(password);

  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const parsed = parsePasswordHash(encodedHash);

  if (!parsed) {
    return false;
  }

  const passwordSize = Buffer.byteLength(password, "utf8");
  if (passwordSize === 0 || passwordSize > MAX_PASSWORD_BYTES) {
    return false;
  }

  try {
    const derivedKey = await deriveKey(
      password,
      parsed.salt,
      parsed.hash.length,
      {
        N: parsed.n,
        r: parsed.r,
        p: parsed.p,
      },
    );

    if (derivedKey.length !== parsed.hash.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, parsed.hash);
  } catch {
    return false;
  }
}
