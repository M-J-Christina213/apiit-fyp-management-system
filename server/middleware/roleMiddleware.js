/**
 * Role-Based Access Control Middleware
 * Expects 'x-user-role' header to be set by the client.
 */

const verifyRole = (allowedRoles) => {
    return (req, res, next) => {
        // Since there is no JWT implementation across the app yet,
        // we simulate RBAC by checking a custom header 'x-user-role'
        const userRole = req.headers['x-user-role'];

        if (!userRole) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Role information is missing."
            });
        }

        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

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
