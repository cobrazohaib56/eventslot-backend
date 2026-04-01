import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
const router = Router();
function generateToken(user) {
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn });
}
// POST /api/auth/register
router.post('/register', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('role').isIn(['host', 'user']).withMessage('Role must be host or user'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: errors.array()[0].msg });
        return;
    }
    try {
        const { email, password, name, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(409).json({ success: false, error: 'Email already registered' });
            return;
        }
        const user = await User.create({ email, password, name, role });
        const userJson = user.toJSON();
        const token = generateToken({ id: userJson.id, email: userJson.email, name: userJson.name, role: userJson.role });
        res.status(201).json({
            success: true,
            user: { id: userJson.id, email: userJson.email, name: userJson.name, role: userJson.role },
            token,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});
// POST /api/auth/login
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: errors.array()[0].msg });
        return;
    }
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, isActive: true });
        if (!user) {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
            return;
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
            return;
        }
        const userJson = user.toJSON();
        const token = generateToken({ id: userJson.id, email: userJson.email, name: userJson.name, role: userJson.role });
        res.json({
            success: true,
            user: { id: userJson.id, email: userJson.email, name: userJson.name, role: userJson.role },
            token,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});
// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
    try {
        res.json({
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get user' });
    }
});
export default router;
//# sourceMappingURL=auth.js.map