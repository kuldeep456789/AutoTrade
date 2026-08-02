import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { SearchIndexService } from './search-index.service';
import { SearchRepository } from './search.repository';
import { tokenizeText, generatePrefixes } from './utils/tokenizer';

describe('Search Engine Unit Tests', () => {
  let searchService: SearchService;
  let searchIndexService: SearchIndexService;
  let searchRepository: SearchRepository;

  const mockIndexService = {
    getTokenPids: jest.fn(),
    getPrefixPids: jest.fn(),
  };

  const mockRepository = {
    findProductsByPids: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: SearchIndexService, useValue: mockIndexService },
        { provide: SearchRepository, useValue: mockRepository },
      ],
    }).compile();

    searchService = module.get<SearchService>(SearchService);
    searchIndexService = module.get<SearchIndexService>(SearchIndexService);
    searchRepository = module.get<SearchRepository>(SearchRepository);

    jest.clearAllMocks();
  });

  describe('Tokenizer Utils', () => {
    it('should tokenize text correctly', () => {
      const tokens = tokenizeText('Black Cotton Oversized T-Shirt');
      expect(tokens).toEqual(['black', 'cotton', 'oversized', 't', 'shirt']);
    });

    it('should generate prefixes for partial matching', () => {
      const prefixes = generatePrefixes('oversized');
      expect(prefixes).toContain('ov');
      expect(prefixes).toContain('over');
      expect(prefixes).toContain('overs');
    });
  });

  describe('Search Engine Execution', () => {
    it('should return empty results for an empty query', async () => {
      const res = await searchService.search({ q: '   ' });
      expect(res.success).toBe(true);
      expect(res.products).toEqual([]);
      expect(res.total).toBe(0);
    });

    it('should perform inverted index lookup and rank results correctly', async () => {
      mockIndexService.getTokenPids.mockResolvedValue(['PID1', 'PID2']);
      mockIndexService.getPrefixPids.mockResolvedValue(['PID1']);
      mockRepository.findProductsByPids.mockResolvedValue([
        { pid: 'PID1', productName: 'Black Cotton Oversized Shirt', price: 29.99 },
        { pid: 'PID2', productName: 'White Basic Tee', price: 15.00 },
      ]);

      const res = await searchService.search({ q: 'black shirt' });

      expect(res.success).toBe(true);
      expect(res.products.length).toBeGreaterThan(0);
      expect(res.products[0].pid).toBe('PID1');
      expect(res.source).toBe('inverted_index');
      expect(res.searchTimeMs).toBeDefined();
    });
  });
});
