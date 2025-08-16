import * as jwt from 'jsonwebtoken';

export class JwtVerifier {
  static async verify(token: string): Promise<any> {
    try {
      const secret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  static generateToken(payload: any): string {
    const secret = process.env.JWT_SECRET || 'default-secret';
    return jwt.sign(payload, secret, { expiresIn: '1h' });
  }
} 