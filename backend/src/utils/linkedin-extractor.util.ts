/**
 * LinkedIn Profile Data Extractor
 *
 * Comprehensive extraction utility with:
 * - Progressive wait strategies for lazy-loaded content
 * - Fallback selector patterns for robustness
 * - Experience, Education, Certifications extraction
 * - Contact info extraction (via modal)
 * - Connection automation
 */

import { Page } from 'puppeteer';
import {
  EnhancedLinkedInProfile,
  LinkedInExperience,
  LinkedInEducation,
  LinkedInCertification,
  LinkedInContactInfo,
  calculateDataCompleteness,
  needsManualReview,
} from '../types/linkedin-profile';
import { HumanBehaviorSimulator } from './human-behavior.util';

/**
 * Wait for LinkedIn profile sections to load
 * LinkedIn lazy-loads content as user scrolls
 */
export async function waitForProfileSections(page: Page): Promise<void> {
  try {
    console.log('[LinkedIn] Waiting for profile sections to load...');

    // Wait for main profile header (always loads first)
    await page.waitForSelector('h1.text-heading-xlarge, h1.top-card-layout__title', {
      timeout: 10000,
    }).catch(() => console.warn('[LinkedIn] Header not found'));

    // Simulate scrolling to trigger lazy-loading
    await HumanBehaviorSimulator.simulateScrolling(page);
    await HumanBehaviorSimulator.simulateReading(500); // Wait for content to render

    // Wait for each section (with fallback timeout)
    const sections = [
      { selector: '#about', name: 'About' },
      { selector: '#experience', name: 'Experience' },
      { selector: '#education', name: 'Education' },
      { selector: '#licenses_and_certifications', name: 'Certifications' },
    ];

    for (const section of sections) {
      try {
        await page.waitForSelector(section.selector, { timeout: 5000 });
        console.log(`[LinkedIn] ✓ ${section.name} section loaded`);
        await HumanBehaviorSimulator.simulateReading(200); // Brief pause between sections
      } catch (error) {
        console.warn(`[LinkedIn] ✗ ${section.name} section not found (may be empty)`);
      }
    }

    // Final scroll to bottom to ensure all content loaded
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await HumanBehaviorSimulator.simulateReading(1000); // Wait for final content

    console.log('[LinkedIn] Profile sections loading complete');
  } catch (error) {
    console.error('[LinkedIn] Error waiting for sections:', error);
  }
}

/**
 * Extract basic profile information (name, headline, location, about)
 */
export async function extractBasicInfo(page: Page): Promise<{
  name: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  location?: string;
  about?: string;
}> {
  return await page.evaluate(() => {
    // Name (multiple fallback selectors)
    const nameSelectors = [
      'h1.text-heading-xlarge',
      'h1.top-card-layout__title',
      'h1.pv-top-card--list > li',
    ];
    let name = '';
    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        name = element.textContent.trim();
        break;
      }
    }

    // Split name into first/last
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Headline/Title (multiple fallback selectors)
    const headlineSelectors = [
      'div.text-body-medium',
      'div.top-card-layout__headline',
      'h2.pv-top-card--list-bullet > li',
    ];
    let headline = '';
    for (const selector of headlineSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        headline = element.textContent.trim();
        break;
      }
    }

    // Location (multiple fallback selectors)
    const locationSelectors = [
      'span.text-body-small.inline.t-black--light.break-words',
      'div.top-card__subline-item:nth-child(1)',
      'span.pv-top-card--list-bullet > li:first-child',
    ];
    let location = '';
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        location = element.textContent.trim();
        break;
      }
    }

    // About section
    const aboutSection = document.querySelector('#about');
    let about = '';
    if (aboutSection) {
      const aboutContent = aboutSection.parentElement?.querySelector(
        'div.display-flex span[aria-hidden="true"]'
      );
      about = aboutContent?.textContent?.trim() || '';
    }

    return {
      name,
      firstName,
      lastName,
      headline,
      location,
      about,
    };
  });
}

