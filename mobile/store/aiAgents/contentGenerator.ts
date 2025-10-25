/**
 * Content Generator AI Agent Store (Kea)
 *
 * State management for Content Generator AI agent
 * Handles ad copy, social posts, landing pages, and image prompt generation
 */

import { kea } from 'kea';
import { contentGeneratorAPI } from '../../lib/aiAgentsAPI';
import {
  AdCopyResult,
  SocialPostsResult,
  LandingPageResult,
  ImagePromptsResult,
  RegeneratedContent,
  Platform,
  GenerateAdCopyRequest,
  GenerateSocialPostsRequest,
  GenerateLandingPageRequest,
  GenerateImagePromptsRequest,
  RegenerateContentRequest,
} from '../../types/aiAgents';

// State interface
interface ContentGeneratorState {
  generatedContent: Record<string, any>;
  isGenerating: boolean;
  selectedPlatform: Platform | null;
  savedContentIds: string[];
  error: string | null;
}

// Actions interface
interface ContentGeneratorActions {
  // Content generation
  generateAdCopy: (request: GenerateAdCopyRequest) => void;
  generateSocialPosts: (request: GenerateSocialPostsRequest) => void;
  generateLandingPage: (request: GenerateLandingPageRequest) => void;
  generateImagePrompts: (request: GenerateImagePromptsRequest) => void;
  regenerateContent: (request: RegenerateContentRequest) => void;

