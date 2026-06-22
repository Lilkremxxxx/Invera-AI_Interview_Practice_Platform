export function ensureLeadingSlash(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function joinAutomationPath(...segments: Array<string | undefined | null>): string {
  const parts = segments
    .filter((segment): segment is string => Boolean(segment))
    .map((segment, index) =>
      index === 0 ? segment.replace(/\/+$/, "") : segment.replace(/^\/+|\/+$/g, ""),
    )
    .filter(Boolean);

  if (parts.length === 0) return "/";

  return ensureLeadingSlash(parts.join("/"));
}

export function buildAutomationRoute(
  path: string,
  searchParams?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(ensureLeadingSlash(path), "http://automation.local");

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value == null) return;
    url.searchParams.set(key, String(value));
  });

  return `${url.pathname}${url.search}`;
}
