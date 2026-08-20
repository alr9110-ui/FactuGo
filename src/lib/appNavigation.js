const isStaticDeployment = import.meta.env.BASE_URL !== '/';

export function getAppPath(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return isStaticDeployment ? `${import.meta.env.BASE_URL}#${normalizedPath}` : normalizedPath;
}

export function navigateToAppPath(path = '/', { replace = false } = {}) {
  const destination = getAppPath(path);
  if (replace) window.location.replace(destination);
  else window.location.assign(destination);
}
