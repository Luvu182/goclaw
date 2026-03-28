/**
 * Parse a session key like "agent:myAgent:abc123" into parts.
 */
export function parseSessionKey(key: string): {
  agentId: string;
  scope: string;
} {
  const parts = key.split(":");
  if (parts.length >= 3 && parts[0] === "agent") {
    return { agentId: parts[1]!, scope: parts.slice(2).join(":") };
  }
  return { agentId: "", scope: key };
}

/**
 * Build a session key from agent ID and scope.
 */
export function buildSessionKey(agentId: string, scope: string): string {
  return `agent:${agentId}:${scope}`;
}

/**
 * Parse a session scope like "dev-lark:direct:oc_646b..." into channel, peerKind, senderID.
 * Returns null if the scope doesn't match the expected format.
 */
export function parseScopeDetails(scope: string): {
  channel: string;
  peerKind: string;
  senderID: string;
} | null {
  // Format: {channel}:{peerKind}:{senderID}
  // senderID may itself contain colons, so only split first two
  const first = scope.indexOf(":");
  if (first < 0) return null;
  const second = scope.indexOf(":", first + 1);
  if (second < 0) return null;

  const channel = scope.slice(0, first);
  const peerKind = scope.slice(first + 1, second);
  const senderID = scope.slice(second + 1);

  if (!senderID) return null;
  return { channel, peerKind, senderID };
}

/**
 * Check if a session belongs to the current web user.
 * New format: "ws:direct:{convId}" — API already filters by userId, so all WS sessions are own.
 * Legacy format: "ws-{userId}-{timestamp}".
 * Sessions from other channels (telegram, discord, etc.) are foreign.
 */
export function isOwnSession(sessionKey: string, userId: string): boolean {
  if (!userId) return false;
  const { scope } = parseSessionKey(sessionKey);
  if (scope.startsWith("ws:direct:")) return true;
  return scope.startsWith(`ws-${userId}-`);
}