  // State management
  setGeneratedContent: (contentType: string, content: any) => void;
  setGenerating: (isGenerating: boolean) => void;
  setSelectedPlatform: (platform: Platform | null) => void;
  addSavedContentId: (contentId: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearGeneratedContent: () => void;
}

// Content Generator logic
export const contentGeneratorLogic = kea<any>({
  path: ['aiAgents', 'contentGenerator'],

  defaults: {
    generatedContent: {},
    isGenerating: false,
    selectedPlatform: null,
    savedContentIds: [],
    error: null,
  },

  actions: {
    // Content generation
    generateAdCopy: (request: GenerateAdCopyRequest) => ({ request }),
    generateSocialPosts: (request: GenerateSocialPostsRequest) => ({ request }),
    generateLandingPage: (request: GenerateLandingPageRequest) => ({ request }),
    generateImagePrompts: (request: GenerateImagePromptsRequest) => ({ request }),
    regenerateContent: (request: RegenerateContentRequest) => ({ request }),

    // State management
    setGeneratedContent: (contentType: string, content: any) => ({ contentType, content }),
    setGenerating: (isGenerating: boolean) => ({ isGenerating }),
    setSelectedPlatform: (platform: Platform | null) => ({ platform }),
    addSavedContentId: (contentId: string) => ({ contentId }),
    setError: (error: string | null) => ({ error }),
    clearError: true,
    clearGeneratedContent: true,
  },

  reducers: {
    generatedContent: {
      setGeneratedContent: (state, { contentType, content }) => ({
        ...state,
        [contentType]: content,
      }),
      clearGeneratedContent: () => ({}),
    },

    isGenerating: {
      setGenerating: (_, { isGenerating }) => isGenerating,
      generateAdCopy: () => true,
      generateSocialPosts: () => true,
      generateLandingPage: () => true,
      generateImagePrompts: () => true,
      regenerateContent: () => true,
    },

    selectedPlatform: {
      setSelectedPlatform: (_, { platform }) => platform,
      clearGeneratedContent: () => null,
    },

    savedContentIds: {
      addSavedContentId: (state, { contentId }) => [...state, contentId],
      clearGeneratedContent: () => [],
    },

    error: {
      setError: (_, { error }) => error,
      clearError: () => null,
      generateAdCopy: () => null,
      generateSocialPosts: () => null,
      generateLandingPage: () => null,
      generateImagePrompts: () => null,
      regenerateContent: () => null,
    },
  },

  listeners: ({ actions }: any) => ({
    // Generate ad copy listener
    generateAdCopy: async ({ request }: any) => {
      try {
        const result: AdCopyResult = await contentGeneratorAPI.generateAdCopy(request);

        actions.setGeneratedContent('ad_copy', result);
        actions.setSelectedPlatform(request.platform);

        if (result.savedContentId) {
          actions.addSavedContentId(result.savedContentId);
        }

        actions.setGenerating(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error generating ad copy:', error);
        actions.setError(error.message || 'Failed to generate ad copy');
        actions.setGenerating(false);
      }
    },

    // Generate social posts listener
    generateSocialPosts: async ({ request }: any) => {
      try {
        const result: SocialPostsResult = await contentGeneratorAPI.generateSocialPosts(request);

        actions.setGeneratedContent('social_posts', result);
        actions.setSelectedPlatform(request.platform);

        if (result.savedContentId) {
          actions.addSavedContentId(result.savedContentId);
        }

        actions.setGenerating(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error generating social posts:', error);
        actions.setError(error.message || 'Failed to generate social posts');
        actions.setGenerating(false);
      }
    },

    // Generate landing page listener
    generateLandingPage: async ({ request }: any) => {
      try {
        const result: LandingPageResult = await contentGeneratorAPI.generateLandingPage(request);

        actions.setGeneratedContent('landing_page', result);

        if (result.savedContentId) {
          actions.addSavedContentId(result.savedContentId);
        }

        actions.setGenerating(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error generating landing page:', error);
        actions.setError(error.message || 'Failed to generate landing page');
        actions.setGenerating(false);
      }
    },

    // Generate image prompts listener
    generateImagePrompts: async ({ request }: any) => {
      try {
        const result: ImagePromptsResult = await contentGeneratorAPI.generateImagePrompts(request);

        actions.setGeneratedContent('image_prompts', result);

        if (result.savedContentId) {
          actions.addSavedContentId(result.savedContentId);
        }

        actions.setGenerating(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error generating image prompts:', error);
        actions.setError(error.message || 'Failed to generate image prompts');
        actions.setGenerating(false);
      }
    },

    // Regenerate content listener
    regenerateContent: async ({ request }: any) => {
      try {
        const result: RegeneratedContent = await contentGeneratorAPI.regenerateContent(request);

        // Store regenerated content under 'regenerated' key
        actions.setGeneratedContent('regenerated', result);

        if (result.savedContentId) {
          actions.addSavedContentId(result.savedContentId);
        }

        actions.setGenerating(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error regenerating content:', error);
        actions.setError(error.message || 'Failed to regenerate content');
        actions.setGenerating(false);
      }
    },
  }),

  selectors: {
    // Get content by type
    getContentByType: [
      (s) => [s.generatedContent],
      (generatedContent) => (contentType: string) => {
        return generatedContent[contentType] || null;
      },
    ],

    // Check if any content has been generated
    hasGeneratedContent: [
      (s) => [s.generatedContent],
      (generatedContent) => {
        return Object.keys(generatedContent).length > 0;
      },
    ],

    // Get saved content IDs
    getSavedContentIds: [
      (s) => [s.savedContentIds],
      (savedContentIds) => savedContentIds,
    ],

    // Get ad copy
    getAdCopy: [
      (s) => [s.generatedContent],
      (generatedContent) => {
        return generatedContent['ad_copy'] as AdCopyResult | null;
      },
    ],

    // Get social posts
    getSocialPosts: [
      (s) => [s.generatedContent],
      (generatedContent) => {
        return generatedContent['social_posts'] as SocialPostsResult | null;
      },
    ],

    // Get landing page
    getLandingPage: [
      (s) => [s.generatedContent],
      (generatedContent) => {
        return generatedContent['landing_page'] as LandingPageResult | null;
      },
    ],

    // Get image prompts
    getImagePrompts: [
      (s) => [s.generatedContent],
      (generatedContent) => {
        return generatedContent['image_prompts'] as ImagePromptsResult | null;
      },
    ],

    // Get regenerated content
    getRegeneratedContent: [
      (s) => [s.generatedContent],
      (generatedContent) => {
        return generatedContent['regenerated'] as RegeneratedContent | null;
      },
    ],
  },
});

export default contentGeneratorLogic;
