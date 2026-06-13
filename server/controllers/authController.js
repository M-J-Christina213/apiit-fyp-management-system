const bcrypt = require("bcryptjs");
const users = require("../data/users");

const loginUser = async (req, res) => {

    const { email, password } = req.body;

    const user = users.find(
        (u) => u.email === email
    );

    if (!user) {
        return res.status(401).json({
            message: "User not found"
        });
    }

    const isMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!isMatch) {
        return res.status(401).json({
            message: "Invalid password"
        });
    }

    res.json({
        id: user.id,
        name: user.name,
        cbNo: user.cbNo || null,
        email: user.email,
        role: user.role
    });

};

module.exports = {
    loginUser
};