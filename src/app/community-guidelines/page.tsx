import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "Our community guidelines outline the expectations for reviews, comments, and interactions on Dark Point. We believe in creating a respectful and helpful environment for all gamers.",
};

const guidelines = [
  {
    title: "Be Respectful",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    content: [
      "Treat others the way you would like to be treated. Be kind, courteous, and considerate in all interactions.",
      "Avoid personal attacks, harassment, bullying, or any form of discrimination based on race, gender, religion, sexual orientation, or any other characteristic.",
      "Respect differing opinions and perspectives. Healthy debate is encouraged, but always remain civil.",
    ],
  },
  {
    title: "Write Authentic Reviews",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    content: [
      "Only review products you have actually purchased and used. Authentic experiences help other customers make informed decisions.",
      "Be honest and balanced in your reviews. Include both positives and areas for improvement.",
      "Do not post fake reviews, paid reviews (unless disclosed), or reviews designed to manipulate ratings.",
    ],
  },
  {
    title: "Stay On Topic",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    content: [
      "Keep reviews focused on the product and your experience with it.",
      "Avoid discussing unrelated topics, personal matters, or issues not related to the product or service.",
      "Questions about products should be directed to our customer support team rather than posted in reviews.",
    ],
  },
  {
    title: "No Inappropriate Content",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    content: [
      "Do not post content that is obscene, vulgar, or contains excessive profanity.",
      "Avoid sharing graphic, violent, or sexually explicit material.",
      "Do not post content that promotes illegal activities or harmful behaviour.",
    ],
  },
  {
    title: "Protect Privacy",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    content: [
      "Do not share personal information about yourself or others, including names, addresses, phone numbers, or email addresses.",
      "Respect the privacy of Dark Point staff and other customers.",
      "Do not post private communications or confidential information.",
    ],
  },
  {
    title: "No Spam or Promotion",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    content: [
      "Do not use reviews to advertise other products, services, or websites.",
      "Avoid posting repetitive content or spam.",
      "Do not post promotional codes, referral links, or affiliate links in reviews.",
    ],
  },
];

const reportReasons = [
  {
    reason: "Off Topic",
    description: "Review is not about the product or contains unrelated content.",
  },
  {
    reason: "Inappropriate",
    description: "Contains disrespectful, hateful, or obscene content.",
  },
  {
    reason: "Fake Review",
    description: "Review appears to be paid for, fake, or not from a genuine customer.",
  },
  {
    reason: "Spam",
    description: "Contains promotional content, advertisements, or repetitive posts.",
  },
  {
    reason: "Privacy Violation",
    description: "Contains personal information or private communications.",
  },
];

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative py-20 bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)]">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider mb-6">
            Community Guidelines
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Our community guidelines help create a positive, helpful, and respectful environment 
            for all gamers. Please review them before posting reviews or interacting with others.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Introduction */}
          <div className="nk-box-3">
            <h2 className="text-2xl font-heading uppercase tracking-wider mb-4">
              Welcome to the Dark Point Community
            </h2>
            <p className="text-white/80 leading-relaxed mb-4">
              At Dark Point, we&apos;re passionate about gaming and building a community of like-minded 
              enthusiasts. Whether you&apos;re sharing your experience with a product, helping fellow 
              gamers make purchasing decisions, or engaging with our content, we ask that you follow 
              these guidelines to ensure a positive experience for everyone.
            </p>
            <p className="text-white/80 leading-relaxed">
              These guidelines apply to all user-generated content on our platform, including product 
              reviews, comments, and any other form of community interaction.
            </p>
          </div>

          {/* Guidelines */}
          <div className="space-y-6">
            {guidelines.map((guideline, index) => (
              <div key={index} className="nk-box-3">
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-[var(--color-main-1)] flex-shrink-0">
                    {guideline.icon}
                  </div>
                  <h3 className="text-xl font-heading uppercase tracking-wider">
                    {guideline.title}
                  </h3>
                </div>
                <ul className="space-y-3 pl-12">
                  {guideline.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-white/80 leading-relaxed relative">
                      <span className="absolute -left-6 text-[var(--color-main-1)]">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Reporting Section */}
          <div>
            <h2 className="text-2xl font-heading uppercase tracking-wider mb-6 text-center">
              Reporting Violations
            </h2>
            <div className="nk-box-3">
              <p className="text-white/80 leading-relaxed mb-6">
                If you encounter content that violates these guidelines, please report it using the 
                &quot;Report&quot; button on the review. When reporting, you&apos;ll be asked to select one of the 
                following reasons:
              </p>
              
              <div className="space-y-4">
                {reportReasons.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-white/5 rounded">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-main-1)] mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">{item.reason}</h4>
                      <p className="text-sm text-white/60">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-white/80 leading-relaxed mt-6">
                Our moderation team reviews all reports within 24-48 hours. Content that violates 
                our guidelines will be removed, and repeat offenders may have their accounts suspended.
              </p>
            </div>
          </div>

          {/* Consequences Section */}
          <div>
            <h2 className="text-2xl font-heading uppercase tracking-wider mb-6 text-center">
              Consequences of Violations
            </h2>
            <div className="nk-box-3">
              <p className="text-white/80 leading-relaxed mb-4">
                Violations of these community guidelines may result in the following actions:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-white/80">
                  <span className="text-[var(--color-main-1)] font-bold">1.</span>
                  <span><strong>Warning:</strong> First-time or minor violations may result in a warning.</span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <span className="text-[var(--color-main-1)] font-bold">2.</span>
                  <span><strong>Content Removal:</strong> Violating content will be removed from the platform.</span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <span className="text-[var(--color-main-1)] font-bold">3.</span>
                  <span><strong>Temporary Suspension:</strong> Repeated violations may result in temporary account suspension.</span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <span className="text-[var(--color-main-1)] font-bold">4.</span>
                  <span><strong>Permanent Ban:</strong> Severe or persistent violations may result in permanent account termination.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Section */}
          <div className="text-center">
            <div className="nk-box-3">
              <h2 className="text-xl font-heading uppercase tracking-wider mb-4">
                Questions or Concerns?
              </h2>
              <p className="text-white/80 mb-6">
                If you have any questions about these guidelines or need to report a serious issue, 
                please don&apos;t hesitate to contact our support team.
              </p>
              <Link href="/contact" className="nk-btn nk-btn-primary">
                <span className="nk-btn-inner" />
                <span className="nk-btn-content">Contact Support</span>
              </Link>
            </div>
          </div>

          {/* Last Updated */}
          <p className="text-center text-white/40 text-sm">
            Last updated: December 2024
          </p>
        </div>
      </div>
    </div>
  );
}

