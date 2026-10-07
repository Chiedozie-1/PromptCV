# ResuMate Website — Master Development Specification

**Project:** ResuMate  
**Scope:** Public marketing website only  
**Status:** Initial development specification  
**Primary stack:** HTML5 + CSS3 + Bootstrap 5 + Vanilla JavaScript

---

## 1. Project Overview

ResuMate is an AI-powered resume and career platform designed to help users create, improve, optimize, and tailor professional resumes.

This specification covers **only the public-facing marketing website** at `resumate.com`.

The authenticated product/web application is intentionally **out of scope** for this phase and will be designed separately later at a subdomain such as `app.resumate.com`.

The public website's job is to explain the product, establish trust, attract organic search traffic, showcase the product, and convert visitors into users of the future web application.

---

## 2. Product Positioning

**ResuMate is an AI-powered resume platform that helps people create professional, ATS-friendly resumes and tailor them to the jobs they want.**

The website should communicate three core ideas:

1. Build a professional resume.
2. Improve it with AI.
3. Tailor and optimize it for specific jobs.

### Primary website conversion goal

Convert visitors into users of the ResuMate application.

Primary CTA: **Create Your Resume**

Secondary CTA: **Log In**

---

## 3. Website vs Web App Boundary

This distinction is mandatory.

### Public website — `resumate.com`

Contains:

- Marketing content
- Product information
- Features
- How it works
- Templates
- Pricing
- Resources
- Blog
- Resume examples
- Career guides
- About
- Contact
- FAQs
- Legal pages
- SEO content

### Future web app — `app.resumate.com`

Will contain:

- Authentication
- Dashboard
- Resume builder
- Resume editor
- AI writing assistant
- ATS analysis
- Job-description analysis
- Resume tailoring
- Resume versions
- Saved resumes
- Applications
- User settings
- PDF generation/export

**Do not implement the web app in this website project.**

Recommended future CTA destinations:

`resumate.com` → `app.resumate.com/signup`

`resumate.com` → `app.resumate.com/login`

---

## 4. Technology Requirements

Use ONLY:

- HTML5
- CSS3
- Bootstrap 5
- Vanilla JavaScript

Do NOT introduce:

- React
- Next.js
- Vue
- Angular
- Svelte
- Tailwind CSS
- TypeScript
- jQuery
- Other frontend frameworks

Bootstrap is the responsive/layout foundation. Custom CSS must provide the ResuMate visual identity.

---

## 5. Suggested Project Structure

```text
resumate-website/
│
├── RESUMATE_WEBSITE_SPEC.md
├── index.html
│
├── pages/
│   ├── features.html
│   ├── how-it-works.html
│   ├── templates.html
│   ├── pricing.html
│   ├── about.html
│   ├── contact.html
│   ├── faq.html
│   ├── resources.html
│   ├── resume-examples.html
│   ├── privacy.html
│   ├── terms.html
│   └── cookies.html
│
├── css/
│   ├── style.css
│   ├── components.css
│   └── responsive.css
│
├── js/
│   ├── main.js
│   ├── navbar.js
│   ├── animations.js
│   └── forms.js
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── robots.txt
├── sitemap.xml
└── README.md
```

The structure may be adjusted if there is a good technical reason, but keep the project simple.

---

## 6. Brand Identity

### Brand name

**ResuMate**

Always use the capitalization **ResuMate**.

Do not use Resume AI, ResumeAI, or Resumate as the primary brand name.

### Visual reference

The uploaded “Resume AI” image is a **visual/design reference only**.

It may inspire:

- Typography
- Color direction
- Layout
- Overall atmosphere
- UI treatment
- Product presentation

**Do NOT copy the text or marketing copy from the reference image.**

All ResuMate copy must be original.

---

## 7. Brand Personality

ResuMate should feel:

- Intelligent
- Premium
- Modern
- Human
- Confident
- Trustworthy
- Career-focused
- Technically capable without constantly emphasizing “AI”

Avoid making ResuMate look like a generic AI startup.

---

## 8. Visual Design Direction

### Overall aesthetic

Premium editorial SaaS.

Use:

