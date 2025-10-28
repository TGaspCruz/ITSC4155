/**
 * @jest-environment jsdom
 */
const { handleSignup } = require('../public/signupPage');

describe('Signup Form Submission', () => {
    let signupForm, signupMessage;

    beforeEach(() => {
        // Mock DOM to test changes to messages and form calls
        document.body.innerHTML = `
            <form id="signupForm">
                <input name="username"/>
                <input name="email"/>
                <input name="password"/>
            </form>
            <p id="signupMessage"></p>
        `;

        signupForm = document.getElementById('signupForm');
        signupMessage = document.getElementById('signupMessage');
    });
    // Test for succussful registration
    test('shows success message and schedules redirect on successful registration', async () => {
        // Mock fetch response from server
        const mockFetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => ({ message: 'Registered', redirect: '/dashboard' }),
            })
        );
        // Make sure event.preventDefault doesnt stop test from running is called
        const event = { preventDefault: jest.fn() };
        await handleSignup(event, signupForm, signupMessage, mockFetch);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(mockFetch).toHaveBeenCalledWith('/register', expect.any(Object));
        expect(signupMessage.textContent).toBe('Registered');
        expect(signupMessage.style.color).toBe('green');
    });
    // Test for missing inputs
    test('shows invalid inputs to registering', async () => {
        // Mock fetch response from server
        const mockFetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                status: 400,
                json: () => ({ message: 'username, email and password are required'}),
            })
        );

        const event = { preventDefault: jest.fn() };
        await handleSignup(event, signupForm, signupMessage, mockFetch);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(signupMessage.textContent).toBe('username, email and password are required');
        expect(signupMessage.style.color).toBe('red');
    });
    // Test for server issue message changes
    test('shows network error when fetch throws', async () => {
        const mockFetch = jest.fn(() => Promise.reject(new Error('Network failure')));

        const event = { preventDefault: jest.fn() };
        await handleSignup(event, signupForm, signupMessage, mockFetch);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(signupMessage.textContent).toBe('Network error. Please try again.');
        expect(signupMessage.style.color).toBe('red');
    });
});
