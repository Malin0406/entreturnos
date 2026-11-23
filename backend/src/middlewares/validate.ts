import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Valida body/query/params com Zod. Os valores já convertidos substituem os originais.
 * Erros são tratados pelo errorHandler centralizado.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      }
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
}
