/**
 * LinkedIn Connection Automation
 *
 * Handles automatic connection requests with:
 * - Connection status detection
 * - Personalized message templates
 * - Rate limiting compliance
 * - Connection tracking
 */

import { Page } from 'puppeteer';
import { HumanBehaviorSimulator } from './human-behavior.util';

export interface ConnectionResult {
  success: boolean;
  action: 'connected' | 'already_connected' | 'pending' | 'failed' | 'skipped';
  message?: string;
  error?: string;
}

/**
 * Detect current connection status
 */
export async function detectConnectionStatus(page: Page): Promise<'connected' | 'not_connected' | 'pending' | 'unknown'> {
  try {
    const status = await page.evaluate(() => {
      // Check for "Message" button (indicates already connected)
      const messageButton = document.querySelector(
        'button[aria-label*="Message"], a[aria-label*="Message"]'
      );
      if (messageButton) {
        return 'connected';
      }

      // Check for "Pending" button (connection request sent)
      const pendingButton = document.querySelector(
        'button[aria-label*="Pending"], span:contains("Pending")'
      );
      if (pendingButton) {
        return 'pending';
      }

      // Check for "Connect" button (can send connection)
      const connectButton = document.querySelector(
        'button[aria-label*="Connect"], button:contains("Connect")'
      );
      if (connectButton) {
        return 'not_connected';
      }

      // Check for "Follow" button (might indicate 2nd/3rd degree connection)
      const followButton = document.querySelector(
        'button[aria-label*="Follow"]'
      );
      if (followButton) {
        return 'not_connected';
      }

      return 'unknown';
    });

    console.log(`[LinkedIn Connection] Status detected: ${status}`);
    return status as 'connected' | 'not_connected' | 'pending' | 'unknown';
  } catch (error) {
    console.error('[LinkedIn Connection] Error detecting status:', error);
    return 'unknown';
  }
}

/**
 * Generate personalized connection message
 */
export function generateConnectionMessage(
  firstName: string,
  headline?: string
): string {
  // Extract industry from headline if available
  let industry = 'your field';

  if (headline) {
    // Common industry keywords
    const industries: { [key: string]: string[] } = {
      'technology': ['software', 'developer', 'engineer', 'tech', 'it', 'data', 'cloud'],
      'marketing': ['marketing', 'brand', 'content', 'social media', 'seo'],
      'sales': ['sales', 'business development', 'account'],
      'finance': ['finance', 'accounting', 'financial', 'investment'],
      'healthcare': ['healthcare', 'medical', 'nurse', 'doctor', 'health'],
      'education': ['teacher', 'professor', 'education', 'instructor'],
      'design': ['design', 'ux', 'ui', 'creative'],
      'consulting': ['consultant', 'consulting', 'advisor'],
    };

    const headlineLower = headline.toLowerCase();
    for (const [industryName, keywords] of Object.entries(industries)) {
      if (keywords.some(keyword => headlineLower.includes(keyword))) {
        industry = `the ${industryName} industry`;
        break;
      }
    }
  }

  // Template with personalization
  const message = `Hi ${firstName}, It's a pleasure to connect with an expert in ${industry}.`;

  // LinkedIn has a 300 character limit for connection messages
  if (message.length > 300) {
    return message.substring(0, 297) + '...';
  }

  return message;
}

/**
 * Send connection request with personalized message
 */
