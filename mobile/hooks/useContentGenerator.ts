/**
 * Content Generator AI Agent Hook
 *
 * Custom hook for Content Generator AI agent
 * Provides access to content generation state and actions through Kea logic
 */

import { useValues, useActions } from 'kea';
import { contentGeneratorLogic } from '../store/aiAgents/contentGenerator';
import {
  Platform,
  ContentType,
  AdCopyRequest,
  AdCopyResult,
  SocialPostRequest,
  SocialPostResult,
  LandingPageRequest,
  LandingPageResult,
  ImagePromptRequest,
  ImagePromptResult,
  RegenerateRequest,
} from '../types/aiAgents';

// Content Generator hook interface
interface UseContentGeneratorReturn {
  // State
  generatedContent: Record<ContentType, any>;
  isGenerating: boolean;
  error: string | null;
  selectedPlatform: Platform | null;
  savedContentIds: string[];
  adCopy: AdCopyResult | null;
  socialPost: SocialPostResult | null;
  landingPage: LandingPageResult | null;
  imagePrompt: ImagePromptResult | null;

  // Actions
  generateAdCopy: (request: AdCopyRequest) => void;
  generateSocialPost: (request: SocialPostRequest) => void;
  generateLandingPage: (request: LandingPageRequest) => void;
  generateImagePrompt: (request: ImagePromptRequest) => void;
  regenerateContent: (request: RegenerateRequest) => void;
  clearGeneratedContent: (contentType?: ContentType) => void;
  setSelectedPlatform: (platform: Platform) => void;
  clearError: () => void;
}

/**
 * Custom hook for Content Generator AI agent operations
 * Provides access to content generation for ads, social posts, landing pages, and image prompts
 */
export const useContentGenerator = (): UseContentGeneratorReturn => {
  // Get values from Kea store
  const {
    generatedContent,
    isGenerating,
    error,
    selectedPlatform,
    savedContentIds,
  } = useValues(contentGeneratorLogic);

  // Get selectors
  const {
    getAdCopy,
    getSocialPost,
    getLandingPage,
    getImagePrompt,
  } = useValues(contentGeneratorLogic);

  // Get actions from Kea store
  const {
    generateAdCopy: generateAdCopyAction,
    generateSocialPost: generateSocialPostAction,
    generateLandingPage: generateLandingPageAction,
    generateImagePrompt: generateImagePromptAction,
    regenerateContent: regenerateContentAction,
    clearGeneratedContent: clearGeneratedContentAction,
    setSelectedPlatform: setSelectedPlatformAction,
    setError,
  } = useActions(contentGeneratorLogic);

  // Wrapper functions with additional functionality
  const generateAdCopy = (request: AdCopyRequest) => {
    // Validate inputs
    if (!request.campaignId || !request.platform) {
      setError('Campaign ID and platform are required for ad copy generation');
      return;
    }

    // Clear any existing errors
    setError(null);
    generateAdCopyAction(request);
  };

  const generateSocialPost = (request: SocialPostRequest) => {
    // Validate inputs
    if (!request.campaignId || !request.platform) {
      setError('Campaign ID and platform are required for social post generation');
      return;
    }

    // Clear any existing errors
    setError(null);
    generateSocialPostAction(request);
  };

  const generateLandingPage = (request: LandingPageRequest) => {
    // Validate inputs
    if (!request.campaignId) {
      setError('Campaign ID is required for landing page generation');
      return;
    }

    // Clear any existing errors
    setError(null);
    generateLandingPageAction(request);
  };

  const generateImagePrompt = (request: ImagePromptRequest) => {
    // Validate inputs
    if (!request.campaignId || !request.platform) {
      setError('Campaign ID and platform are required for image prompt generation');
      return;
    }

    // Clear any existing errors
    setError(null);
    generateImagePromptAction(request);
  };

  const regenerateContent = (request: RegenerateRequest) => {
    // Validate inputs
    if (!request.contentId || !request.contentType) {
      setError('Content ID and content type are required for regeneration');
      return;
    }

    // Clear any existing errors
    setError(null);
    regenerateContentAction(request);
  };

  const clearGeneratedContent = (contentType?: ContentType) => {
    clearGeneratedContentAction(contentType);
  };

  const setSelectedPlatform = (platform: Platform) => {
    setSelectedPlatformAction(platform);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    // State
    generatedContent,
    isGenerating,
    error,
    selectedPlatform,
    savedContentIds,
    adCopy: getAdCopy,
    socialPost: getSocialPost,
    landingPage: getLandingPage,
    imagePrompt: getImagePrompt,

    // Actions
    generateAdCopy,
    generateSocialPost,
    generateLandingPage,
    generateImagePrompt,
    regenerateContent,
    clearGeneratedContent,
    setSelectedPlatform,
    clearError,
  };
};

// Export default for convenience
export default useContentGenerator;
