// lib/base64.ts
// Isomorphic base64url helpers (no Buffer, work in browser & node)

function toB64(bytes: Uint8Array): string {
  if (typeof window === "undefined") {
    // Node
    return Buffer.from(bytes).toString("base64");
  } else {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
}

function fromB64(b64: string): Uint8Array {
  if (typeof window === "undefined") {
    // Node
    return new Uint8Array(Buffer.from(b64, "base64"));
  } else {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
}

export function toBase64Url(bytes: Uint8Array): string {
  return toB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64Url(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  // pad to multiple of 4
  if (b64.length % 4) b64 += "=".repeat(4 - (b64.length % 4));
  return fromB64(b64);
}
