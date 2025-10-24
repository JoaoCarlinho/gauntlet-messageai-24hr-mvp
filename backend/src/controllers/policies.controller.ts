import { Request, Response } from 'express';
import {
  getPrivacyPolicyContent,
  getTermsOfServiceContent,
  getAcceptableUsePolicyContent
} from '../services/policies.service';

/**
 * @route   GET /api/v1/policies/privacy
 * @desc    Get privacy policy
 * @access  Public
 */
export const getPrivacyPolicy = async (req: Request, res: Response) => {
  try {
    const policy = await getPrivacyPolicyContent();

    res.status(200).json({
      title: 'Privacy Policy',
      lastUpdated: policy.lastUpdated,
      version: policy.version,
      content: policy.content
    });
  } catch (error) {
    console.error('Error fetching privacy policy:', error);
    res.status(500).json({
      error: 'Failed to fetch privacy policy',
      message: 'An error occurred while retrieving the privacy policy'
    });
  }
};

/**
 * @route   GET /api/v1/policies/terms
 * @desc    Get terms of service
 * @access  Public
 */
export const getTermsOfService = async (req: Request, res: Response) => {
  try {
    const terms = await getTermsOfServiceContent();

    res.status(200).json({
      title: 'Terms of Service',
      lastUpdated: terms.lastUpdated,
      version: terms.version,
      content: terms.content
    });
  } catch (error) {
    console.error('Error fetching terms of service:', error);
    res.status(500).json({
      error: 'Failed to fetch terms of service',
      message: 'An error occurred while retrieving the terms of service'
    });
  }
};

/**
 * @route   GET /api/v1/policies/acceptable-use
 * @desc    Get acceptable use policy
 * @access  Public
 */
export const getAcceptableUsePolicy = async (req: Request, res: Response) => {
  try {
    const policy = await getAcceptableUsePolicyContent();

    res.status(200).json({
      title: 'Acceptable Use Policy',
      lastUpdated: policy.lastUpdated,
      version: policy.version,
      content: policy.content
    });
  } catch (error) {
    console.error('Error fetching acceptable use policy:', error);
    res.status(500).json({
      error: 'Failed to fetch acceptable use policy',
      message: 'An error occurred while retrieving the acceptable use policy'
    });
  }
};
