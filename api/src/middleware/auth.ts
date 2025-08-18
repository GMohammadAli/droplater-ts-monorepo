import { Request, Response, NextFunction } from "express";

const AUTH_TOKEN = process.env.SECRET_AUTH_TOKEN || "mysecret123";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeaders = req.headers["authorization"];
  const token = authHeaders?.split(" ")[1];

  if (token && token === AUTH_TOKEN) {
    return next();
  }
  return res.status(401).json({
    message: "Authentication Failed",
  });
};