- Deep teal / near-black backgrounds
- Warm off-white text
- Mint/teal accent color
- Elegant high-contrast serif display typography
- Clean modern sans-serif UI typography
- Rounded modern UI elements
- Subtle borders
- Refined spacing
- Soft shadows where appropriate
- Minimal, purposeful motion

Avoid:

- Generic purple AI gradients
- Excessive neon
- Robot illustrations
- Excessive glassmorphism
- Cartoon-style visuals
- Generic corporate stock-photo aesthetics
- Excessive animations
- Too many accent colors

---

## 9. Initial Design Tokens

Starting values; refine during implementation if necessary.

```css
:root {
    --resumate-bg: #03191C;
    --resumate-bg-secondary: #062426;
    --resumate-text: #F2F5F1;
    --resumate-muted: #91A7A7;
    --resumate-accent: #48E5C2;
    --resumate-accent-light: #67F0D0;
    --resumate-border: #16383A;
}
```

Centralize reusable colors rather than scattering raw values throughout CSS.

---

## 10. Typography

Use two complementary families:

### Display typography

Elegant, high-contrast serif for:

- Hero headings
- Major section headings
- Brand expression
- Important marketing statements

### Supporting/UI typography

Clean modern sans-serif for:

- Navigation
- Buttons
- Labels
- Body copy
- Forms
- Cards
- Metadata
- Footer

The serif/sans contrast is a defining part of ResuMate's visual identity.

---

## 11. Logo / Brand Mark

The brand should have:

- ResuMate wordmark
- Standalone small brand icon for favicon/PWA/social use

A subtle AI/transformation/spark concept may be explored, but do not use a generic emoji as the actual brand icon.

---

## 12. SEO Strategy

SEO is a major requirement.

### Primary homepage topic

**AI Resume Builder**

### Supporting topics

- AI resume builder
- resume builder
- resume maker
- ATS-friendly resume
- ATS resume builder
- resume templates
- professional resume templates
- AI resume writer
- resume writing
- resume optimization
- resume checker
- ATS resume checker
- resume keywords
- job-specific resume
- resume examples
- professional resume examples
- how to write a resume

Do not force every keyword onto the homepage. Build dedicated content around appropriate topics.

---

## 13. Homepage SEO Positioning

Recommended primary positioning:

**AI Resume Builder**

### Working hero

Eyebrow:

`AI RESUME BUILDER`

H1:

`Build a Professional Resume With AI.`

Supporting copy:

`Create an ATS-friendly resume tailored to your experience and career goals. ResuMate helps you write stronger content, optimize your resume, and prepare for the jobs you want.`

Primary CTA:

`Create Your Resume`

Secondary CTA:

`Explore Templates`

This is a starting point and may be refined during implementation.

---

## 14. Website Sitemap

### Core pages

```text
/
 /features
 /how-it-works
 /templates
 /pricing
 /about
 /contact
 /faq
 /resources
 /resume-examples
 /blog
 /privacy
 /terms
 /cookies
```

### Future SEO/content expansion

```text
/ats-resume
/resume-writer
/resume-templates
/resume-examples/[role]
/resume-templates/[role]
/career-guides
/blog/[article]
/blog/category/[category]
```

Do not build every expansion page immediately. Establish an architecture that can grow.

---

## 15. Homepage Structure

Recommended sequence:

```text
Navbar
↓
Hero
↓
Product / Resume Visual
↓
Key Benefits
↓
Problem → Solution
↓
How ResuMate Works
↓
AI Resume Writing
↓
ATS Optimization
↓
Resume Templates
↓
Resume Examples
↓
Testimonials / Trust
↓
Pricing Preview
↓
FAQ
↓
Final CTA
↓
Footer
```

The exact number of sections can change after visual review.

---

## 16. Homepage Content Direction

### Hero

Focus on:

- AI resume creation
- Professional output
- ATS-friendly formatting
- Career goals
- Clear CTA

Do not make unsupported claims such as guaranteed interviews or guaranteed jobs.

### Problem / Solution

Working direction:

**Writing a resume shouldn't be this difficult.**

Explain common difficulties:

- Writing strong experience descriptions
- Choosing a professional format
- Identifying relevant keywords
- Tailoring resumes to individual jobs
- Keeping resumes concise

Then introduce ResuMate as the solution.

### Feature areas

