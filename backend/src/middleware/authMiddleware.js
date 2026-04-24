const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hostel_secret_key_2026');
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
            next();
        } catch (err) {
            console.error('JWT Error:', err.message);
            res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

const wardenOnly = (req, res, next) => {
    if (req.user && req.user.role && req.user.role.toLowerCase().trim() === 'warden') return next();
    res.status(403).json({ success: false, message: 'Access denied: Warden only' });
};

const studentOnly = (req, res, next) => {
    if (req.user && req.user.role && req.user.role.toLowerCase().trim() === 'student') return next();
    res.status(403).json({ success: false, message: 'Access denied: Student only' });
};

const financialManagerOnly = (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase().trim();
    if (role === 'financial' || role === 'security') return next();
    res.status(403).json({ success: false, message: 'Access denied: Staff only' });
};

const securityOfficerOnly = (req, res, next) => {
    if (req.user && req.user.role && req.user.role.toLowerCase().trim() === 'security') return next();
    res.status(403).json({ success: false, message: 'Access denied: Security Officer only' });
};

const optionalProtect = async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hostel_secret_key_2026');
            req.user = await User.findById(decoded.id).select('-password');
        } catch (err) {
            // ignore token errors for optional auth
        }
    }
    next();
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({ success: false, message: 'Not authorized: No user found in request' });
        }
        if (!req.user.role) {
            return res.status(403).json({ success: false, message: 'Not authorized: User has no role assigned' });
        }
        
        const userRoleLower = req.user.role.toLowerCase().trim();
        const allowedRolesLower = roles.map(r => r.toLowerCase().trim());
        
        if (!allowedRolesLower.includes(userRoleLower)) {
            return res.status(403).json({ 
                success: false, 
                message: `Not authorized for this role. Your role: "${req.user.role}"`,
                details: `Required: ${roles.join(' or ')}`
            });
        }
        next();
    };
};

module.exports = { protect, optionalProtect, authorize, wardenOnly, studentOnly, financialManagerOnly, securityOfficerOnly };