/**
 * Extract experience (top 3 most recent jobs)
 */
export async function extractExperience(page: Page): Promise<LinkedInExperience[]> {
  return await page.evaluate(() => {
    const experiences: LinkedInExperience[] = [];

    // Find experience section
    const experienceSection = document.querySelector('#experience');
    if (!experienceSection) {
      return experiences;
    }

    // Get all experience entries (limit to top 3)
    const experienceItems = experienceSection.parentElement?.querySelectorAll(
      'ul > li.artdeco-list__item'
    );

    if (!experienceItems || experienceItems.length === 0) {
      return experiences;
    }

    // Extract top 3 experiences
    const itemsToExtract = Array.from(experienceItems).slice(0, 3);

    for (const item of itemsToExtract) {
      try {
        // Title (position)
        const titleElement = item.querySelector('span[aria-hidden="true"]');
        const title = titleElement?.textContent?.trim() || '';

        // Company
        const companyElement = item.querySelector('span.t-14.t-normal span[aria-hidden="true"]');
        const company = companyElement?.textContent?.trim() || '';

        // Date range
        const dateElement = item.querySelector('span.t-14.t-normal.t-black--light span[aria-hidden="true"]');
        const dateText = dateElement?.textContent?.trim() || '';

        // Parse dates (e.g., "Jan 2020 - Present · 3 yrs 2 mos")
        const dateParts = dateText.split('·');
        const dateRange = dateParts[0]?.trim() || '';
        const duration = dateParts[1]?.trim() || '';

        // Split date range into start/end
        const [startDate, endDate] = dateRange.split(' - ').map(d => d.trim());

        // Location
        const locationElement = item.querySelector('span.t-14.t-normal.t-black--light:nth-of-type(2) span[aria-hidden="true"]');
        const location = locationElement?.textContent?.trim() || '';

        // Description
        const descriptionElement = item.querySelector('div.display-flex span[aria-hidden="true"]');
        const description = descriptionElement?.textContent?.trim() || '';

        experiences.push({
          title,
          company,
          startDate,
          endDate,
          duration,
          location,
          description,
        });
      } catch (error) {
        console.warn('[LinkedIn] Error extracting experience item:', error);
      }
    }

    return experiences;
  });
}

/**
 * Extract education
 */
export async function extractEducation(page: Page): Promise<LinkedInEducation[]> {
  return await page.evaluate(() => {
    const educationList: LinkedInEducation[] = [];

    // Find education section
    const educationSection = document.querySelector('#education');
    if (!educationSection) {
      return educationList;
    }

    // Get all education entries
    const educationItems = educationSection.parentElement?.querySelectorAll(
      'ul > li.artdeco-list__item'
    );

    if (!educationItems || educationItems.length === 0) {
      return educationList;
    }

    for (const item of Array.from(educationItems)) {
      try {
        // School name
        const schoolElement = item.querySelector('span[aria-hidden="true"]');
        const school = schoolElement?.textContent?.trim() || '';

        // Degree and field (e.g., "Bachelor of Science - BS, Computer Science")
        const degreeElement = item.querySelector('span.t-14.t-normal span[aria-hidden="true"]');
        const degreeText = degreeElement?.textContent?.trim() || '';

        // Parse degree and field
        let degree = '';
        let field = '';
        if (degreeText.includes(',')) {
          const parts = degreeText.split(',');
          degree = parts[0]?.trim() || '';
          field = parts[1]?.trim() || '';
        } else if (degreeText.includes(' - ')) {
          const parts = degreeText.split(' - ');
          degree = parts[0]?.trim() || '';
          field = parts[1]?.trim() || '';
        } else {
          degree = degreeText;
        }

        // Years (e.g., "2015 - 2019")
        const yearsElement = item.querySelector('span.t-14.t-normal.t-black--light span[aria-hidden="true"]');
        const yearsText = yearsElement?.textContent?.trim() || '';
        const [startYear, endYear] = yearsText.split(' - ').map(y => y.trim());

        // Description
        const descriptionElement = item.querySelector('div.display-flex span[aria-hidden="true"]');
        const description = descriptionElement?.textContent?.trim() || '';

        educationList.push({
          school,
          degree,
          field,
          startYear,
          endYear,
          description,
        });
      } catch (error) {
        console.warn('[LinkedIn] Error extracting education item:', error);
      }
    }

    return educationList;
  });
}