**AI Resume Writing**  
Turn experience into clear, professional resume content with AI assistance.

**ATS Resume Optimization**  
Identify important job-specific keywords and improve resume content and structure.

**Job-Specific Resume Tailoring**  
Compare a resume with a job description and identify opportunities to better align the resume.

**Professional Resume Templates**  
Choose clean, professional templates for different industries and career stages.

---

## 17. How It Works

Suggested three-step explanation:

### 01 — Build your resume

Add experience, education, skills, projects, and other professional information.

### 02 — Improve it with AI

Get help writing stronger bullet points, summaries, and descriptions.

### 03 — Tailor it for the job

Add a job description and use AI to identify relevant keywords and opportunities to improve the resume.

CTA:

`Create My Resume`

---

## 18. ATS Section

Suggested heading:

**Is your resume ready for an ATS?**

Explain that many employers use applicant tracking systems to organize and screen applications.

Future ResuMate functionality can help users:

- Identify relevant job-specific keywords
- Improve resume content
- Create clear professional formatting
- Compare a resume with a job description

Avoid claims such as “beat every ATS” or guaranteed ATS approval.

---

## 19. Templates Section

Suggested heading:

**Professional resume templates for every career stage**

Potential categories:

- Modern
- Professional
- Executive
- Technical
- Student
- Minimal
- Creative

The public website showcases templates. Actual selection and resume creation happen in the future application.

---

## 20. Resume Examples / SEO Content

Potential examples:

- Software Engineer Resume
- Frontend Developer Resume
- Backend Developer Resume
- Data Analyst Resume
- Product Manager Resume
- Marketing Resume
- Accountant Resume
- Student Resume
- Graduate Resume
- Project Manager Resume

Future example pages should provide useful original information rather than thin SEO content.

---

## 21. Resources / Blog

Potential categories:

- Resume
- Career
- Job Search
- ATS
- Interviews
- AI & Careers

Potential content:

- How to write a resume
- How ATS systems work
- How to tailor a resume to a job
- Resume keyword guides
- Resume examples
- Career development guides
- Interview preparation

Content should be useful to humans first.

---

## 22. Pricing

Design the site so pricing can evolve.

Potential plans:

### Free

Basic resume creation and selected features.

### Pro

Advanced AI assistance, ATS analysis, job tailoring, premium templates, and additional resume versions.

### Premium / Future

Advanced career and job-search functionality.

Do not hard-code pricing claims until officially decided.

---

## 23. About Page

Communicate:

- Why ResuMate exists
- Problem being solved
- Product philosophy
- Mission
- Human-centered approach to AI

AI should be positioned as an assistant rather than an authority controlling the user's career documents.

---

## 24. Contact Page

Include:

- Name
- Email
- Subject/category
- Message
- Submit button

Potential categories:

- General
- Support
- Business
- Partnership
- Press
- Feedback

Implement client-side validation. Real backend/email integration can be added later.

---

## 25. FAQ

Potential questions:

- What is ResuMate?
- Is ResuMate free?
- What is an ATS?
- Can ResuMate create a resume from scratch?
- Can I upload an existing resume?
- Can I tailor my resume to a job?
- Can I download my resume as a PDF?
- Is my information secure?
- Do I need an account?

Do not make unsupported legal/security promises.

---

## 26. Authentication Links

Authentication belongs to the future web app.

Recommended destinations:

```text
Create Your Resume
→ app.resumate.com/signup

Log In
→ app.resumate.com/login
```

For local development, use configurable placeholder URLs or clearly marked development links rather than hard-coding production URLs everywhere.

---

## 27. Navigation

Suggested desktop navigation:

```text
ResuMate

Features
How It Works
Templates
Pricing
Resources

Log In
[Create Resume]
```

About and Contact may live in the footer or secondary navigation.

Mobile should use a clean Bootstrap navbar/collapse or offcanvas navigation.

---

## 28. Footer

### Product

- Features
- Templates
- Pricing
- How It Works

### Resources

- Blog
- Resume Examples
- Career Guides
- FAQ

### Company

- About
- Contact

### Legal

- Privacy
- Terms
- Cookies

Also include:

- ResuMate brand mark
- Copyright
- Social links only when official accounts exist

Do not invent social URLs.

