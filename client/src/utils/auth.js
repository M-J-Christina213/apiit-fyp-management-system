export const getLoggedInUser = () => {
    const user = localStorage.getItem("fyp_current_user");

    return user ? JSON.parse(user) : null;
};

export const setLoggedInUser = (user) => {
    if (user) {
        localStorage.setItem(
            "fyp_current_user",
            JSON.stringify(user)
        );
    } else {
        localStorage.removeItem("fyp_current_user");
    }
};