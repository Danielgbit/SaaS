// src/lib/auth/permissions.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from './jwt';

export function withAuth(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'Unauthorized' });
      const user = verifyToken(token);
      (req as any).user = user;
      return handler(req, res);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid Token' });
    }
  };
}
