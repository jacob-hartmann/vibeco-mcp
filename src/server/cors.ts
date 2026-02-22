/**
 * CORS path allowlisting utilities.
 *
 * For the Vibe MCP server, we allow CORS on the /mcp endpoint
 * since there is no OAuth flow requiring separate endpoints.
 */

const CORS_ALLOWED_PATHS = ["/mcp"] as const;

/**
 * Boundary-aware "startsWith" that only matches the allowed path when the
 * request path is either exactly the allowed path or is a subpath.
 */
/** @internal Exported for testing */
export function matchesAllowedPathBoundary(
  requestPath: string,
  allowedPath: string
): boolean {
  if (requestPath === allowedPath) return true;
  if (allowedPath.endsWith("/")) return requestPath.startsWith(allowedPath);
  return requestPath.startsWith(`${allowedPath}/`);
}

export function isCorsAllowedPath(requestPath: string): boolean {
  return CORS_ALLOWED_PATHS.some((allowedPath) =>
    matchesAllowedPathBoundary(requestPath, allowedPath)
  );
}
