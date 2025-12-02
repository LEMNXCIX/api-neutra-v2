// Mock for @scalar/express-api-reference
export const apiReference = jest.fn(() => {
    return (req: any, res: any, next: any) => next();
});
