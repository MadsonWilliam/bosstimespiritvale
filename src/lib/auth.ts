import { claimNick } from "@/lib/db";
import { asNick, asPin } from "@/lib/validate";

/**
 * Reports may be anonymous. When credentials are present they must be valid —
 * silently dropping a bad PIN would let someone quietly farm points onto a
 * nick they do not own, so a wrong PIN fails the whole request.
 */
export type Identity = { userId: number | null; nick: string | null };

export class BadCredentials extends Error {
  constructor() {
    super("bad_pin");
  }
}

export function resolveIdentity(body: {
  nick?: unknown;
  pin?: unknown;
}): Identity {
  if (body.nick === undefined || body.nick === null || body.nick === "") {
    return { userId: null, nick: null };
  }
  const nick = asNick(body.nick);
  const pin = asPin(body.pin);
  const result = claimNick(nick, pin);
  if (!result.ok) throw new BadCredentials();
  return { userId: result.user.id, nick: result.user.nick };
}
