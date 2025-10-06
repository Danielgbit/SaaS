import { NextRequest } from 'next/server';
import { jwtVerify, JWTPayload } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function getAuthPayload(request: NextRequest): Promise<JWTPayload> {
  const token = request.cookies.get('token')?.value;
    if (!token) {
        throw new Error('No autenticado');
    }

  const { payload } = await jwtVerify(token, secret);
  return payload;
}