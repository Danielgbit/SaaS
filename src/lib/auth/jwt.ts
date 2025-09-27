import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;

export function signToken(payload: object, expiresIn = '1d') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET);
}
