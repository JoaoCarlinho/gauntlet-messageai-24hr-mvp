import { generateText } from 'ai';
import { openai, AI_CONFIG } from '../../config/openai';
import * as productService from '../products.service';
import * as vectorDbService from '../vectorDb.service';

/**
 * Content Generator AI Agent Service
 *
 * Generates marketing content including:
 * - Ad copy (platform-specific)
 * - Social media posts
 * - Landing page copy
 * - Image generation prompts
 */

/**
 * Platform character limits and constraints
 */
const PLATFORM_CONSTRAINTS = {
  facebook: {
    headlineMax: 40,
    textMax: 125,
    descriptionMax: 30,
  },
  linkedin: {
    headlineMax: 200,
    textMax: 3000,
    articleMax: 110000,
  },
  instagram: {
    captionMax: 2200,
    hashtagsMax: 30,
  },
  x: {
    tweetMax: 280,
    threadMax: 25,
  },
  tiktok: {
    scriptMax: 300, // 60-second video at normal speaking pace
    captionMax: 150,
  },
  google: {
    headlineMax: 30,
    descriptionMax: 90,
  },
} as const;

/**
 * Retrieve product context from database and vector DB
 */
async function getProductContext(productId: string, teamId: string): Promise<string> {
  try {
    // Get product from database
    const product = await productService.getProduct(productId, teamId);

    if (!product) {
      throw new Error('Product not found');
    }

    // Get enhanced context from vector DB
    const namespace = vectorDbService.getTeamNamespace(teamId, 'PRODUCTS');
    const vectorRecord = await vectorDbService.fetchVector(namespace, productId);

    // Build comprehensive context
    let context = `Product: ${product.name}\n`;
    context += `Description: ${product.description}\n`;

    if (product.features && Array.isArray(product.features) && product.features.length > 0) {
      context += `Features:\n${product.features.map((f: any) => `- ${f}`).join('\n')}\n`;
    }

    if (product.usps && Array.isArray(product.usps) && product.usps.length > 0) {
      context += `Unique Selling Points:\n${product.usps.map((u: any) => `- ${u}`).join('\n')}\n`;
    }

    if (product.pricing) {
      context += `Pricing: ${JSON.stringify(product.pricing)}\n`;
    }

    // Add vector metadata if available
    if (vectorRecord?.metadata?.text) {
      context += `\nAdditional Context:\n${vectorRecord.metadata.text}`;
    }

    return context;
  } catch (error) {
    console.error('Error retrieving product context:', error);
    throw error;
  }
}

/**
 * Generate ad copy variations for a specific platform
 *
 * @param productId - Product ID
 * @param teamId - Team ID
 * @param platform - Target platform (facebook, google, linkedin, etc.)
 * @param variations - Number of variations to generate (default: 3)
 * @returns Generated ad copy variations
 */
export async function generateAdCopy(
  productId: string,
  teamId: string,
  platform: keyof typeof PLATFORM_CONSTRAINTS,
  variations: number = 3
): Promise<{
  platform: string;
  variations: Array<{
    headlines: string[];
    bodyCopy: string[];
    ctas: string[];
    description?: string;
  }>;
}> {
  try {
    console.log(`📝 Generating ${variations} ad copy variations for ${platform}`);

    const productContext = await getProductContext(productId, teamId);
    const constraints = PLATFORM_CONSTRAINTS[platform];

    const systemPrompt = `You are an expert copywriter specializing in ${platform} advertising.
Your task is to create compelling ad copy that drives conversions.

Platform Constraints for ${platform}:
${JSON.stringify(constraints, null, 2)}

Product Information:
${productContext}

Generate ${variations} distinct ad copy variations. Each variation should:
1. Have 3-5 different headlines (stay within character limits)
2. Have 3-5 different body copy options (stay within character limits)
3. Have 5 compelling CTAs
4. Be unique in tone and approach (e.g., benefit-focused, emotion-driven, urgency-based)
5. Follow ${platform} best practices and ad policies

Return ONLY a valid JSON object with this exact structure:
{
  "variations": [
    {
      "headlines": ["headline 1", "headline 2", "headline 3"],
      "bodyCopy": ["body 1", "body 2", "body 3"],
      "ctas": ["cta 1", "cta 2", "cta 3", "cta 4", "cta 5"],
      "description": "brief description of this variation's approach"
    }
  ]
}`;

    const response = await generateText({
      model: openai(AI_CONFIG.model),
      prompt: systemPrompt,
      temperature: 0.8, // Higher creativity for ad copy
    });

    const result = JSON.parse(response.text);

    return {
      platform,
      variations: result.variations,
    };
  } catch (error) {
    console.error('Error generating ad copy:', error);
    throw new Error('Failed to generate ad copy');
  }
}

/**
 * Generate social media posts for a specific platform
 *
 * @param productId - Product ID
 * @param teamId - Team ID
 * @param platform - Target platform (facebook, linkedin, instagram, x, tiktok)
 * @param count - Number of posts to generate (default: 5)
 * @returns Generated social posts
 */
