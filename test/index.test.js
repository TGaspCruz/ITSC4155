const testJest = require('./index')

test('testing jest is working', () => {
    const test = "test"
    expect(testJest(test)).toBe("test")
})