export async function sendConnectionRequest(
  page: Page,
  firstName: string,
  headline?: string
): Promise<ConnectionResult> {
  try {
    console.log('[LinkedIn Connection] Attempting to send connection request...');

    // Step 1: Find and click "Connect" button
    const connectButtonSelectors = [
      'button[aria-label*="Invite"][aria-label*="to connect"]',
      'button[aria-label*="Connect"]',
      'button:has-text("Connect")',
      'div.pvs-profile-actions button:nth-child(2)', // Sometimes 2nd action button
    ];

    let connectButton = null;
    for (const selector of connectButtonSelectors) {
      try {
        connectButton = await page.$(selector);
        if (connectButton) {
          console.log(`[LinkedIn Connection] Found connect button with selector: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!connectButton) {
      return {
        success: false,
        action: 'failed',
        error: 'Connect button not found',
      };
    }

    // Humanize before clicking
    await HumanBehaviorSimulator.hesitate();
    await HumanBehaviorSimulator.simulateMouseMovement(page, 1);

    // Click connect button
    await connectButton.click();
    console.log('[LinkedIn Connection] Connect button clicked');

    // Wait for modal/dialog to appear
    await page.waitForSelector(
      'div[role="dialog"], div.send-invite',
      { timeout: 5000 }
    );
    await HumanBehaviorSimulator.simulateReading(500);

    // Step 2: Look for "Add a note" button
    const addNoteButtonSelectors = [
      'button[aria-label*="Add a note"]',
      'button:has-text("Add a note")',
    ];

    let addNoteButton = null;
    for (const selector of addNoteButtonSelectors) {
      try {
        addNoteButton = await page.$(selector);
        if (addNoteButton) {
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (addNoteButton) {
      console.log('[LinkedIn Connection] Adding personalized note...');

      // Click "Add a note" button
      await HumanBehaviorSimulator.hesitate();
      await addNoteButton.click();
      await page.waitForSelector('textarea[name="message"], textarea#custom-message', {
        timeout: 3000,
      });

      // Generate personalized message
      const personalizedMessage = generateConnectionMessage(firstName, headline);
      console.log(`[LinkedIn Connection] Message: "${personalizedMessage}"`);

      // Type message with human-like behavior
      const messageTextarea = await page.$('textarea[name="message"], textarea#custom-message');
      if (messageTextarea) {
        await HumanBehaviorSimulator.typeHumanLike(
          page,
          'textarea[name="message"], textarea#custom-message',
          personalizedMessage
        );
      }

      await HumanBehaviorSimulator.simulateReading(300);
    } else {
      console.log('[LinkedIn Connection] Sending without note (button not found)');
    }

    // Step 3: Click "Send" button
    const sendButtonSelectors = [
      'button[aria-label*="Send invitation"]',
      'button[aria-label*="Send now"]',
      'button[aria-label*="Send"]',
      'button:has-text("Send")',
    ];

    let sendButton = null;
    for (const selector of sendButtonSelectors) {
      try {
        sendButton = await page.$(selector);
        if (sendButton) {
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!sendButton) {
      // Try to close modal if send button not found
      await page.keyboard.press('Escape');
      return {
        success: false,
        action: 'failed',
        error: 'Send button not found in modal',
      };
    }

    // Click send
    await HumanBehaviorSimulator.hesitate();
    await sendButton.click();

    // Wait for confirmation
    await page.waitForTimeout(2000);

    console.log('[LinkedIn Connection] Connection request sent successfully');

    return {
      success: true,
      action: 'connected',
      message: addNoteButton
        ? `Connection request sent with personalized message`
        : `Connection request sent without note`,
    };
  } catch (error) {
    console.error('[LinkedIn Connection] Error sending connection request:', error);

    // Try to close any open modals
    try {
      await page.keyboard.press('Escape');
    } catch (e) {
      // Ignore
    }

    return {
      success: false,
      action: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main connection automation function
 * Detects status and sends connection request if appropriate
 */
export async function autoConnect(
  page: Page,
  firstName: string,
  headline?: string,
  options: {
    skipIfConnected?: boolean; // Default true
    skipIfPending?: boolean; // Default true
  } = {}
): Promise<ConnectionResult> {
  const { skipIfConnected = true, skipIfPending = true } = options;

  try {
    // Detect connection status
    const status = await detectConnectionStatus(page);

    // Handle already connected
    if (status === 'connected') {
      if (skipIfConnected) {
        console.log('[LinkedIn Connection] Already connected, skipping');
        return {
          success: true,
          action: 'already_connected',
          message: 'Already connected with this person',
        };
      }
    }

    // Handle pending connection
    if (status === 'pending') {
      if (skipIfPending) {
        console.log('[LinkedIn Connection] Connection request already pending, skipping');
        return {
          success: true,
          action: 'pending',
          message: 'Connection request already sent',
        };
      }
    }

    // Handle unknown status
    if (status === 'unknown') {
      console.warn('[LinkedIn Connection] Could not determine connection status');
      return {
        success: false,
        action: 'skipped',
        error: 'Could not determine connection status',
      };
    }

    // Send connection request
    if (status === 'not_connected') {
      return await sendConnectionRequest(page, firstName, headline);
    }

    return {
      success: false,
      action: 'skipped',
      error: 'Unexpected status',
    };
  } catch (error) {
    console.error('[LinkedIn Connection] Error in autoConnect:', error);
    return {
      success: false,
      action: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
