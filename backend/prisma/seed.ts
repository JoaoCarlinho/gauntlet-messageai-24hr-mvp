import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample user
  console.log('Creating sample user...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@acmesales.com' },
    update: {},
    create: {
      email: 'admin@acmesales.com',
      password: hashedPassword,
      displayName: 'Acme Sales Admin',
      isOnline: false,
    },
  });
  console.log('✅ User created:', user.email);

  // Create sample team
  console.log('Creating sample team...');
  const team = await prisma.team.upsert({
    where: { slug: 'acme-sales-team' },
    update: {},
    create: {
      name: 'Acme Sales Team',
      slug: 'acme-sales-team',
      description: 'Sample team for testing the sales funnel features',
    },
  });
  console.log('✅ Team created:', team.name);

  // Add user to team as admin
  console.log('Adding user to team...');
  const teamMember = await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      teamId: team.id,
      userId: user.id,
      role: 'admin',
    },
  });
  console.log('✅ Team member created with role:', teamMember.role);

  // Create sample product
  console.log('Creating sample product...');
  const product = await prisma.product.upsert({
    where: { id: 'exec-coaching-001' },
    update: {},
    create: {
      id: 'exec-coaching-001',
      teamId: team.id,
      name: 'Executive Coaching Program',
      description: 'Premium 1-on-1 executive coaching for C-suite leaders and senior executives. Transform your leadership style and drive organizational success.',
      features: {
        items: [
          'Weekly 1-on-1 sessions with certified executive coach',
          '360-degree feedback assessment',
          'Personalized development plan',
          'Leadership competency framework',
          'Unlimited email support between sessions',
          'Quarterly progress reviews',
        ],
      },
      pricing: {
        model: 'subscription',
        tiers: [
          { name: 'Essential', price: 2500, currency: 'USD', period: 'month', sessions: 4 },
          { name: 'Premium', price: 4000, currency: 'USD', period: 'month', sessions: 8 },
          { name: 'Elite', price: 6500, currency: 'USD', period: 'month', sessions: 12 },
        ],
      },
      usps: {
        points: [
          'Work with coaches who have 15+ years executive experience',
          'Proven methodology used by Fortune 500 companies',
          'Guaranteed ROI or money back',
          'Flexible scheduling including evenings and weekends',
        ],
      },
    },
  });
  console.log('✅ Product created:', product.name);

  // Create sample ICP
  console.log('Creating sample ICP...');
  const icp = await prisma.iCP.upsert({
    where: { id: 'icp-executive-001' },
    update: {},
    create: {
      id: 'icp-executive-001',
      productId: product.id,
      name: 'C-Suite Executives at Mid-Market Companies',
      demographics: {
        ageRange: '35-55',
        locations: ['United States', 'Canada', 'United Kingdom'],
        jobTitles: ['CEO', 'COO', 'CFO', 'CTO', 'CMO', 'VP'],
        education: ['MBA', "Master's Degree", 'Advanced Degree'],
      },
      firmographics: {
        companySize: '100-5000 employees',
        industries: ['Technology', 'Healthcare', 'Financial Services', 'Manufacturing', 'Professional Services'],
        revenue: '$10M-$500M annual revenue',
        fundingStage: ['Series B', 'Series C', 'Profitable', 'PE-backed'],
      },
      psychographics: {
        painPoints: [
          'Struggling to scale team and operations',
          'Difficulty transitioning from founder to CEO',
          'Managing rapid growth challenges',
          'Improving executive presence and communication',
          'Building high-performing leadership teams',
        ],
        goals: [
          'Become a more effective and inspiring leader',
          'Successfully scale company to next revenue milestone',
          'Develop stronger C-suite and management team',
          'Improve work-life integration',
          'Prepare for board meetings and investor presentations',
        ],
        values: ['Excellence', 'Continuous improvement', 'Data-driven decision making', 'Team development'],
      },
      behaviors: {
        mediaConsumption: ['LinkedIn', 'Harvard Business Review', 'Wall Street Journal', 'Industry podcasts'],
        buyingTriggers: [
          'Recent promotion to C-suite',
          'Company growth challenges',
          'Board or investor feedback',
          'Peer recommendations',
        ],
        decisionMakingProcess: 'Research online → Consultation call → Compare 2-3 options → Decision within 2 weeks',
      },
    },
  });
  console.log('✅ ICP created:', icp.name);

  // Create sample campaign
  console.log('Creating sample campaign...');
  const campaign = await prisma.campaign.upsert({
    where: { id: 'campaign-q1-2025' },
    update: {},
    create: {
      id: 'campaign-q1-2025',
      teamId: team.id,
      productId: product.id,
      icpId: icp.id,
      name: 'Q1 2025 Executive Coaching Launch',
      description: 'Generate 50 qualified leads for executive coaching program',
      platforms: ['linkedin', 'facebook', 'google_ads'],
      budget: 15000,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
      status: 'active',
      targetingStrategy: {
        linkedin: {
          jobTitles: ['CEO', 'COO', 'CFO', 'CTO'],
          companySizes: ['51-200', '201-500', '501-1000', '1001-5000'],
          industries: ['Technology', 'Healthcare', 'Financial Services'],
          locations: ['United States'],
        },
        facebook: {
          interests: ['Leadership', 'Business coaching', 'Executive development'],
          ageRange: '35-55',
          locations: ['United States', 'Canada'],
        },
        google_ads: {
          keywords: [
            'executive coaching',
            'leadership coaching',
            'CEO coaching',
            'executive development program',
          ],
          targetCPA: 150,
        },
      },
    },
  });
  console.log('✅ Campaign created:', campaign.name);

  // Create sample ad creative
  console.log('Creating sample ad creative...');
  await prisma.adCreative.create({
    data: {
      campaignId: campaign.id,
      platform: 'linkedin',
      type: 'image',
      headline: 'Transform Your Leadership in 90 Days',
      body: 'Join elite executives who have elevated their leadership with our proven coaching program. 1-on-1 sessions with certified coaches who understand the C-suite challenges.',
      cta: 'Schedule Free Consultation',
      mediaUrl: 'https://example.com/ad-creative-001.jpg',
    },
  });
  console.log('✅ Ad creative created');

  // Create sample campaign metrics
  console.log('Creating sample campaign metrics...');
  const today = new Date();
  const metricsData = [
    { daysAgo: 7, impressions: 12500, clicks: 325, conversions: 8, spend: 850 },
    { daysAgo: 6, impressions: 13200, clicks: 342, conversions: 9, spend: 920 },
    { daysAgo: 5, impressions: 11800, clicks: 298, conversions: 7, spend: 780 },
    { daysAgo: 4, impressions: 14100, clicks: 368, conversions: 11, spend: 1050 },
    { daysAgo: 3, impressions: 13500, clicks: 351, conversions: 10, spend: 980 },
    { daysAgo: 2, impressions: 12900, clicks: 332, conversions: 8, spend: 890 },
    { daysAgo: 1, impressions: 15200, clicks: 394, conversions: 12, spend: 1150 },
  ];

  for (const metric of metricsData) {
    const date = new Date(today);
    date.setDate(date.getDate() - metric.daysAgo);

    await prisma.campaignMetric.create({
      data: {
        campaignId: campaign.id,
        date: date,
        impressions: metric.impressions,
        clicks: metric.clicks,
        conversions: metric.conversions,
        spend: metric.spend,
        ctr: (metric.clicks / metric.impressions) * 100,
        cpc: metric.spend / metric.clicks,
        cpa: metric.spend / metric.conversions,
        metadata: {
          platform: 'linkedin',
          campaignName: campaign.name,
        },
      },
    });
  }
  console.log('✅ Campaign metrics created for last 7 days');

  // Create sample leads
  console.log('Creating sample leads...');

  const leads = [
    {
      id: 'lead-001',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@techcorp.com',
      phone: '+1-555-0101',
      company: 'TechCorp Solutions',
      jobTitle: 'CEO',
      status: 'qualified',
      source: 'linkedin',
      qualificationScore: 85,
    },
    {
      id: 'lead-002',
      name: 'Michael Chen',
      email: 'mchen@healthplus.com',
      phone: '+1-555-0102',
      company: 'HealthPlus Medical',
      jobTitle: 'COO',
      status: 'contacted',
      source: 'facebook',
      qualificationScore: 72,
    },
    {
      id: 'lead-003',
      name: 'Jennifer Rodriguez',
      email: 'j.rodriguez@finserve.com',
      phone: '+1-555-0103',
      company: 'Financial Services Inc',
      jobTitle: 'CFO',
      status: 'new',
      source: 'linkedin',
      qualificationScore: 90,
    },
    {
      id: 'lead-004',
      name: 'David Kim',
      email: 'dkim@innovate.io',
      phone: '+1-555-0104',
      company: 'Innovate Software',
      jobTitle: 'CTO',
      status: 'discovery',
      source: 'google_ads',
      qualificationScore: 78,
    },
    {
      id: 'lead-005',
      name: 'Emily Watson',
      email: 'ewatson@marketpro.com',
      phone: '+1-555-0105',
      company: 'MarketPro Agency',
      jobTitle: 'CMO',
      status: 'closed_won',
      source: 'linkedin',
      qualificationScore: 95,
    },
  ];

  for (const leadData of leads) {
    // Split name into firstName and lastName
    const nameParts = leadData.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const lead = await prisma.lead.create({
      data: {
        id: leadData.id,
        firstName,
        lastName,
        email: leadData.email,
        phone: leadData.phone,
        company: leadData.company,
        jobTitle: leadData.jobTitle,
        status: leadData.status,
        source: leadData.source,
        qualificationScore: leadData.qualificationScore,
        teamId: team.id,
        campaignId: campaign.id,
        assignedUserId: leadData.status !== 'new' ? user.id : undefined,
        rawData: {
          industry: 'Technology',
          companySize: '200-500',
          budget: '$2,500-5,000/month',
        },
      },
    });
    console.log(`✅ Lead created: ${leadData.name} (${lead.status})`);

    // Add activity for non-new leads
    if (leadData.status !== 'new') {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          type: 'note',
          description: `Initial outreach completed. ${leadData.name} is interested in ${leadData.status === 'closed_won' ? 'and has enrolled in' : 'learning more about'} the executive coaching program.`,
        },
      });
    }
  }

  // Create a sample discovery session for one lead
  console.log('Creating sample discovery session...');
  const discoveryLead = await prisma.lead.findFirst({
    where: { status: 'qualified', firstName: 'David' },
  });

  if (discoveryLead) {
    await prisma.discoverySession.create({
      data: {
        leadId: discoveryLead.id,
        transcript: {
          messages: [
            { role: 'assistant', content: 'Hello! I\'m here to learn about your leadership development needs. What challenges are you currently facing as a leader?' },
            { role: 'user', content: 'I\'m struggling to scale my team effectively as we grow. We went from 50 to 200 employees in 18 months.' },
            { role: 'assistant', content: 'Rapid growth like that definitely brings unique challenges. What specific areas of team scaling are most difficult for you right now?' },
            { role: 'user', content: 'Mainly delegating effectively and developing other leaders. I\'m still too involved in day-to-day operations.' },
          ],
        },
        summary: 'CTO of growing software company facing delegation and leadership development challenges. Strong fit for executive coaching program focused on scaling leadership. Timeline: immediate. Budget: approved by board.',
        score: 78,
        status: 'completed',
        completedAt: new Date(),
      },
    });
    console.log('✅ Discovery session created');
  }

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - User: ${user.email} (password: password123)`);
  console.log(`  - Team: ${team.name}`);
  console.log(`  - Product: ${product.name}`);
  console.log(`  - ICP: ${icp.name}`);
  console.log(`  - Campaign: ${campaign.name}`);
  console.log(`  - Leads: ${leads.length} created`);
  console.log(`  - Campaign metrics: 7 days of data`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
