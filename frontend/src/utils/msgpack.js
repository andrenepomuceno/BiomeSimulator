/**
 * MessagePack encode/decode helpers.
 */
import msgpack from 'msgpack-lite';

export function decode(data) {
  if (data instanceof ArrayBuffer) {
    return msgpack.decode(new Uint8Array(data));
  }
  if (data instanceof Uint8Array) {
    return msgpack.decode(data);
  }
  // If it's a Blob, convert first
  return data;
}

export function encode(obj) {
  return msgpack.encode(obj);
}

/**
 * Fetch with msgpack response parsing.
 */
export async function fetchMsgpack(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('msgpack')) {
    const buf = await res.arrayBuffer();
    return decode(buf);
  }
  return res.json();
}