---

## 29. Responsive Requirements

Design mobile-first.

Test at:

- Small mobile
- Large mobile
- Tablet
- Laptop
- Desktop
- Large desktop

Pay particular attention to:

- Hero
- Navigation
- Resume preview
- Feature cards
- Pricing
- Template previews
- Footer
- Typography
- CTA buttons

Do not simply shrink desktop layouts. Reflow them appropriately.

---

## 30. Accessibility

Use semantic HTML5:

- `header`
- `nav`
- `main`
- `section`
- `article`
- `footer`

Requirements:

- Logical heading hierarchy
- Accessible navigation
- Keyboard navigation
- Visible focus states
- Proper button/link semantics
- Meaningful alt text
- Sufficient color contrast
- Form labels
- Error messaging
- Reduced-motion consideration

Do not use clickable `div`s where a button or link is appropriate.

---

## 31. Performance

Requirements:

- Optimize images
- Avoid unnecessary JavaScript
- Lazy-load below-the-fold images where appropriate
- Use efficient CSS
- Avoid excessive third-party scripts
- Keep DOM complexity reasonable
- Use appropriate image formats
- Avoid large unoptimized video backgrounds

Do not add libraries merely because they are available.

---

## 32. Animation

Animation should be subtle and purposeful.

Possible effects:

- Navbar transitions
- Hero entrance
- Fade/slide reveals
- Card hover effects
- Button micro-interactions
- Resume preview movement
- Smooth scrolling

Avoid excessive parallax, constant motion, distracting backgrounds, and animation that harms accessibility/performance.

Respect `prefers-reduced-motion`.

---

## 33. JavaScript Guidelines

Use vanilla JavaScript for:

- Mobile navigation
- Dropdowns
- FAQ accordion
- Form validation
- Smooth interactions
- Scroll effects
- Animation triggers
- Template interactions
- Pricing toggles if needed
- UI state

Keep JavaScript modular. Avoid one enormous `main.js` file as the project grows.

---

## 34. Bootstrap Guidelines

Use Bootstrap 5 for:

- Grid
- Containers
- Breakpoints
- Spacing utilities
- Responsive navigation
- Buttons where useful
- Accordion
- Modal
- Forms
- Responsive utilities

Do not allow default Bootstrap colors, typography, shadows, or component styling to define the final ResuMate design.

---

## 35. Component Reuse

Build reusable patterns for:

- Navbar
- Footer
- CTA button
- Section heading
- Feature card
- Testimonial card
- Template card
- FAQ item
- Pricing card
- Resume preview
- Blog card

Keep visual patterns consistent.

---

## 36. SEO Technical Requirements

Every indexable page should have:

```html
<title></title>
<meta name="description">
<link rel="canonical">
```

Where appropriate include:

- Open Graph metadata
- Social sharing metadata
- Structured data/schema
- Breadcrumbs
- Internal links

Create:

```text
robots.txt
sitemap.xml
```

Use semantic URLs such as:

```text
/resume-examples/software-engineer
```

rather than query-heavy URLs.

---

## 37. Content Rules

All website copy must be original.

The uploaded visual reference is not a source of copy.

Do not copy its:

- Headlines
- Taglines
- Feature descriptions
- Marketing phrases
- Paragraphs
- CTA wording

Write original ResuMate copy aligned with this product strategy.

---

## 38. Claims & Trust

Do not make guarantees.

Avoid:

- Guaranteed interviews
- Guaranteed job offers
- Guaranteed ATS approval
- 100% ATS compatibility
- Guaranteed employment

Prefer:

- ATS-friendly
- Helps optimize
- Designed to support
- Helps identify
- Helps improve
- Built for

---

## 39. Security / Privacy Direction

The site will eventually connect users to a product handling career information.

Provide appropriate:

- Privacy Policy
- Terms of Service
- Cookie Policy
- Secure external links
- HTTPS in production

Do not request sensitive resume information unnecessarily on the marketing site.

---

## 40. Analytics

Eventually measure:

- Homepage visits
- CTA clicks
- Create Resume clicks
- Login clicks
- Template clicks
- Pricing views
- Blog traffic
- Resume example traffic
- Contact submissions
- Signup referrals

Do not add analytics until the appropriate privacy/consent approach is decided.

