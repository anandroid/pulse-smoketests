import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import logger from '../utils/logger';

export interface SearchRequest {
  query: string;
  area?: string;
  region?: string;
  country?: string;
  timeline?: string;
  category?: string;
  enableFallbacks?: boolean;
  maxFallbacks?: number;
  deviceId?: string;
  buttonClickCount?: string;
}

export interface SearchResponse {
  success: boolean;
  data: any[];
  source: string;
  strategy: string;
  originalStrategy?: string;
  fallbackUsed?: string;
  fallbackChain?: string[];
  timing?: {
    primary_ms?: number;
    fallback_ms?: number;
    total_ms: number;
  };
  meta?: {
    cache_hit?: boolean;
    original_count?: number;
    flyer_count?: number;
    total_items?: number;
    session_filtered?: boolean;
  };
  timestamp: string;
  error?: string;
}

class PulseAPIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.PULSE_API_BASE_URL,
      timeout: config.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Making API request', {
          url: config.url,
          method: config.method,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('API response received', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('API error', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  async searchWithStrategy(
    strategy: string,
    request: SearchRequest
  ): Promise<SearchResponse> {
    try {
      const startTime = Date.now();
      logger.info(`Calling ${strategy} API`, { request });

      const response = await this.client.post<SearchResponse>(
        `/api/search/${strategy}`,
        request
      );

      const duration = Date.now() - startTime;
      logger.info(`${strategy} API completed`, {
        duration,
        success: response.data.success,
        itemCount: response.data.data?.length || 0,
        source: response.data.source,
      });

      return response.data;
    } catch (error) {
      logger.error(`${strategy} API failed`, error);
      
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          data: [],
          source: strategy,
          strategy: strategy,
          timestamp: new Date().toISOString(),
          error: error.response?.data?.error || error.message,
          timing: {
            total_ms: Date.now() - Date.now(),
          },
        };
      }
      
      throw error;
    }
  }

  async testRagVector(request: SearchRequest): Promise<SearchResponse> {
    return this.searchWithStrategy('rag_vector', request);
  }

  async testQueryCache(request: SearchRequest): Promise<SearchResponse> {
    return this.searchWithStrategy('query_cache', request);
  }

  async testRagCache(request: SearchRequest): Promise<SearchResponse> {
    return this.searchWithStrategy('rag_cache', request);
  }

  async testRagHybrid(request: SearchRequest): Promise<SearchResponse> {
    return this.searchWithStrategy('rag_hybrid', request);
  }

  async testWebSearchLLM(request: SearchRequest): Promise<SearchResponse> {
    return this.searchWithStrategy('web_search_llm', request);
  }

  async testCombined(request: SearchRequest): Promise<SearchResponse> {
    return this.searchWithStrategy('combined', request);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      logger.error('Health check failed', error);
      return false;
    }
  }
}

export const pulseAPIService = new PulseAPIService();