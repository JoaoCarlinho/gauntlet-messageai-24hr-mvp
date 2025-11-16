/**
 * Enhanced LinkedIn Profile Types
 * Comprehensive data structures for LinkedIn profile scraping
 */

export interface LinkedInExperience {
  title: string;
  company: string;
  location?: string;
  startDate?: string; // e.g., "Jan 2020"
  endDate?: string; // e.g., "Present" or "Dec 2022"
  duration?: string; // e.g., "2 yrs 3 mos"
  description?: string;
}

export interface LinkedInEducation {
  school: string;
  degree?: string; // e.g., "Bachelor of Science"
  field?: string; // e.g., "Computer Science"
  startYear?: string;
  endYear?: string;
  description?: string;
}

export interface LinkedInCertification {
  name: string;
  issuer: string; // Issuing organization
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface LinkedInContactInfo {
  email?: string;
  phone?: string;
  websites?: string[];
  linkedinUrl?: string;
  twitter?: string;
}

export interface EnhancedLinkedInProfile {
  // Basic info
  name: string;
  firstName?: string;
  lastName?: string;
  headline?: string; // Professional title/headline
  location?: string;
  about?: string; // Bio/about section

  // Work experience (top 3 most recent)
  experience: LinkedInExperience[];

  // Education
  education: LinkedInEducation[];

  // Certifications
  certifications: LinkedInCertification[];

  // Contact information
  contactInfo: LinkedInContactInfo;

  // Screenshot
  screenshotUrl?: string;

  // Metadata
  profileUrl: string;
  scrapedAt: Date;
  platform: 'linkedin';

  // Data completeness flags
  dataCompleteness: {
    hasName: boolean;
    hasHeadline: boolean;
    hasLocation: boolean;
    hasAbout: boolean;
    hasExperience: boolean;
    hasEducation: boolean;
    hasCertifications: boolean;
    hasContactInfo: boolean;
    hasScreenshot: boolean;
    needsManualReview: boolean; // Set to true if critical data is missing
  };

  // Missing fields (for manual review)
  missingFields?: string[];
}

/**
 * Data completeness calculator
 */
export function calculateDataCompleteness(profile: EnhancedLinkedInProfile): {
  completeness: number; // Percentage 0-100
  missingFields: string[];
} {
  const checks = [
    { field: 'name', value: !!profile.name && profile.name !== 'Unknown' },
    { field: 'headline', value: !!profile.headline },
    { field: 'location', value: !!profile.location },
    { field: 'about', value: !!profile.about },
    { field: 'experience', value: profile.experience.length > 0 },
    { field: 'education', value: profile.education.length > 0 },
    { field: 'certifications', value: profile.certifications.length > 0 },
    { field: 'contactInfo', value: !!(profile.contactInfo.email || profile.contactInfo.phone) },
    { field: 'screenshot', value: !!profile.screenshotUrl },
  ];

  const totalFields = checks.length;
  const completedFields = checks.filter(c => c.value).length;
  const completeness = Math.round((completedFields / totalFields) * 100);

  const missingFields = checks
    .filter(c => !c.value)
    .map(c => c.field);

  return { completeness, missingFields };
}

/**
 * Determines if profile needs manual review
 * Critical fields: name, headline or experience
 */
export function needsManualReview(profile: EnhancedLinkedInProfile): boolean {
  // Must have name
  if (!profile.name || profile.name === 'Unknown') {
    return true;
  }

  // Must have either headline OR at least one experience entry
  if (!profile.headline && profile.experience.length === 0) {
    return true;
  }

  return false;
}