/**
 * Extract licenses and certifications
 */
export async function extractCertifications(page: Page): Promise<LinkedInCertification[]> {
  return await page.evaluate(() => {
    const certifications: LinkedInCertification[] = [];

    // Find certifications section
    const certificationsSection = document.querySelector('#licenses_and_certifications');
    if (!certificationsSection) {
      return certifications;
    }

    // Get all certification entries
    const certificationItems = certificationsSection.parentElement?.querySelectorAll(
      'ul > li.artdeco-list__item'
    );

    if (!certificationItems || certificationItems.length === 0) {
      return certifications;
    }

    for (const item of Array.from(certificationItems)) {
      try {
        // Certification name
        const nameElement = item.querySelector('span[aria-hidden="true"]');
        const name = nameElement?.textContent?.trim() || '';

        // Issuer
        const issuerElement = item.querySelector('span.t-14.t-normal span[aria-hidden="true"]');
        const issuer = issuerElement?.textContent?.trim() || '';

        // Issue date (e.g., "Issued Jan 2022")
        const dateElements = item.querySelectorAll('span.t-14.t-normal.t-black--light span[aria-hidden="true"]');
        let issueDate = '';
        let expirationDate = '';

        for (const element of Array.from(dateElements)) {
          const text = element.textContent?.trim() || '';
          if (text.includes('Issued')) {
            issueDate = text.replace('Issued ', '').trim();
          } else if (text.includes('Expires')) {
            expirationDate = text.replace('Expires ', '').trim();
          }
        }

        // Credential ID
        const credentialElement = item.querySelector('span.t-14.t-normal:contains("Credential ID")');
        const credentialId = credentialElement?.textContent?.replace('Credential ID ', '').trim() || '';

        // Credential URL (if available)
        const linkElement = item.querySelector('a[href*="credential"]');
        const credentialUrl = linkElement?.getAttribute('href') || '';

        certifications.push({
          name,
          issuer,
          issueDate,
          expirationDate,
          credentialId,
          credentialUrl,
        });
      } catch (error) {
        console.warn('[LinkedIn] Error extracting certification item:', error);
      }
    }

    return certifications;
  });
}

/**
 * Extract contact information by clicking the "Contact info" modal
 */
