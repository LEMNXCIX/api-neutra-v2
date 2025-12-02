// Mock for swagger-jsdoc
export default jest.fn(() => {
    return {
        openapi: '3.0.0',
        info: { title: 'Mock API', version: '1.0.0' },
        paths: {},
    };
});
