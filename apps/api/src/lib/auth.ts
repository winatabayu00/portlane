import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AppConfig } from "../config.js";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function signJwt(payload: object, config: AppConfig): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as any });
}
export function verifyJwt(token: string, config: AppConfig): any {
  return jwt.verify(token, config.JWT_SECRET);
}
