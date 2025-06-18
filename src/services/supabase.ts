import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import logger from '../utils/logger';

export interface QueryCacheEntry {
  id: string;
  prompt: string;
  area: string;
  region: string | null;
  country: string | null;
  timeline: string | null;
  button_click_count: string | null;
  response: any;
  model: string;
  provider: string;
  timestamp: string;
  created_at: string;
  expire_at: string;
}

class SupabaseService {
  private client;

  constructor() {
    this.client = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async getRecentCacheEntry(options?: {
    area?: string;
    region?: string;
    country?: string;
    timeline?: string;
    buttonClickCount?: string;
  }): Promise<QueryCacheEntry | null> {
    try {
      logger.info('Fetching recent cache entry from Supabase', options);
      
      let query = this.client
        .from('query_cache')
        .select('*')
        .gte('expire_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (options?.area) {
        query = query.eq('area', options.area);
      }
      if (options?.region) {
        query = query.eq('region', options.region);
      }
      if (options?.country) {
        query = query.eq('country', options.country);
      }
      if (options?.timeline) {
        query = query.eq('timeline', options.timeline);
      }
      if (options?.buttonClickCount) {
        query = query.eq('button_click_count', options.buttonClickCount);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        logger.error('Error fetching cache entry:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        logger.warn('No cache entries found');
        return null;
      }

      logger.info('Successfully retrieved cache entry', {
        id: data[0].id,
        prompt: data[0].prompt,
        area: data[0].area
      });

      return data[0] as QueryCacheEntry;
    } catch (error) {
      logger.error('Failed to fetch cache entry:', error);
      throw error;
    }
  }

  async getSpecificCacheEntry(id: string): Promise<QueryCacheEntry | null> {
    try {
      logger.info('Fetching specific cache entry', { id });
      
      const { data, error } = await this.client
        .from('query_cache')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          logger.warn('Cache entry not found', { id });
          return null;
        }
        logger.error('Error fetching cache entry:', error);
        throw error;
      }

      logger.info('Successfully retrieved cache entry', {
        id: data.id,
        prompt: data.prompt
      });

      return data as QueryCacheEntry;
    } catch (error) {
      logger.error('Failed to fetch specific cache entry:', error);
      throw error;
    }
  }

  async getCacheEntriesByPrompt(prompt: string, limit = 5): Promise<QueryCacheEntry[]> {
    try {
      logger.info('Fetching cache entries by prompt', { prompt, limit });
      
      const { data, error } = await this.client
        .from('query_cache')
        .select('*')
        .ilike('prompt', `%${prompt}%`)
        .gte('expire_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching cache entries:', error);
        throw error;
      }

      logger.info(`Found ${data?.length || 0} cache entries`);
      return (data || []) as QueryCacheEntry[];
    } catch (error) {
      logger.error('Failed to fetch cache entries by prompt:', error);
      throw error;
    }
  }
}

export const supabaseService = new SupabaseService();