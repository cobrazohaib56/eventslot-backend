import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
        role: 'host' | 'user';
    };
}
export declare function verifyToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function requireRole(role: 'host' | 'user'): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map