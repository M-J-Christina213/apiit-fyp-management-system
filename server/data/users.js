const bcrypt = require("bcryptjs");

const users = [

    {
        id: 1,
        name: "Christina Wanigasekara",
        cbNo: "CB014416",
        email: "CB014416@students.apiit.lk",
        password: bcrypt.hashSync("123@abc", 10),
        role: "student"
    },

    {
        id: 2,
        name: "Mr Kavin Kumar",
        email: "kavin@apiit.lk",
        password: bcrypt.hashSync("123@abc", 10),
        role: "supervisor"
    },

    {
        id: 3,
        name: "Ms Fatima",
        email: "fatima@apiit.lk",
        password: bcrypt.hashSync("123@abc", 10),
        role: "pm"
    },

    {
        id: 4,
        name: "Ms.Nirosha",
        email: "nirosha@apiit.lk",
        password: bcrypt.hashSync("123@abc", 10),
        role: "admin"
    }

];

module.exports = users;