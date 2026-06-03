export const db = {
  runSync: jest.fn(),
  getFirstSync: jest.fn(() => null),
  getAllSync: jest.fn(() => []),
}
