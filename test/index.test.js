/**
 * @jest-environment jsdom
 */

const { handleLogin } = require('../public/index');

describe('Login Form Submission', () => {
    let loginForm, loginMessage;

    beforeEach(() => {
        // Mock DOM
        document.body.innerHTML = `
            <form id="loginForm">
                <input name="email" value="test@example.com" />
                <input name="password" value="123456" />
            </form>
            <div id="loginMessage"></div>
        `;

        loginForm = document.getElementById('loginForm');
        loginMessage = document.getElementById('loginMessage');
    });

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

    test('handles network error gracefully', async () => {
        const mockFetch = jest.fn(() => Promise.reject(new Error('Network failure')));

        const event = { preventDefault: jest.fn() };
        await handleLogin(event, loginForm, loginMessage, mockFetch);

        expect(loginMessage.textContent).toBe('Network error. Please try again.');
        expect(loginMessage.style.color).toBe('red');
    });
});
