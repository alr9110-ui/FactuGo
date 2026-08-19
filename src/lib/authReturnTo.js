// Resolves a ?returnTo= value to a safe same-origin path, or to "/".
export function safeReturnTo() {
  const raw = new URLSearchParams(window.location.search).get('returnTo');
  if (!raw) return '/';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    for (const param of ['access_token', 'clear_access_token', 'app_id', 'app_base_url', 'functions_version', 'from_url']) {
      url.searchParams.delete(param);
    }
    const path = url.pathname + url.search;
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return '/';
    return path;
  } catch {
    return '/';
  }
}