export async function extractContactInfo(page: Page): Promise<LinkedInContactInfo> {
  const contactInfo: LinkedInContactInfo = {};

  try {
    console.log('[LinkedIn] Attempting to extract contact info...');

    // Find and click "Contact info" button
    const contactButtonSelectors = [
      'a[href="#contact-info"]',
      'button[aria-label*="Contact"]',
      'a:contains("Contact info")',
      '#top-card-text-details-contact-info',
    ];

    let clicked = false;
    for (const selector of contactButtonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await HumanBehaviorSimulator.hesitate(); // Humanize
        await page.click(selector);
        clicked = true;
        console.log('[LinkedIn] Contact info button clicked');
        break;
      } catch (error) {
        continue;
      }
    }

    if (!clicked) {
      console.warn('[LinkedIn] Contact info button not found');
      return contactInfo;
    }

    // Wait for modal to appear
    await page.waitForSelector('div[role="dialog"], section.pv-contact-info', {
      timeout: 5000,
    });
    await HumanBehaviorSimulator.simulateReading(300); // Wait for modal content

    // Extract contact info from modal
    const extractedData = await page.evaluate(() => {
      const data: LinkedInContactInfo = {};

      // Find modal container
      const modal = document.querySelector('div[role="dialog"], section.pv-contact-info');
      if (!modal) {
        return data;
      }

      // Email (look for mailto: links)
      const emailLink = modal.querySelector('a[href^="mailto:"]');
      if (emailLink) {
        data.email = emailLink.getAttribute('href')?.replace('mailto:', '') || '';
      }

      // Phone (look for tel: links)
      const phoneLink = modal.querySelector('a[href^="tel:"]');
      if (phoneLink) {
        data.phone = phoneLink.getAttribute('href')?.replace('tel:', '').replace(/\D/g, '') || '';
      }

      // Websites
      const websiteLinks = modal.querySelectorAll('a[href*="http"]:not([href*="linkedin.com"])');
      data.websites = Array.from(websiteLinks).map(link => link.getAttribute('href') || '').filter(Boolean);

      // LinkedIn URL
      const linkedinLink = modal.querySelector('a[href*="linkedin.com/in/"]');
      if (linkedinLink) {
        data.linkedinUrl = linkedinLink.getAttribute('href') || '';
      }

      // Twitter (if available)
      const twitterLink = modal.querySelector('a[href*="twitter.com"], a[href*="x.com"]');
      if (twitterLink) {
        data.twitter = twitterLink.getAttribute('href') || '';
      }

      return data;
    });

    Object.assign(contactInfo, extractedData);

    // Close modal by clicking outside or close button
    try {
      const closeButton = await page.$('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]');
      if (closeButton) {
        await HumanBehaviorSimulator.hesitate();
        await closeButton.click();
      } else {
        // Click outside modal
        await page.keyboard.press('Escape');
      }
    } catch (error) {
      console.warn('[LinkedIn] Could not close contact info modal');
    }

    console.log('[LinkedIn] Contact info extracted:', contactInfo);
  } catch (error) {
    console.warn('[LinkedIn] Error extracting contact info:', error);
  }

  return contactInfo;
}

/**
 * Complete profile extraction
 */
export async function extractCompleteProfile(
  page: Page,
  profileUrl: string
): Promise<EnhancedLinkedInProfile> {
  console.log('[LinkedIn] Starting complete profile extraction...');

  // Step 1: Wait for all sections to load
  await waitForProfileSections(page);

  // Step 2: Extract basic info
  const basicInfo = await extractBasicInfo(page);

  // Step 3: Extract experience
  const experience = await extractExperience(page);

  // Step 4: Extract education
  const education = await extractEducation(page);

  // Step 5: Extract certifications
  const certifications = await extractCertifications(page);

  // Step 6: Extract contact info (via modal)
  const contactInfo = await extractContactInfo(page);

  // Construct profile
  const profile: EnhancedLinkedInProfile = {
    name: basicInfo.name || 'Unknown',
    firstName: basicInfo.firstName,
    lastName: basicInfo.lastName,
    headline: basicInfo.headline,
    location: basicInfo.location,
    about: basicInfo.about,
    experience,
    education,
    certifications,
    contactInfo,
    profileUrl,
    scrapedAt: new Date(),
    platform: 'linkedin',
    dataCompleteness: {
      hasName: !!basicInfo.name && basicInfo.name !== 'Unknown',
      hasHeadline: !!basicInfo.headline,
      hasLocation: !!basicInfo.location,
      hasAbout: !!basicInfo.about,
      hasExperience: experience.length > 0,
      hasEducation: education.length > 0,
      hasCertifications: certifications.length > 0,
      hasContactInfo: !!(contactInfo.email || contactInfo.phone),
      hasScreenshot: false, // Set later after screenshot upload
      needsManualReview: needsManualReview(profile),
    },
  };

  // Calculate missing fields
  const { missingFields } = calculateDataCompleteness(profile);
  profile.missingFields = missingFields;

  console.log('[LinkedIn] Profile extraction complete');
  console.log(`[LinkedIn] Data completeness: ${missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : '100%'}`);

  return profile;
}
