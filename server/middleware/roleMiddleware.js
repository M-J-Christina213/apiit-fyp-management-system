/**
 * Role-Based Access Control Middleware
 * Expects 'x-user-role' header to be set by the client.
 */

const verifyRole = (allowedRoles) => {
    return (req, res, next) => {
        const rawRole = req.headers['x-user-role'];

        if (!rawRole) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Role information is missing."
            });
        }

        const userRole = String(rawRole).trim().toUpperCase();
        const rolesArray = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
            .map(r => String(r).trim().toUpperCase());

        if (!rolesArray.includes(userRole)) {
            return res.status(403).json({
                error: "Forbidden",
                message: "You do not have permission to perform this action."
            });
        }

        next();
    };
};

module.exports = { verifyRole };
