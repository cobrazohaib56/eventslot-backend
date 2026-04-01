import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
export async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'No token provided' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.id).select('-password');
        if (!user || !user.isActive) {
            res.status(401).json({ success: false, error: 'User not found or inactive' });
            return;
        }
        req.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
        };
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
}
export function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        if (req.user.role !== role) {
            res.status(403).json({ success: false, error: `Access denied. ${role} role required.` });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map