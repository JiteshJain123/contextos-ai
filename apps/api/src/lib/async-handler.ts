import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route handler so any rejected promise is forwarded to
 * Express's error middleware (`next(err)`).
 *
 * Express 5 forwards rejected promises automatically, so this wrapper is
 * mostly a documentation device + defense-in-depth. Use it on every async
 * controller so readers see the intent at a glance:
 *
 *   router.get("/users/:id", asyncHandler(async (req, res) => {
 *     const user = await userService.findById(req.params.id);
 *     res.json(ok(user));
 *   }));
 */
export function asyncHandler<TReq extends Request = Request, TRes extends Response = Response>(
  fn: (req: TReq, res: TRes, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as TReq, res as TRes, next)).catch(next);
  };
}