export async function generateSocialPosts(
  productId: string,
  teamId: string,
  platform: 'facebook' | 'linkedin' | 'instagram' | 'x' | 'tiktok',
  count: number = 5
): Promise<{
  platform: string;
  posts: Array<{
    content: string;
    hashtags?: string[];
    imagePrompt?: string;
    thread?: string[];
    script?: string;
    hook?: string;
  }>;
}> {
  try {
    console.log(`📱 Generating ${count} ${platform} posts`);

    const productContext = await getProductContext(productId, teamId);
    const constraints = PLATFORM_CONSTRAINTS[platform];

    let platformGuidance = '';
    switch (platform) {
      case 'facebook':
        platformGuidance = 'Facebook posts should be conversational, community-focused, and encourage engagement. Use storytelling and ask questions.';
        break;
      case 'linkedin':
        platformGuidance = 'LinkedIn content should be professional, thought-leadership focused, and provide business value. Use industry insights and professional tone.';
        break;
      case 'instagram':
        platformGuidance = 'Instagram captions should be visual-first, use emojis strategically, and include relevant hashtags (15-20 recommended). Include a strong hook in the first line.';
        break;
      case 'x':
        platformGuidance = 'X (Twitter) posts should be concise, punchy, and shareable. Create threads (3-5 tweets) for deeper storytelling. Use hooks that stop the scroll.';
        break;
      case 'tiktok':
        platformGuidance = 'TikTok scripts should be for 30-60 second videos with a strong hook in the first 3 seconds. Include visual cues and trending audio suggestions.';
        break;
    }

    const systemPrompt = `You are a social media expert specializing in ${platform} content.

Platform Guidelines: ${platformGuidance}

Platform Constraints:
${JSON.stringify(constraints, null, 2)}

Product Information:
${productContext}

Generate ${count} distinct ${platform} posts. Each post should be optimized for the platform and encourage engagement.

For Instagram: Include hashtags array (15-20 relevant hashtags)
For X: If content is long, create a thread array (3-5 tweets)
For TikTok: Include a video script with timestamps and hooks
For all platforms: Include an imagePrompt for complementary visuals

Return ONLY a valid JSON object:
{
  "posts": [
    {
      "content": "the main post content",
      "hashtags": ["hashtag1", "hashtag2"], // Instagram only
      "thread": ["tweet1", "tweet2", "tweet3"], // X only
      "script": "00:00 - Hook: ...\n00:03 - ...", // TikTok only
      "hook": "attention-grabbing first line",
      "imagePrompt": "DALL-E prompt for accompanying image"
    }
  ]
}`;

    const response = await generateText({
      model: openai(AI_CONFIG.model),
      prompt: systemPrompt,
      temperature: 0.8,
    });

    const result = JSON.parse(response.text);

    return {
      platform,
      posts: result.posts,
    };
  } catch (error) {
    console.error('Error generating social posts:', error);
    throw new Error('Failed to generate social posts');
  }
}

/**
 * Generate landing page copy sections
 *
 * @param productId - Product ID
 * @param teamId - Team ID
 * @returns Landing page sections
 */
export async function generateLandingPageCopy(
  productId: string,
  teamId: string
): Promise<{
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
  };
  features: Array<{
    title: string;
    description: string;
    benefit: string;
  }>;
  socialProof: {
    testimonialFramework: string;
    statsFramework: string[];
    trustSignals: string[];
  };
  faq: Array<{
    question: string;
    answer: string;
  }>;
  cta: {
    primary: string;
    secondary: string;
    urgency: string;
  };
}> {
  try {
    console.log(`🌐 Generating landing page copy`);

    const productContext = await getProductContext(productId, teamId);

    const systemPrompt = `You are a conversion-focused landing page copywriter.

Product Information:
${productContext}

Create comprehensive landing page copy with the following sections:

1. Hero Section:
   - Compelling headline that speaks to the main benefit
   - Supporting subheadline that addresses pain points
   - Primary CTA

2. Features/Benefits:
   - 3-5 key features with titles, descriptions, and benefits
   - Focus on outcomes, not just features

3. Social Proof Framework:
   - Testimonial template/framework
   - Key stats to highlight (3-5)
   - Trust signals (certifications, guarantees, etc.)

4. FAQ Section:
   - 5-8 common questions and answers
   - Address objections proactively

5. CTA Section:
   - Primary CTA
   - Secondary CTA (lower commitment)
   - Urgency-driving message

Return ONLY a valid JSON object with this structure:
{
  "hero": {
    "headline": "main headline",
    "subheadline": "supporting text",
    "cta": "call to action text"
  },
  "features": [
    {
      "title": "feature title",
      "description": "feature description",
      "benefit": "what the customer gains"
    }
  ],
  "socialProof": {
    "testimonialFramework": "template for testimonials",
    "statsFramework": ["stat 1", "stat 2", "stat 3"],
    "trustSignals": ["signal 1", "signal 2"]
  },
  "faq": [
    {
      "question": "question text",
      "answer": "answer text"
    }
  ],
  "cta": {
    "primary": "main cta",
    "secondary": "alternative cta",
    "urgency": "urgency message"
  }
}`;

    const response = await generateText({
      model: openai(AI_CONFIG.model),
      prompt: systemPrompt,
      temperature: 0.7,
    });

    const result = JSON.parse(response.text);

    return result;
  } catch (error) {
    console.error('Error generating landing page copy:', error);
    throw new Error('Failed to generate landing page copy');
  }
}

