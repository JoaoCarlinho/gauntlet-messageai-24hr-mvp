/**
 * Content Library Hook
 *
 * Manages generated content from AI agents
 * Supports filtering by type, platform, product, and campaign
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export type ContentType = 'ad_copy' | 'social_post' | 'landing_page' | 'image_prompt';
export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'x' | 'google';

export interface ContentItem {
  id: string;
  type: ContentType;
  content: string;
  platform?: Platform;
  productId?: string;
  campaignId?: string;
  metadata?: {
    variations?: number;
    tone?: string;
    length?: string;
    cta?: string;
    headline?: string;
    body?: string;
    [key: string]: any;
  };
  generatedBy: 'ai';
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentFilters {
  type?: ContentType;
  platform?: Platform;
  productId?: string;
  campaignId?: string;
}

export default function useContentLibrary() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ContentFilters>({});

  // Fetch all content
  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get<ContentItem[]>(`${API_BASE_URL}/api/v1/content-library`);
      const items = response.data.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));
      setContent(items);
      setFilteredContent(items);
    } catch (err: any) {
      setError(err);
      console.error('Failed to fetch content library:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply filters
  const applyFilters = useCallback(
    (newFilters: ContentFilters) => {
      setFilters(newFilters);

      let filtered = [...content];

      if (newFilters.type) {
        filtered = filtered.filter((item) => item.type === newFilters.type);
      }

      if (newFilters.platform) {
        filtered = filtered.filter((item) => item.platform === newFilters.platform);
      }

      if (newFilters.productId) {
        filtered = filtered.filter((item) => item.productId === newFilters.productId);
      }

      if (newFilters.campaignId) {
        filtered = filtered.filter((item) => item.campaignId === newFilters.campaignId);
      }

      setFilteredContent(filtered);
    },
    [content]
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setFilteredContent(content);
  }, [content]);

  // Get content by ID
  const getContentById = useCallback(
    (id: string): ContentItem | undefined => {
      return content.find((item) => item.id === id);
    },
    [content]
  );

  // Delete content
  const deleteContent = useCallback(
    async (id: string): Promise<void> => {
      try {
        await axios.delete(`${API_BASE_URL}/api/v1/content-library/${id}`);
        setContent((prev) => prev.filter((item) => item.id !== id));
        setFilteredContent((prev) => prev.filter((item) => item.id !== id));
      } catch (err: any) {
        throw new Error(err.response?.data?.message || 'Failed to delete content');
      }
    },
    []
  );

  // Refresh content
  const refetch = useCallback(async () => {
    await fetchContent();
  }, [fetchContent]);

  // Initial fetch
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Re-apply filters when content changes
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      applyFilters(filters);
    }
  }, [content, filters, applyFilters]);

  return {
    content: filteredContent,
    allContent: content,
    isLoading,
    error,
    filters,
    applyFilters,
    clearFilters,
    getContentById,
    deleteContent,
    refetch,
  };
}
