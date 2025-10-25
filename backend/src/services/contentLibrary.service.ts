import prisma from '../config/database';
import { ContentLibrary, Prisma } from '@prisma/client';

/**
 * Content Library Service
 *
 * Manages generated marketing content including:
 * - Ad copy
 * - Social media posts
 * - Landing page sections
 * - Image prompts
 * - Email/SMS content
 */

export interface SaveContentData {
  teamId: string;
  productId?: string;
  campaignId?: string;
  contentType: 'ad_copy' | 'social_post' | 'landing_page' | 'image_prompt' | 'email' | 'sms';
  platform?: string;
  title: string;
  content: any;
  metadata?: any;
  status?: 'draft' | 'approved' | 'published' | 'archived';
  tags?: string[];
}

export interface UpdateContentData {
  title?: string;
  content?: any;
  metadata?: any;
  status?: 'draft' | 'approved' | 'published' | 'archived';
  tags?: string[];
}

export interface ListContentFilters {
  teamId: string;
  productId?: string;
  campaignId?: string;
  contentType?: string;
  platform?: string;
  status?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Save new content to the library
 *
 * @param data - Content data to save
 * @returns Saved content record
 */
export async function saveContent(data: SaveContentData): Promise<ContentLibrary> {
  try {
    console.log(`💾 Saving ${data.contentType} content to library`);

    const content = await prisma.contentLibrary.create({
      data: {
        teamId: data.teamId,
        productId: data.productId,
        campaignId: data.campaignId,
        contentType: data.contentType,
        platform: data.platform,
        title: data.title,
        content: data.content,
        metadata: data.metadata || {},
        status: data.status || 'draft',
        tags: data.tags || [],
      },
    });

    console.log(`✅ Content saved successfully: ${content.id}`);

    return content;
  } catch (error) {
    console.error('Error saving content:', error);
    throw new Error('Failed to save content to library');
  }
}

/**
 * List content with filters
 *
 * @param filters - Filter criteria
 * @returns Array of content records
 */
export async function listContent(filters: ListContentFilters): Promise<{
  content: ContentLibrary[];
  total: number;
  limit: number;
  offset: number;
}> {
  try {
    console.log(`📋 Listing content for team ${filters.teamId}`);

    // Build where clause
    const where: Prisma.ContentLibraryWhereInput = {
      teamId: filters.teamId,
    };

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }

    if (filters.contentType) {
      where.contentType = filters.contentType;
    }

    if (filters.platform) {
      where.platform = filters.platform;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters.search) {
      where.OR = [
        {
          title: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Get total count
    const total = await prisma.contentLibrary.count({ where });

    // Get paginated content
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const content = await prisma.contentLibrary.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    console.log(`✅ Found ${content.length} content items (total: ${total})`);

    return {
      content,
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error('Error listing content:', error);
    throw new Error('Failed to list content');
  }
}

/**
 * Get a specific content item by ID
 *
 * @param contentId - Content ID
 * @param teamId - Team ID (for authorization)
 * @returns Content record or null
 */
export async function getContent(
  contentId: string,
  teamId: string
): Promise<ContentLibrary | null> {
  try {
    console.log(`📖 Getting content ${contentId}`);

    const content = await prisma.contentLibrary.findFirst({
      where: {
        id: contentId,
        teamId,
      },
    });

    if (!content) {
      console.log(`⚠️  Content not found or access denied`);
      return null;
    }

    console.log(`✅ Content retrieved successfully`);

    return content;
  } catch (error) {
    console.error('Error getting content:', error);
    throw new Error('Failed to get content');
  }
}

/**
 * Update content
 *
 * @param contentId - Content ID
 * @param teamId - Team ID (for authorization)
 * @param data - Update data
 * @returns Updated content record
 */
export async function updateContent(
  contentId: string,
  teamId: string,
  data: UpdateContentData
): Promise<ContentLibrary> {
  try {
    console.log(`✏️  Updating content ${contentId}`);

    // Verify content exists and belongs to team
    const existing = await getContent(contentId, teamId);

    if (!existing) {
      throw new Error('Content not found or access denied');
    }

    // Build update data
    const updateData: Prisma.ContentLibraryUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.content !== undefined) {
      updateData.content = data.content;
    }

    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }

    // Update content
    const updated = await prisma.contentLibrary.update({
      where: {
        id: contentId,
      },
      data: updateData,
    });

    console.log(`✅ Content updated successfully`);

    return updated;
  } catch (error) {
    console.error('Error updating content:', error);
    throw new Error('Failed to update content');
  }
}

/**
 * Delete content
 *
 * @param contentId - Content ID
 * @param teamId - Team ID (for authorization)
 * @returns True if deleted successfully
 */
export async function deleteContent(
  contentId: string,
  teamId: string
): Promise<boolean> {
  try {
    console.log(`🗑️  Deleting content ${contentId}`);

    // Verify content exists and belongs to team
    const existing = await getContent(contentId, teamId);

    if (!existing) {
      throw new Error('Content not found or access denied');
    }

    // Delete content
    await prisma.contentLibrary.delete({
      where: {
        id: contentId,
      },
    });

    console.log(`✅ Content deleted successfully`);

    return true;
  } catch (error) {
    console.error('Error deleting content:', error);
    throw new Error('Failed to delete content');
  }
}

/**
 * Get content statistics for a team
 *
 * @param teamId - Team ID
 * @returns Content statistics
 */
export async function getContentStats(teamId: string): Promise<{
  total: number;
  byType: Record<string, number>;
  byPlatform: Record<string, number>;
  byStatus: Record<string, number>;
}> {
  try {
    console.log(`📊 Getting content stats for team ${teamId}`);

    const content = await prisma.contentLibrary.findMany({
      where: { teamId },
      select: {
        contentType: true,
        platform: true,
        status: true,
      },
    });

    const total = content.length;

    const byType: Record<string, number> = {};
    const byPlatform: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    content.forEach(item => {
      // Count by type
      byType[item.contentType] = (byType[item.contentType] || 0) + 1;

      // Count by platform
      if (item.platform) {
        byPlatform[item.platform] = (byPlatform[item.platform] || 0) + 1;
      }

      // Count by status
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    });

    console.log(`✅ Stats calculated: ${total} total items`);

    return {
      total,
      byType,
      byPlatform,
      byStatus,
    };
  } catch (error) {
    console.error('Error getting content stats:', error);
    throw new Error('Failed to get content statistics');
  }
}

/**
 * Duplicate content
 *
 * @param contentId - Content ID to duplicate
 * @param teamId - Team ID (for authorization)
 * @param newTitle - Optional new title
 * @returns Duplicated content record
 */
export async function duplicateContent(
  contentId: string,
  teamId: string,
  newTitle?: string
): Promise<ContentLibrary> {
  try {
    console.log(`📋 Duplicating content ${contentId}`);

    // Get existing content
    const existing = await getContent(contentId, teamId);

    if (!existing) {
      throw new Error('Content not found or access denied');
    }

    // Create duplicate
    const duplicate = await prisma.contentLibrary.create({
      data: {
        teamId: existing.teamId,
        productId: existing.productId || undefined,
        campaignId: existing.campaignId || undefined,
        contentType: existing.contentType,
        platform: existing.platform || undefined,
        title: newTitle || `${existing.title} (Copy)`,
        content: existing.content as any,
        metadata: existing.metadata as any,
        status: 'draft', // Always start as draft
        tags: existing.tags,
      },
    });

    console.log(`✅ Content duplicated successfully: ${duplicate.id}`);

    return duplicate;
  } catch (error) {
    console.error('Error duplicating content:', error);
    throw new Error('Failed to duplicate content');
  }
}

/**
 * Bulk update content status
 *
 * @param contentIds - Array of content IDs
 * @param teamId - Team ID (for authorization)
 * @param status - New status
 * @returns Number of updated records
 */
export async function bulkUpdateStatus(
  contentIds: string[],
  teamId: string,
  status: 'draft' | 'approved' | 'published' | 'archived'
): Promise<number> {
  try {
    console.log(`📦 Bulk updating ${contentIds.length} content items to ${status}`);

    const result = await prisma.contentLibrary.updateMany({
      where: {
        id: {
          in: contentIds,
        },
        teamId,
      },
      data: {
        status,
      },
    });

    console.log(`✅ Updated ${result.count} content items`);

    return result.count;
  } catch (error) {
    console.error('Error bulk updating content:', error);
    throw new Error('Failed to bulk update content');
  }
}

export default {
  saveContent,
  listContent,
  getContent,
  updateContent,
  deleteContent,
  getContentStats,
  duplicateContent,
  bulkUpdateStatus,
};