/**
 * Generate DALL-E image prompts for marketing visuals
 *
 * @param productId - Product ID
 * @param teamId - Team ID
 * @param concept - Visual concept (e.g., "hero image", "product showcase", "lifestyle")
 * @param count - Number of prompt variations (default: 3)
 * @returns DALL-E prompts
 */
export async function generateImagePrompts(
  productId: string,
  teamId: string,
  concept: string,
  count: number = 3
): Promise<{
  concept: string;
  prompts: Array<{
    prompt: string;
    style: string;
    aspectRatio: string;
    usage: string;
  }>;
}> {
  try {
    console.log(`🎨 Generating ${count} image prompts for concept: ${concept}`);

    const productContext = await getProductContext(productId, teamId);

    const systemPrompt = `You are an expert at creating DALL-E prompts for marketing visuals.

Product Information:
${productContext}

Visual Concept: ${concept}

Generate ${count} distinct DALL-E 3 prompts for this concept. Each prompt should:
1. Be detailed and specific (but under 400 characters)
2. Include style direction (photorealistic, illustration, 3D, etc.)
3. Specify composition and lighting
4. Avoid text in images (DALL-E limitation)
5. Be commercially usable

Return ONLY a valid JSON object:
{
  "prompts": [
    {
      "prompt": "detailed DALL-E prompt",
      "style": "photorealistic|illustration|3D|minimalist|etc",
      "aspectRatio": "square|landscape|portrait",
      "usage": "where this would be used (e.g., hero banner, social post, ad)"
    }
  ]
}`;

    const response = await generateText({
      model: openai(AI_CONFIG.model),
      prompt: systemPrompt,
      temperature: 0.8,
    });

    const result = JSON.parse(response.text);

    return {
      concept,
      prompts: result.prompts,
    };
  } catch (error) {
    console.error('Error generating image prompts:', error);
    throw new Error('Failed to generate image prompts');
  }
}

/**
 * Save generated content to content library
 *
 * @param teamId - Team ID
 * @param productId - Product ID
 * @param contentType - Type of content
 * @param content - Content data
 * @param metadata - Additional metadata
 * @returns Saved content record
 */
export async function saveToContentLibrary(
  teamId: string,
  productId: string,
  contentType: 'ad_copy' | 'social_post' | 'landing_page' | 'image_prompt',
  content: any,
  metadata: any = {}
): Promise<any> {
  try {
    console.log(`💾 Saving ${contentType} to content library`);

    // Note: This is a placeholder implementation
    // In a production environment, you would create a ContentLibrary model in Prisma schema
    // For now, we'll just return the content with an ID for demonstration purposes
    const contentRecord = {
      id: `content_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      teamId,
      productId,
      contentType,
      content,
      metadata,
      createdAt: new Date().toISOString(),
    };

    console.log(`✅ Content prepared (not persisted - ContentLibrary model needed): ${contentRecord.id}`);

    return contentRecord;
  } catch (error) {
    console.error('Error saving to content library:', error);
    throw new Error('Failed to save to content library');
  }
}

/**
 * Regenerate content with modifications
 *
 * @param originalContent - Original generated content
 * @param instruction - Modification instruction (e.g., "make it more casual")
 * @param contentType - Type of content being regenerated
 * @returns Regenerated content
 */
export async function regenerateContent(
  originalContent: string,
  instruction: string,
  contentType: string
): Promise<any> {
  try {
    console.log(`🔄 Regenerating ${contentType} with instruction: ${instruction}`);

    const systemPrompt = `You are editing existing marketing content based on user feedback.

Original Content:
${originalContent}

User Instruction: ${instruction}

Regenerate the content following the user's instruction while maintaining:
1. The core message and value proposition
2. Platform constraints and best practices
3. Professional quality

Return the modified content in the same JSON format as the original.`;

    const response = await generateText({
      model: openai(AI_CONFIG.model),
      prompt: systemPrompt,
      temperature: 0.7,
    });

    const result = JSON.parse(response.text);

    return result;
  } catch (error) {
    console.error('Error regenerating content:', error);
    throw new Error('Failed to regenerate content');
  }
}

export default {
  generateAdCopy,
  generateSocialPosts,
  generateLandingPageCopy,
  generateImagePrompts,
  saveToContentLibrary,
  regenerateContent,
};
