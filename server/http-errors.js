import { METHODS } from 'node:http';

export function asyncRoute(handler) {
  return function (req, res, next, ...args) {
    return Promise.resolve().then(() => handler.call(this, req, res, next, ...args)).catch(next);
  };
}

// Cover source and generated routes and their middleware at registration time.
export function installAsyncRoutes(app) {
  const wrap = handlers => handlers.map(handler => {
    if (Array.isArray(handler)) return wrap(handler);
    if (typeof handler !== 'function' || (handler.handle && handler.set)) return handler;
    if (handler.length === 4) {
      return function (err, req, res, next) {
        return Promise.resolve().then(() => handler.call(this, err, req, res, next)).catch(next);
      };
    }
    return asyncRoute(handler);
  });
  const use = app.use;
  app.use = function (...args) { return use.apply(this, wrap(args)); };
  const param = app.param;
  app.param = function (name, handler) {
    if (typeof handler !== 'function') return param.apply(this, arguments);
    return param.call(this, name, asyncRoute(handler));
  };
  for (const method of new Set([...METHODS.map(m => m.toLowerCase()), 'all'])) {
    const register = app[method];
    if (!register) continue;
    app[method] = function (path, ...handlers) {
      if (method === 'get' && handlers.length === 0) return register.call(this, path);
      return register.call(this, path, ...wrap(handlers));
    };
  }
  const route = app.route;
  app.route = function (...args) {
    const registered = route.apply(this, args);
    for (const method of new Set([...METHODS.map(m => m.toLowerCase()), 'all'])) {
      const register = registered[method];
      if (!register) continue;
      registered[method] = function (...handlers) {
        return register.apply(this, wrap(handlers));
      };
    }
    return registered;
  };
}

export function validateIdentifier(req, res, next, id) {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({ error: 'Identifiant invalide.' });
  }
  next();
}

// Only application-selected messages are public; dependency error messages stay private.
export class ApiDependencyError extends Error {
  constructor(kind, cause) { super('Dependency failure', { cause }); this.kind = kind; }
}

export function jsonErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const publicErrors = { support: [502, "Impossible d'envoyer le message pour le moment."], ai: [502, 'Service IA indisponible.'] };
  if (err instanceof ApiDependencyError && Object.hasOwn(publicErrors, err.kind)) {
    const [status, error] = publicErrors[err.kind];
    return res.status(status).json({ error });
  }
  const status = err?.type === 'entity.too.large' ? 413
    : err?.type === 'entity.parse.failed' || err instanceof URIError ? 400 : 500;
  res.status(status).json({ error: status === 413 ? 'Requête trop volumineuse.'
    : status === 400 ? 'Requête invalide.' : 'Erreur interne du serveur.' });
}