---

## 41. Development Order

### Phase 1 — Foundation

1. Project structure
2. Bootstrap setup
3. CSS design tokens
4. Typography
5. Global styles
6. Navbar
7. Footer
8. Buttons
9. Reusable components

### Phase 2 — Homepage

1. Navbar
2. Hero
3. Resume visual
4. Benefits
5. Problem/solution
6. How it works
7. AI writing section
8. ATS section
9. Templates
10. Resume examples
11. Trust/testimonials
12. Pricing preview
13. FAQ
14. Final CTA
15. Footer

### Phase 3 — Core pages

Build:

- Features
- How It Works
- Templates
- Pricing
- About
- Contact
- FAQ
- Resources
- Resume Examples

### Phase 4 — Legal/SEO

Build:

- Privacy
- Terms
- Cookies
- robots.txt
- sitemap.xml
- Metadata
- Schema where appropriate

### Phase 5 — Polish

- Responsive testing
- Accessibility review
- Performance optimization
- Browser testing
- Link testing
- SEO review
- Animation refinement

---

## 42. MVP Website Completion Criteria

The initial website is complete when it has:

- Polished responsive homepage
- ResuMate branding
- Working navigation
- Primary marketing pages
- Original SEO-oriented copy
- Template showcase
- Resume examples section
- FAQ
- Pricing presentation
- Contact page
- Legal pages
- Mobile navigation
- Responsive layouts
- Accessible structure
- SEO metadata
- Sitemap
- Robots file
- Functional CTA links to future app destination
- No frontend framework other than Bootstrap
- No copied content from the visual reference

---

## 43. Out of Scope

Do not build these in the marketing website project:

- Resume editor
- AI API integration
- User dashboard
- User accounts
- Resume database
- ATS scoring engine
- Job matching engine
- Job application tracker
- PDF resume generation
- User file storage
- Payment processing
- Native mobile app
- Full PWA application experience

These belong to the future `app.resumate.com` project.

---

## 44. Development Rules for Claude / Coding Agent

Before changing code:

1. Read this entire specification.
2. Inspect the existing project structure.
3. Do not overwrite working files unnecessarily.
4. Follow the established brand system.
5. Use only HTML5, CSS3, Bootstrap 5 and vanilla JavaScript.
6. Do not introduce new frameworks without explicit approval.
7. Keep code readable and maintainable.
8. Reuse components/patterns where practical.
9. Keep SEO in mind when creating every page.
10. Keep accessibility in mind.
11. Test responsive behavior.
12. Do not invent unapproved product functionality.
13. Do not copy text from the visual reference.
14. Do not build the web app yet.
15. If a major product decision is unclear, flag it instead of silently inventing a feature.

---

## 45. Current Implementation Instruction

The first coding task is:

> **Build the ResuMate homepage using this specification.**

Start with:

- Global design system
- Navbar
- Hero
- Resume/product visual
- Key benefit section
- Initial homepage sections
- Footer

Do not build every page in one step.

After the homepage is reviewed and approved, continue with the remaining website pages.

---

## 46. Future Architecture

After the public website is complete:

```text
resumate.com
    │
    │ public marketing site
    │
    ▼
app.resumate.com
    │
    │ authenticated application
    │
    ├── Authentication
    ├── Dashboard
    ├── Resume Builder
    ├── AI Writing
    ├── ATS Analysis
    ├── Job Tailoring
    ├── Resume Versions
    ├── Templates
    ├── Applications
    └── Settings
```

The application will be specified separately.

---

## 47. Product Philosophy

> **AI should assist the user, not replace their judgment.**

ResuMate should help users express their actual experience more clearly and strategically.

Do not encourage users to invent:

- Experience
- Skills
- Qualifications
- Achievements
- Employment history

The product should improve presentation and relevance while preserving truthfulness.

---

## 48. Final Working Brand Statement

**ResuMate helps job seekers create professional, ATS-friendly resumes with AI assistance and tailor them to the opportunities they want.**

Working homepage headline:

**Build a Professional Resume With AI.**

Working primary CTA:

**Create Your Resume**

These are working copy decisions and may be refined during visual implementation while remaining aligned with the SEO and product strategy.

---

## End of Specification
