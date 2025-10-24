/**
 * Policies Service
 * Provides legal policy content for the application
 */

export interface PolicyContent {
  content: string;
  lastUpdated: string;
  version: string;
}

/**
 * Get Privacy Policy content
 */
export const getPrivacyPolicyContent = async (): Promise<PolicyContent> => {
  const lastUpdated = '2025-10-24';
  const version = '1.0';

  const content = `# Privacy Policy

**Effective Date:** ${lastUpdated}
**Version:** ${version}

## 1. Introduction

Welcome to MessageAI ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our marketing automation platform and social media integration services (the "Service").

By using our Service, you consent to the data practices described in this policy. If you do not agree with this policy, please do not use our Service.

## 2. Information We Collect

### 2.1 Information You Provide to Us

**Account Information:**
- Email address
- Display name
- Password (encrypted)
- Profile information

**Business Information:**
- Company name and details
- Team member information
- Billing and payment information

**Content and Communications:**
- Messages you send and receive through our platform
- Conversation data and metadata
- Files, images, and media you upload
- Feedback and support communications

### 2.2 Information from Social Media Platforms

When you connect your social media accounts (Facebook, Instagram, WhatsApp, Twitter, LinkedIn, etc.), we collect:

**Profile Information:**
- Account username and ID
- Profile name and picture
- Follower/connection counts
- Account verification status

**Interaction Data:**
- Messages sent and received
- Comments and replies
- Engagement metrics (likes, shares, views)
- Campaign performance data

**Access Tokens:**
- OAuth tokens for authorized access
- Refresh tokens for maintaining connections

### 2.3 Automatically Collected Information

**Usage Data:**
- Log data (IP address, browser type, device information)
- Pages visited and features used
- Date and time of access
- Referring website addresses

**Technical Data:**
- Device identifiers
- Operating system information
- Application version
- Cookie data and similar technologies

**Analytics Data:**
- User behavior patterns
- Feature usage statistics
- Performance metrics

### 2.4 Lead and Customer Data

**Lead Information:**
- Contact details (name, email, phone)
- Lead source and campaign attribution
- Lead status and qualification data
- Interaction history and engagement scores

**Campaign Data:**
- Campaign performance metrics
- Audience targeting information
- Content performance analytics

## 3. How We Use Your Information

We use the collected information for the following purposes:

### 3.1 Service Delivery
- Provide, maintain, and improve our Service
- Enable social media integrations and message management
- Process and route messages across platforms
- Manage conversations and customer interactions
- Facilitate team collaboration

### 3.2 Analytics and Insights
- Generate performance reports and analytics
- Track campaign effectiveness
- Provide lead scoring and qualification
- Create usage dashboards

### 3.3 Communication
- Send service-related notifications
- Provide customer support
- Send marketing communications (with your consent)
- Notify you of updates and new features

### 3.4 Security and Compliance
- Detect and prevent fraud and abuse
- Ensure platform security
- Comply with legal obligations
- Enforce our Terms of Service

### 3.5 Business Operations
- Process payments and billing
- Conduct research and development
- Improve user experience
- Personalize features and recommendations

## 4. Legal Basis for Processing (GDPR)

For users in the European Economic Area (EEA), our legal bases for processing personal data include:

- **Consent:** You have given explicit consent for specific processing activities
- **Contract:** Processing is necessary to fulfill our contract with you
- **Legal Obligation:** Processing is required by law
- **Legitimate Interests:** Processing is necessary for our legitimate business interests, except where overridden by your rights

## 5. How We Share Your Information

We do not sell your personal information. We may share your information in the following circumstances:

### 5.1 Service Providers
We share data with third-party service providers who perform services on our behalf:
- Cloud hosting providers (AWS)
- Payment processors
- Analytics services
- Email service providers
- Customer support tools

### 5.2 Social Media Platforms
We share data with connected social media platforms as necessary to:
- Send and receive messages
- Post content on your behalf
- Retrieve analytics and insights
- Maintain authorized connections

### 5.3 Business Transfers
In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.

### 5.4 Legal Requirements
We may disclose your information if required by law or in response to:
- Legal processes (subpoenas, court orders)
- Government requests
- Protection of our rights and safety
- Investigation of potential violations

### 5.5 With Your Consent
We may share your information for other purposes with your explicit consent.

## 6. Data Retention

We retain your information for as long as necessary to:
- Provide the Service to you
- Comply with legal obligations
- Resolve disputes and enforce agreements
- Fulfill the purposes described in this policy

**Specific Retention Periods:**
- Account data: Duration of account plus 30 days after deletion
- Message data: Duration of account or as required by law
- Analytics data: Aggregated data may be retained indefinitely
- Lead data: As long as the relationship is active plus 3 years

You may request deletion of your data at any time, subject to legal retention requirements.

## 7. Your Privacy Rights

Depending on your location, you may have the following rights:

### 7.1 General Rights
- **Access:** Request a copy of your personal data
- **Correction:** Request correction of inaccurate data
- **Deletion:** Request deletion of your data (right to be forgotten)
- **Portability:** Receive your data in a structured, machine-readable format
- **Objection:** Object to certain processing of your data
- **Restriction:** Request restriction of processing

### 7.2 California Residents (CCPA)
California residents have additional rights:
- Know what personal information is collected
- Know whether personal information is sold or disclosed
- Opt-out of the sale of personal information (we do not sell data)
- Request deletion of personal information
- Non-discrimination for exercising privacy rights

### 7.3 EEA Residents (GDPR)
EEA residents have the right to:
- Lodge a complaint with a supervisory authority
- Withdraw consent at any time
- Data portability
- Not be subject to automated decision-making

### 7.4 Exercising Your Rights
To exercise these rights, please contact us at privacy@messageai.com. We will respond to your request within 30 days.

## 8. Data Security

We implement appropriate technical and organizational measures to protect your data:

**Security Measures:**
- Encryption in transit (TLS/SSL) and at rest
- Access controls and authentication
- Regular security audits and assessments
- Employee training on data protection
- Incident response procedures
- Secure backup and disaster recovery

However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.

## 9. International Data Transfers

Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws.

When we transfer data internationally, we ensure appropriate safeguards are in place:
- Standard Contractual Clauses (SCCs)
- Privacy Shield frameworks (where applicable)
- Adequacy decisions by relevant authorities

## 10. Social Media Platform Compliance

### 10.1 Facebook/Instagram (Meta)
We comply with Meta's Platform Terms and Developer Policies:
- Data obtained via Meta APIs is used only for authorized purposes
- User data is stored securely and deleted when no longer needed
- We do not use Meta data for independent data augmentation

### 10.2 WhatsApp Business API
We comply with WhatsApp Business Terms:
- Messages comply with WhatsApp's Commerce and Business Policies
- User consent is obtained before initiating conversations
- Opt-out mechanisms are provided

### 10.3 Twitter/X API
We comply with Twitter Developer Agreement and Policy:
- Respect user privacy settings
- Proper attribution of content
- Compliance with rate limits and usage restrictions

### 10.4 LinkedIn API
We comply with LinkedIn API Terms of Use:
- Respect member privacy controls
- Appropriate use of member data
- Compliance with advertising policies

## 11. Third-Party Links and Integrations

Our Service may contain links to third-party websites and integrations with third-party services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.

## 12. Children's Privacy

Our Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected data from a child under 18, we will take steps to delete it promptly.

## 13. Cookies and Tracking Technologies

We use cookies and similar tracking technologies to:
- Maintain your session
- Remember your preferences
- Analyze usage patterns
- Improve Service performance

**Types of Cookies:**
- **Essential Cookies:** Required for Service operation
- **Analytics Cookies:** Help us understand usage
- **Preference Cookies:** Remember your settings
- **Marketing Cookies:** Used for targeted advertising (with consent)

You can control cookies through your browser settings. Disabling certain cookies may limit functionality.

## 14. Do Not Track Signals

Some browsers have a "Do Not Track" feature. Our Service does not currently respond to Do Not Track signals, as there is no industry standard for compliance.

## 15. California Shine the Light Law

California residents may request information about disclosure of personal information to third parties for their direct marketing purposes. We do not share personal information with third parties for their direct marketing purposes.

## 16. Nevada Privacy Rights

Nevada residents have the right to opt-out of the sale of certain personal information. We do not sell personal information as defined under Nevada law.

## 17. Updates to This Privacy Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Effective Date." Material changes will be communicated via:
- Email notification
- In-app notification
- Prominent notice on our website

Your continued use of the Service after changes constitutes acceptance of the updated policy.

## 18. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

**Email:** privacy@messageai.com
**Data Protection Officer:** dpo@messageai.com
**Address:** [Your Company Address]

For EEA residents, you have the right to lodge a complaint with your local data protection authority.

## 19. Specific Use Cases

### 19.1 Marketing Automation
When you use our marketing automation features:
- We process campaign data to send targeted messages
- We track delivery, open rates, and engagement metrics
- We use AI to optimize send times and content
- We provide analytics on campaign performance

### 19.2 Lead Management
When managing leads through our platform:
- We store lead contact information and attributes
- We track lead interactions and engagement
- We provide lead scoring based on behavior
- We enable lead assignment and routing

### 19.3 Social Media Integration
When connecting social media accounts:
- We access only the permissions you authorize
- We store access tokens securely
- We process messages and interactions
- We retrieve analytics within platform limits
- You can revoke access at any time

### 19.4 Team Collaboration
When using team features:
- Team members can view shared conversations
- Activity logs track team member actions
- Admins can manage permissions and access
- Conversation assignments are tracked

## 20. Data Processing Addendum

For customers who are data controllers (especially B2B customers), we offer a Data Processing Addendum (DPA) that outlines:
- Our role as a data processor
- Your role as a data controller
- Sub-processors we engage
- Security measures and safeguards
- Data breach notification procedures
- Assistance with data subject requests

To request our DPA, contact legal@messageai.com.

---

**Last Updated:** ${lastUpdated}
**Version:** ${version}

This privacy policy is effective as of the date listed above and supersedes all previous versions.`;

  return {
    content,
    lastUpdated,
    version
  };
};

