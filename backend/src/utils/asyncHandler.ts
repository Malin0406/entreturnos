import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Encaminha erros de handlers assíncronos para o errorHandler centralizado. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
