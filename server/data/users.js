const bcrypt = require("bcryptjs");

const users = [
    // Student Accounts
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
        name: "Kasun Jayasinghe",
        cbNo: "CB014417",
        email: "CB014417@students.apiit.lk",
        password: bcrypt.hashSync("123@abc", 10),
        role: "student"
    },
    {
        id: 3,
        name: "Tharushi Fernando",
        cbNo: "CB014418",
        email: "CB014418@students.apiit.lk",
        password: bcrypt.hashSync("123@abc", 10),
        role: "student"
    },

    // Supervisors
    {
        id: 20,
        name: "Mr Kavin Kumar",
        email: "kavin@apiit.lk",
        password: bcrypt.hashSync("123@abc", 10),
        role: "supervisor"
    },
    {
        id: 21,
        name: "Dr Nirmala Perera",
        email: "nirmala@apiit.lk",
        password: bcrypt.hashSync("123@abc", 10),
        role: "supervisor"
    },

    // PM
    {
        id: 30,
        name: "Ms Fatima",
        email: "fatima@apiit.lk",
        password: bcrypt.hashSync("123@abc", 10),
        role: "pm"
    },

    // Admin
    {
        id: 40,
        name: "Ms Nirosha",
        email: "nirosha@apiit.lk",
        password: bcrypt.hashSync("123@abc", 10),
        role: "admin"
    }
];

module.exports = users;