/**
 * Get Terms of Service content
 */
export const getTermsOfServiceContent = async (): Promise<PolicyContent> => {
  const lastUpdated = '2025-10-24';
  const version = '1.0';

  const content = `# Terms of Service

**Effective Date:** ${lastUpdated}
**Version:** ${version}

## 1. Acceptance of Terms

By accessing and using MessageAI, you accept and agree to be bound by these Terms of Service. If you do not agree, do not use the Service.

## 2. Service Description

MessageAI is a marketing automation platform that integrates with social media platforms to help businesses manage customer communications, leads, and campaigns.

## 3. User Responsibilities

You agree to:
- Provide accurate account information
- Maintain security of your account credentials
- Comply with all applicable laws and regulations
- Respect third-party rights and platform policies
- Use the Service for lawful purposes only

## 4. Prohibited Activities

You may not:
- Engage in spam or unsolicited marketing
- Violate any social media platform's terms
- Transmit malware or harmful code
- Attempt to gain unauthorized access
- Interfere with Service operation
- Resell or redistribute the Service without authorization

## 5. Intellectual Property

All content, features, and functionality are owned by MessageAI and protected by copyright, trademark, and other intellectual property laws.

## 6. Limitation of Liability

MessageAI shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.

## 7. Changes to Terms

We reserve the right to modify these terms at any time. Continued use after changes constitutes acceptance.

## 8. Contact

For questions about these Terms, contact legal@messageai.com.

---

**Last Updated:** ${lastUpdated}`;

  return {
    content,
    lastUpdated,
    version
  };
};

