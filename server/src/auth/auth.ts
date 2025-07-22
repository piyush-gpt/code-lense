import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface JWTPayload {
  account_login: string;
  installation_id: number;
  account_type: 'User' | 'Organization';
  account_id: number;
}

export const createSessionToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // 7 days
  });
};

export const verifySessionToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const createSecureCookie = (res: any, token: string) => {
  const cookieOptions = {
    httpOnly: true,
    secure: true,          // ✅ Use secure with HTTPS
    sameSite: "none",      // ✅ None allows cross-origin cookies
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  
  console.log('🍪 Setting cookie with options:', cookieOptions);
  res.cookie('devdash_session', token, cookieOptions);
};

export const clearSessionCookie = (res: any) => {
  res.clearCookie('devdash_session');
}; 