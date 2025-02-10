// Get stored credentials if they exist
export function getUserCredentials() {
    const username = localStorage.getItem('username');
    const password = localStorage.getItem('password');
    return { username, password };
}

export function setUserCredentials(username, password) {
    localStorage.setItem('username', username);
    localStorage.setItem('password', password);
}

export function clearUserCredentials() {
    localStorage.removeItem('username');
    localStorage.removeItem('password');
    //dd
}