/**
 * Get Acceptable Use Policy content
 */
export const getAcceptableUsePolicyContent = async (): Promise<PolicyContent> => {
  const lastUpdated = '2025-10-24';
  const version = '1.0';

  const content = `# Acceptable Use Policy

**Effective Date:** ${lastUpdated}
**Version:** ${version}

## 1. Purpose

This Acceptable Use Policy outlines prohibited uses of MessageAI's services.

## 2. Prohibited Content

You may not use the Service to create, transmit, or store:
- Illegal content or content promoting illegal activities
- Content that infringes intellectual property rights
- Malware, viruses, or malicious code
- Spam or unsolicited bulk messages
- Deceptive or fraudulent content
- Content promoting violence, hatred, or discrimination
- Adult content or content harmful to minors

## 3. Prohibited Activities

You may not:
- Violate social media platform terms and policies
- Engage in harassment or abusive behavior
- Attempt to manipulate metrics or engagement artificially
- Scrape or harvest data without authorization
- Impersonate others or misrepresent affiliations
- Interfere with the Service or other users

## 4. Social Media Compliance

You must comply with all policies of connected social media platforms, including:
- Facebook Community Standards and Platform Policies
- Instagram Community Guidelines
- WhatsApp Business Policy
- Twitter Rules and Policies
- LinkedIn Professional Community Policies

## 5. Enforcement

Violations may result in:
- Warning or notification
- Temporary suspension
- Permanent account termination
- Legal action if warranted

## 6. Reporting Violations

Report violations to abuse@messageai.com.

---

**Last Updated:** ${lastUpdated}`;

  return {
    content,
    lastUpdated,
    version
  };
};
