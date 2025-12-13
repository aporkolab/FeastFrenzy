const { Op } = require('sequelize');
const {
  parseSort,
  parseFilters,
  paginatedResponse,
  buildQueryOptions,
} = require('../../utils/queryHelpers');

describe('Query Helpers', () => {
  describe('parseSort', () => {
    const allowedFields = ['name', 'price', 'date'];

    it('should return default order when no sortParam provided', () => {
      expect(parseSort(null, allowedFields)).toEqual([['id', 'ASC']]);
      expect(parseSort(undefined, allowedFields)).toEqual([['id', 'ASC']]);
      expect(parseSort('', allowedFields)).toEqual([['id', 'ASC']]);
    });

    it('should return custom default order when provided', () => {
      const customDefault = [['date', 'DESC']];
      expect(parseSort(null, allowedFields, customDefault)).toEqual(
        customDefault
      );
    });

    it('should parse single ascending field', () => {
      expect(parseSort('name', allowedFields)).toEqual([['name', 'ASC']]);
    });

    it('should parse single descending field (with minus prefix)', () => {
      expect(parseSort('-price', allowedFields)).toEqual([['price', 'DESC']]);
    });

    it('should parse multiple sort fields', () => {
      expect(parseSort('-price,name', allowedFields)).toEqual([
        ['price', 'DESC'],
        ['name', 'ASC'],
      ]);
    });

    it('should throw error for invalid sort field', () => {
      expect(() => parseSort('invalidField', allowedFields)).toThrow(
        /Invalid sort field/
      );
    });

    it('should throw error even when one field is invalid in multiple', () => {
      expect(() => parseSort('name,invalid', allowedFields)).toThrow(
        /Invalid sort field/
      );
    });

    it('should handle fields with extra whitespace', () => {
      expect(parseSort(' name ', allowedFields)).toEqual([['name', 'ASC']]);
    });

    it('should ignore empty entries in comma-separated list', () => {
      expect(parseSort('name,,price', allowedFields)).toEqual([
        ['name', 'ASC'],
        ['price', 'ASC'],
      ]);
    });
  });

  describe('parseFilters', () => {
    const filterConfig = {
      name: { operator: 'LIKE', transform: v => `%${v}%` },
      minPrice: { field: 'price', operator: '>=', type: 'number' },
      maxPrice: { field: 'price', operator: '<=', type: 'number' },
      closed: { operator: '=', type: 'boolean' },
      employeeId: { operator: '=', type: 'integer' },
      startDate: { field: 'date', operator: '>=', type: 'date' },
    };

    it('should return empty object when no filters match', () => {
      expect(parseFilters({}, filterConfig)).toEqual({});
      expect(parseFilters({ foo: 'bar' }, filterConfig)).toEqual({});
    });

    it('should parse LIKE filter with transform', () => {
      const result = parseFilters({ name: 'pizza' }, filterConfig);
      expect(result).toEqual({
        name: { [Op.like]: '%pizza%' },
      });
    });

    it('should parse number filter', () => {
      const result = parseFilters({ minPrice: '10' }, filterConfig);
      expect(result).toEqual({
        price: { [Op.gte]: 10 },
      });
    });

    it('should parse multiple filters on same field', () => {
      const result = parseFilters(
        { minPrice: '10', maxPrice: '100' },
        filterConfig
      );
      expect(result).toEqual({
        price: { [Op.gte]: 10, [Op.lte]: 100 },
      });
    });

    it('should parse boolean filter (true)', () => {
      expect(parseFilters({ closed: 'true' }, filterConfig)).toEqual({
        closed: { [Op.eq]: true },
      });
      expect(parseFilters({ closed: '1' }, filterConfig)).toEqual({
        closed: { [Op.eq]: true },
      });
    });

    it('should parse boolean filter (false)', () => {
      expect(parseFilters({ closed: 'false' }, filterConfig)).toEqual({
        closed: { [Op.eq]: false },
      });
      expect(parseFilters({ closed: '0' }, filterConfig)).toEqual({
        closed: { [Op.eq]: false },
      });
    });

    it('should parse integer filter', () => {
      const result = parseFilters({ employeeId: '5' }, filterConfig);
      expect(result).toEqual({
        employeeId: { [Op.eq]: 5 },
      });
    });

    it('should parse date filter', () => {
      const result = parseFilters({ startDate: '2024-01-01' }, filterConfig);
      expect(result.date[Op.gte]).toBeInstanceOf(Date);
    });

    it('should skip invalid number values', () => {
      const result = parseFilters({ minPrice: 'not-a-number' }, filterConfig);
      expect(result).toEqual({});
    });

    it('should skip invalid date values', () => {
      const result = parseFilters({ startDate: 'not-a-date' }, filterConfig);
      expect(result).toEqual({});
    });

    it('should skip empty values', () => {
      expect(parseFilters({ name: '' }, filterConfig)).toEqual({});
      expect(parseFilters({ name: null }, filterConfig)).toEqual({});
    });

    it('should handle multiple different filters', () => {
      const result = parseFilters(
        { name: 'test', minPrice: '5', closed: 'true' },
        filterConfig
      );
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('price');
      expect(result).toHaveProperty('closed');
    });
  });

  describe('paginatedResponse', () => {
    it('should build correct paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, skip: 0 };
      const result = paginatedResponse(data, 25, pagination);

      expect(result).toEqual({
        data,
        meta: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: false,
        },
      });
    });

    it('should indicate no next page on last page', () => {
      const data = [{ id: 1 }];
      const pagination = { page: 3, limit: 10, skip: 20 };
      const result = paginatedResponse(data, 25, pagination);

      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(true);
    });

    it('should handle single page', () => {
      const data = [{ id: 1 }];
      const pagination = { page: 1, limit: 10, skip: 0 };
      const result = paginatedResponse(data, 5, pagination);

      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should handle empty results', () => {
      const pagination = { page: 1, limit: 10, skip: 0 };
      const result = paginatedResponse([], 0, pagination);

      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });

  describe('buildQueryOptions', () => {
    it('should build basic query options', () => {
      const pagination = { page: 1, limit: 10, skip: 0 };
      const result = buildQueryOptions({ pagination });

      expect(result).toEqual({
        where: {},
        order: [],
        limit: 10,
        offset: 0,
      });
    });

    it('should include where clause', () => {
      const pagination = { page: 1, limit: 10, skip: 0 };
      const where = { name: 'test' };
      const result = buildQueryOptions({ pagination, where });

      expect(result.where).toEqual(where);
    });

    it('should include order', () => {
      const pagination = { page: 1, limit: 10, skip: 0 };
      const order = [['name', 'ASC']];
      const result = buildQueryOptions({ pagination, order });

      expect(result.order).toEqual(order);
    });

    it('should include includes when provided', () => {
      const pagination = { page: 1, limit: 10, skip: 0 };
      const include = [{ model: 'Employee' }];
      const result = buildQueryOptions({ pagination, include });

      expect(result.include).toEqual(include);
    });

    it('should not include empty includes', () => {
      const pagination = { page: 1, limit: 10, skip: 0 };
      const result = buildQueryOptions({ pagination, include: [] });

      expect(result).not.toHaveProperty('include');
    });

    it('should include attributes when provided', () => {
      const pagination = { page: 1, limit: 10, skip: 0 };
      const attributes = ['id', 'name'];
      const result = buildQueryOptions({ pagination, attributes });

      expect(result.attributes).toEqual(attributes);
    });

    it('should calculate offset from pagination', () => {
      const pagination = { page: 3, limit: 10, skip: 20 };
      const result = buildQueryOptions({ pagination });

      expect(result.offset).toBe(20);
      expect(result.limit).toBe(10);
    });
  });
});
