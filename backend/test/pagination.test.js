const { paginate } = require('../../middleware/pagination');

describe('Pagination Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { query: {} };
    res = {};
    next = jest.fn();
  });

  describe('paginate()', () => {
    it('should set default pagination values', () => {
      const middleware = paginate();
      middleware(req, res, next);

      expect(req.pagination).toEqual({
        page: 1,
        limit: 20,
        skip: 0,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should parse page from query', () => {
      req.query.page = '3';
      const middleware = paginate();
      middleware(req, res, next);

      expect(req.pagination.page).toBe(3);
      expect(req.pagination.skip).toBe(40);
    });

    it('should parse limit from query', () => {
      req.query.limit = '50';
      const middleware = paginate();
      middleware(req, res, next);

      expect(req.pagination.limit).toBe(50);
    });

    it('should enforce minimum page of 1', () => {
      req.query.page = '0';
      const middleware = paginate();
      middleware(req, res, next);

      expect(req.pagination.page).toBe(1);
    });

    it('should enforce minimum page of 1 for negative values', () => {
      req.query.page = '-5';
      const middleware = paginate();
      middleware(req, res, next);

      expect(req.pagination.page).toBe(1);
    });

    it('should enforce minimum limit of 1', () => {
      req.query.limit = '0';
      const middleware = paginate();
      middleware(req, res, next);

      expect(req.pagination.limit).toBe(1);
    });

    it('should enforce maximum limit (default 100)', () => {
      req.query.limit = '500';
      const middleware = paginate();
      middleware(req, res, next);

      expect(req.pagination.limit).toBe(100);
    });

    it('should use custom default limit', () => {
      const middleware = paginate(10);
      middleware(req, res, next);

      expect(req.pagination.limit).toBe(10);
    });

    it('should use custom max limit', () => {
      req.query.limit = '100';
      const middleware = paginate(20, 50);
      middleware(req, res, next);

      expect(req.pagination.limit).toBe(50);
    });

    it('should calculate correct skip for different pages', () => {
      const testCases = [
        { page: 1, limit: 10, expectedSkip: 0 },
        { page: 2, limit: 10, expectedSkip: 10 },
        { page: 5, limit: 20, expectedSkip: 80 },
        { page: 10, limit: 5, expectedSkip: 45 },
      ];

      testCases.forEach(({ page, limit, expectedSkip }) => {
        req.query.page = String(page);
        req.query.limit = String(limit);
        const middleware = paginate();
        middleware(req, res, next);

        expect(req.pagination.skip).toBe(expectedSkip);
      });
    });

    it('should handle non-numeric page gracefully', () => {
      req.query.page = 'abc';
      const middleware = paginate();
      middleware(req, res, next);

      expect(req.pagination.page).toBe(1);
    });

    it('should handle non-numeric limit gracefully', () => {
      req.query.limit = 'xyz';
      const middleware = paginate();
      middleware(req, res, next);

      expect(req.pagination.limit).toBe(20);
    });

    it('should handle floating point values', () => {
      req.query.page = '2.7';
      req.query.limit = '15.9';
      const middleware = paginate();
      middleware(req, res, next);

      expect(req.pagination.page).toBe(2);
      expect(req.pagination.limit).toBe(15);
    });

    it('should always call next()', () => {
      const middleware = paginate();
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
