/**
 * @jest-environment jsdom
 */
const { handleLogin } = require('../public/index');

describe('Login Form Submission', () => {
    let loginForm, loginMessage;

    beforeEach(() => {
        // Mock DOM to test messages changes and form calss
        document.body.innerHTML = `
            <form id="loginForm">
                <input name="email" />
                <input name="password" />
            </form>
            <p id="loginMessage"></p>
        `;

        loginForm = document.getElementById('loginForm');
        loginMessage = document.getElementById('loginMessage');
    });
    // Test for succussful login attempt changes
    test('displays success message on successful login', async () => {
        const mockFetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ message: 'Login OK', redirect: '/dashboard' }),
            })
        );

        const event = { preventDefault: jest.fn() };
        await handleLogin(event, loginForm, loginMessage, mockFetch);

        expect(mockFetch).toHaveBeenCalledWith('/login', expect.any(Object));
        expect(loginMessage.textContent).toBe('Login OK');
        expect(loginMessage.style.color).toBe('green');
    });
    // Test for unsuccussful login attempt changes
    test('displays error message on failed login', async () => {
        const mockFetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ message: 'Invalid credentials' }),
            })
        );

        const event = { preventDefault: jest.fn() };
        await handleLogin(event, loginForm, loginMessage, mockFetch);

        expect(loginMessage.textContent).toBe('Invalid credentials');
        expect(loginMessage.style.color).toBe('red');
    });
    // Test for server issue message changes
    test('handles network error gracefully', async () => {
        const mockFetch = jest.fn(() => Promise.reject(new Error('Network failure')));

        const event = { preventDefault: jest.fn() };
        await handleLogin(event, loginForm, loginMessage, mockFetch);

        expect(loginMessage.textContent).toBe('Network error. Please try again.');
        expect(loginMessage.style.color).toBe('red');
    });
});
