#!/usr/bin/env python3
"""
Generate detailed interview answers for PM and UX question banks.
Programmatically generates level-appropriate answers.
"""
import json
import os
import re

BASE = "/home/nhatbang/EXE101/PRJ/docs/crawl_data"

def generate_pm_answer(question, level):
    """Generate a product manager interview answer based on question and level."""
    q = question.lower()
    
    # === LEVEL-BASED INTROS ===
    if level == "Intern":
        prefix = ""
    elif level == "Fresher":
        prefix = ""
    elif level == "Junior":
        prefix = ""
    elif level == "Middle":
        prefix = ""
    else:  # Senior
        prefix = ""
    
    # === QUESTION-SPECIFIC ANSWERS ===
    
    # Role / Definition questions
    if "role of a product manager" in q:
        return "A Product Manager defines what to build and why, balancing user needs, business goals, and technical feasibility. PMs conduct user research to identify problems, prioritize features using frameworks like RICE, write requirements, align cross-functional teams, and measure success through metrics like retention and engagement."
    if "difference between a product manager and a project manager" in q:
        return "A Product Manager focuses on strategy and the product vision — deciding what to build and why based on user needs and business value. A Project Manager focuses on execution — managing timelines, resources, and tasks to deliver the defined scope on schedule. PMs own the 'what' and 'why'; Project Managers own the 'how' and 'when'."
    if "difference between a pm and a po" in q or "product manager and a product owner" in q:
        return "A Product Manager owns the product strategy, market analysis, user research, and long-term vision. A Product Owner is a Scrum-specific role focused on backlog management, writing user stories, and sprint-level prioritization. In many organizations these roles overlap, but when separate, the PM looks outward (market/users) while the PO looks inward (team/execution)."
    if "product lifecycle" in q:
        return "The product lifecycle has four main stages: Introduction (launching and gaining early traction), Growth (scaling with increasing demand and market share), Maturity (market saturation with focus on optimization and retention), and Decline (falling demand requiring pivot, cost optimization, or sunset). Each stage demands different strategies for pricing, marketing, and feature development."
    
    # MVP
    if "mvp" in q or "minimum viable product" in q:
        if level in ("Senior", "Middle"):
            return "An MVP is the smallest feature set that delivers enough value to early customers to validate core business hypotheses. It's not a half-baked product — it must solve the core problem reliably. I define MVP by identifying the riskiest assumption (e.g., will users pay? will they use it daily?) and building only what's needed to test that assumption with real usage data."
        else:
            return "An MVP (Minimum Viable Product) is the smallest version of a product that can be released to start learning from real users. It includes only the essential features needed to solve the core problem. The goal is to validate demand, gather feedback, and iterate quickly without wasting resources on unnecessary features."
    
    # User stories
    if "user stor" in q:
        return "A user story describes a feature from the end-user perspective using the format: 'As a [user role], I want [goal] so that [reason].' For example: 'As a frequent shopper, I want to save my payment info so that I can check out faster.' Good stories follow INVEST: Independent, Negotiable, Valuable, Estimable, Small, and Testable."
    if "invest" in q:
        return "INVEST stands for Independent (stories can be developed in any order), Negotiable (details emerge through conversation), Valuable (delivers clear user/business value), Estimable (team can size it), Small (fits in one sprint), and Testable (clear acceptance criteria exist). I use this checklist during backlog refinement to improve story quality."
    if "acceptance criteria" in q:
        return "Acceptance criteria define the conditions a feature must meet to be accepted. I write them using the Given/When/Then format from Behavior-Driven Development: 'Given [context], when [action], then [expected result].' For example: 'Given a user is on the checkout page, when they enter an invalid coupon code, then they see an error message explaining why the code is invalid.'"
    
    # Agile / Scrum
    if "agile" in q and "benefit" in q:
        return "Agile methodology breaks development into small, iterative sprints (1-4 weeks) with continuous feedback loops. Benefits include: faster time-to-market through incremental delivery, adaptability to changing requirements, improved quality via continuous testing, higher team morale through self-organization, and better stakeholder alignment through regular demos and retrospectives."
    if "scrum" in q and "ceremon" not in q:
        return "Scrum is an Agile framework with fixed-length sprints, defined roles (Product Owner, Scrum Master, Development Team), and ceremonies: Sprint Planning (selecting backlog items), Daily Standup (15-min sync), Sprint Review (demo to stakeholders), and Sprint Retrospective (team process improvement). It provides structure for iterative delivery and continuous improvement."
    if "sprint planning" in q:
        return "Sprint Planning kicks off each sprint where the team selects backlog items to work on based on priority and capacity. The team defines a sprint goal, breaks work into tasks, and estimates effort. The PM presents priority items with context, and the team commits to a realistic scope. The output is a sprint backlog with a clear goal for the iteration."
    if "retrospective" in q or "sprint retro" in q:
        return "A sprint retrospective is a blameless team reflection held after each sprint. I facilitate by asking: what went well, what could be improved, and what actions will we take? Common formats include Start/Stop/Continue and Mad/Sad/Glad. The key is identifying 1-3 concrete improvement actions with owners and following up in the next sprint to ensure accountability."
    
    # Roadmap
    if "roadmap" in q and "create" in q:
        return "I create a product roadmap by: (1) aligning with company OKRs and product strategy, (2) gathering inputs from user research, analytics, and stakeholders, (3) prioritizing initiatives using RICE, (4) organizing into Now/Next/Later time horizons, (5) balancing big bets with incremental improvements, and (6) socializing with teams for feedback. I use tools like Productboard or Aha! for visualization."
    if "roadmap" in q and "prioritize" in q:
        return "I prioritize features on a roadmap by scoring each against strategic goals using RICE (Reach, Impact, Confidence, Effort). Features that directly support quarterly OKRs and have high RICE scores go on the near-term horizon. I also consider dependencies, technical constraints, and stakeholder urgency, and I maintain a 'later' bucket for important but non-urgent items."
    
    # Metrics / KPIs
    if "kpi" in q or "kpis" in q:
        return "KPIs (Key Performance Indicators) are measurable values tracking progress toward business objectives. I follow the SMART framework: Specific, Measurable, Achievable, Relevant, Time-bound. For a social media app, key KPIs include DAU/MAU (stickiness), retention rate (Day 1/7/30), viral coefficient (K-factor), time spent per session, and engagement rate (likes/shares per user)."
    if "north star metric" in q or "north star" in q:
        return "The North Star Metric is the single metric that best captures the core value your product delivers to users. It aligns the entire organization around a shared measure of success. For example, Airbnb uses 'Nights Booked' because it reflects successful host-guest connections. Spotify uses 'Time Spent Listening.' A good North Star is leading (predicts success), understandable, and actionable."
    if "product-market fit" in q or "pmf" in q or "product market fit" in q:
        if level in ("Senior", "Middle"):
            return "Product-market fit is when a product satisfies strong market demand. I measure it using multiple signals: the Sean Ellis Test (40%+ would be 'very disappointed' without it), cohort retention curves that flatten over time (indicating habit), organic growth exceeding 50% of new sign-ups, and consistently high NPS. PMF is not binary — it exists on a spectrum and needs continuous nurturing."
        else:
            return "Product-market fit happens when a product solves a real problem for a sizable market. Signs include strong organic growth, high user retention, positive NPS, and users expressing disappointment if the product disappeared. I measure it using the Sean Ellis test: if 40%+ of users say they'd be 'very disappointed' without the product, you likely have PMF."
    
    # Frameworks
    if "rice" in q and "scor" not in q:
        return "RICE scores features by: Reach (users affected per time period), Impact (effect on key metric, scored 1-5), Confidence (certainty in estimates, 0-100%), and Effort (person-months required). Score = (Reach x Impact x Confidence) / Effort. I use it to compare different types of initiatives objectively — a high-effort, high-impact feature might score lower than a low-effort, moderate-impact quick win."
    if "moscow" in q or "must have should have" in q:
        return "MoSCoW categorizes requirements into: Must have (critical for launch), Should have (important but can be deferred), Could have (nice to include if time permits), and Won't have (explicitly excluded this cycle). I use it during release planning to align stakeholders on scope and ensure the team focuses on what's truly essential for the next milestone."
    if "kano" in q:
        return "The Kano Model categorizes features by their impact on satisfaction. Basic Needs are expected features that cause dissatisfaction when missing (e.g., login). Performance features directly increase satisfaction with better execution (e.g., search speed). Delighters are unexpected features that create satisfaction but don't disappoint when absent (e.g., confetti animation on achievement). This helps prioritize strategically."
    if "aarrr" in q or "pirate" in q:
        return "The AARRR (Pirate) framework breaks the user journey into five stages: Acquisition (how users find you), Activation (first meaningful experience), Retention (users return), Revenue (monetization), and Referral (users invite others). I use it to identify growth bottlenecks — for example, low Activation might indicate poor onboarding, while low Referral might need a viral mechanic."
    if "heart" in q and "framework" in q:
        return "The HEART framework (Google) measures user experience quality: Happiness (satisfaction, NPS), Engagement (frequency and intensity of interaction), Adoption (new user acquisition), Retention (return rate over time), and Task Success (core task completion and efficiency). I use it alongside AARRR to balance UX health with growth metrics, ensuring we're not optimizing engagement at the expense of satisfaction."
    if "jobs-to-be-done" in q or "jtbd" in q:
        return "Jobs-to-be-Done focuses on the progress a user wants to make in a specific context. People 'hire' products to get a job done. For example, people hire a drill not because they want a drill but because they need a hole. I apply JTBD by conducting interviews focused on the user's situation, struggles, and desired outcomes, asking 'Tell me about the last time you wanted to solve this problem.'"
    if "eisenhower" in q:
        return "The Eisenhower Matrix categorizes tasks into four quadrants: Urgent + Important (do immediately), Important but Not Urgent (schedule), Urgent but Not Important (delegate), and Neither (eliminate). As a PM, I use it daily to balance reactive demands (critical bugs, stakeholder requests) with proactive strategic work (user research, roadmap planning)."
    if "star" in q.lower():
        return "STAR stands for Situation, Task, Action, Result — a structured method for answering behavioral interview questions. I describe the Situation (context), Task (my responsibility), Action (specific steps I took), and Result (quantifiable outcome). For example: Situation — user retention was dropping; Task — identify and fix the cause; Action — analyzed cohorts, identified onboarding gaps, redesigned flow; Result — retention improved 15%."
    
    # Stakeholders
    if "stakeholder" in q and ("disagree" in q or "conflict" in q):
        return "When stakeholders disagree, I first listen to understand each perspective fully. I ground the discussion in data and user research to move from opinions to evidence. I facilitate trade-off conversations using frameworks like RICE or effort-impact matrices to compare options objectively. If alignment is still elusive, I escalate to the decision-maker with a clear, data-backed recommendation."
    if "say no" in q or "handle feature request" in q:
        return "When saying no to a stakeholder, I acknowledge their input, explain the rationale transparently (how it compares to other priorities, what data supports the decision), and offer alternatives if possible. I frame it as 'not now' rather than 'never' and suggest revisiting in the next planning cycle. The key is maintaining trust by being honest about trade-offs."
    
    # Data
    if "qualitative" in q and "quantitative" in q:
        return "Qualitative data explains why users behave a certain way — gathered through interviews, usability tests, and open-ended survey responses. Quantitative data measures how many users do what — from analytics, A/B tests, and close-ended surveys. Qualitative generates hypotheses and reveals motivations; quantitative validates those hypotheses at scale. Both are essential for informed product decisions."
    if "data-driven" in q or "data informed" in q:
        return "I use data to inform decisions, not dictate them. I start with a hypothesis, gather relevant data from multiple sources (analytics, experiments, surveys), analyze for patterns, and triangulate with qualitative insights. I acknowledge data limitations like sample bias, survivorship bias, and the risk of optimizing for the wrong metric. The best decisions combine data with context and business judgment."
    if "a/b testing" in q or "ab test" in q or "split test" in q:
        if level in ("Junior", "Middle", "Senior"):
            return "A/B testing compares two variants to determine which performs better on a defined metric. I follow a rigorous process: (1) form a clear hypothesis with one variable, (2) define primary and secondary metrics, (3) calculate required sample size and duration (accounting for day-of-week effects), (4) randomize users and run to statistical significance (p<0.05), (5) analyze results including segment-level insights, and (6) decide whether to launch, iterate, or run a follow-up test."
        else:
            return "A/B testing compares two versions (A = control, B = variant) to see which performs better on a specific metric. Users are randomly assigned, and the results are analyzed for statistical significance. For example, testing two checkout button colors to see which gets more clicks. It enables data-driven decisions by validating changes before full rollout."
    if "statistical significance" in q:
        return "Statistical significance means the observed difference between variants is unlikely to have occurred by chance. The standard threshold is p < 0.05, meaning there's less than a 5% probability the result is random. However, practical significance matters too — a tiny lift that's statistically significant may not be worth implementing if the effect size is too small for business impact."
    
    # Users
    if "user persona" in q or "persona" in q:
        return "A user persona is a research-based representation of a target user group, including demographics, goals, pain points, and behaviors. I create personas by synthesizing data from user interviews, surveys, and analytics into 3-5 archetypes. For example, for a fitness app: 'Busy Professional Ben — 32, wants 15-min workouts, struggles with consistency.' Personas keep the team focused on real user needs during design and prioritization."
    if "user research" in q or "user interview" in q or "conduct user" in q:
        return "My user research approach follows a structured process: (1) define research questions aligned with product decisions, (2) choose methodology (interviews for depth, surveys for scale, usability tests for interaction), (3) recruit 5-8 participants per segment, (4) use a discussion guide with open-ended questions, (5) synthesize findings using affinity mapping to identify themes, and (6) share actionable insights with the team."
    if "competitive analysis" in q or "competitor" in q:
        return "My competitive analysis process: (1) identify direct and indirect competitors, (2) create a feature comparison matrix, (3) analyze user reviews for strengths and pain points, (4) study their pricing and positioning, (5) evaluate their UX and content strategy, and (6) synthesize insights into differentiation opportunities. I update this analysis quarterly to track market shifts."
    if "user feedback" in q:
        return "User feedback is systematically collected through multiple channels: in-app NPS surveys, support ticket analysis, app store reviews, user interviews, and feedback widgets. I categorize feedback by theme and frequency, then prioritize based on impact and alignment with strategy. Feedback is one input — I balance it with behavioral data and business goals to make informed decisions."
    
    # Business
    if "business model" in q:
        return "A business model describes how a company creates, delivers, and captures value. Key components include: value proposition (what problem you solve), customer segments (who you serve), revenue streams (how you make money), cost structure (your expenses), and key activities (what you do). Examples: subscription (Netflix), marketplace (Airbnb), freemium (Spotify), and advertising (Google)."
    if "value proposition" in q:
        return "A value proposition explains why customers should choose your product. It answers: what problem do you solve, for whom, and what makes you better than alternatives. A strong value proposition is specific, customer-focused, and differentiates from competitors. For example: 'Uber connects riders with reliable drivers at the tap of a button — typically faster and cheaper than taxis.'"
    if "pricing" in q or "price" in q:
        return "My pricing approach: (1) understand customer willingness to pay through surveys and price-sensitivity testing, (2) analyze competitor pricing and positioning, (3) choose a model (subscription, usage-based, tiered, freemium), (4) align price with delivered value (value-based pricing), (5) test with real users, and (6) iterate based on conversion data and market response."
    if "go-to-market" in q or "gtm" in q:
        return "A go-to-market strategy is the launch plan covering: target customer segments, positioning and messaging, pricing and packaging, distribution channels, marketing campaigns, and success metrics. I develop GTM strategy by collaborating with marketing, sales, and product teams to ensure the right audience hears the right message at the right time with clear conversion goals."
    
    # Team
    if "cross-functional" in q:
        return "I work with cross-functional teams by establishing shared OKRs, maintaining transparent communication through regular syncs, involving each function early in decisions, and respecting their expertise. I use RACI matrices to clarify responsibilities and ensure everyone knows their role. The key is creating a shared understanding of the problem so each function contributes their best ideas."
    if "engineer" in q and ("communicate" in q or "work with" in q):
        return "I collaborate with engineers by providing clear context on user needs and business goals, not just feature specs. I involve them early in problem definition to contribute technical insights. I respect their expertise on feasibility and architecture, communicate trade-offs transparently, and ensure requirements are well-documented with acceptance criteria before sprint planning."
    if "designer" in q and ("work with" in q or "collaborate" in q):
        return "I partner with designers by involving them in problem definition from the start, sharing user research insights, and providing clear requirements while leaving room for design exploration. I participate in design critiques constructively, ensuring feedback is grounded in user needs and product goals. Regular collaboration and shared OKRs keep product and design aligned."
    
    # OKRs
    if "okr" in q:
        return "OKRs (Objectives and Key Results) set ambitious goals with measurable outcomes. Objectives are qualitative and aspirational (e.g., 'Deliver the best onboarding experience in our market'). Key Results are quantitative and measurable (e.g., 'Increase 7-day retention from 40% to 60%'). I cascade OKRs from company to team level, ensuring alignment while giving teams autonomy in how they achieve results."
    if "vision" in q and "strategy" in q and "difference" in q:
        return "Vision is the aspirational long-term destination ('A world where anyone can learn anything'). Strategy is the plan to get there, including choices about where to play and how to win ('We'll focus on mobile-first, video-based learning for professionals'). Vision inspires and provides direction; strategy provides the concrete path and prioritization framework to achieve that vision."
    
    # Failure / Recovery
    if "failing product" in q or "revive" in q:
        return "To revive a failing product, I first diagnose root causes through: analytics (where is the drop-off?), user interviews (why did they leave?), and competitive analysis (where did they go?). I assess whether the problem is fixable, the market still exists, and we have resources to turn it around. If so, I identify the smallest changes to improve core metrics, test them, and iterate."
    if "failed" in q or "failure" in q:
        return "A past failure involved shipping a feature without sufficient user validation — adoption was very low. I learned that user research isn't optional before development. Now I always validate problems with interviews before designing solutions, and validate solutions with prototypes before committing engineering resources. This structured approach has saved months of wasted development."
    if "kill" in q or "sunset" in q or "deprecat" in q:
        return "I decide to sunset a feature based on: low/declining usage, misalignment with current strategy, high maintenance cost relative to value, or the existence of better alternatives. I review analytics, gather user feedback, discuss with stakeholders, and plan a graceful deprecation with clear migration paths, user communication, and sunset timelines."
    
    # Product types
    if "b2b" in q and "b2c" in q:
        return "B2B products serve organizations with features like team management, SSO, admin controls, and compliance. Decision-making involves multiple stakeholders and longer sales cycles. B2C products serve individual users, focus on ease of use, engagement, and viral growth. PM approaches differ: B2B requires stakeholder mapping and ROI-based value props; B2C emphasizes user delight and retention loops."
    if "platform" in q and "product" in q:
        return "A platform product enables other products or services to be built on top of it (e.g., iOS, AWS, Shopify). Platform PMs focus on APIs, developer experience, ecosystem growth, and balancing end-user value with partner needs. Key metrics include developer adoption, API usage, ecosystem partner revenue, and platform reliability."
    
    # Build vs Buy
    if "build" in q and "buy" in q and "partner" in q:
        return "Build when the capability is core to your competitive advantage and you have the expertise. Buy when a mature, well-integrated solution exists and the feature isn't differentiating. Partner when you need speed or ecosystem access. I weigh factors: strategic importance, total cost of ownership, time to market, integration complexity, and long-term maintenance burden."
    
    # Product discovery
    if "product discovery" in q:
        return "Product discovery is the ongoing process of exploring user problems and testing solutions before committing to development. Techniques include user interviews, competitive analysis, prototyping, concept testing, and fake door tests. Discovery prevents building the wrong thing by validating assumptions early. I practice continuous discovery, dedicating time each sprint to research alongside delivery."
    
    # Technical debt
    if "technical debt" in q or "tech debt" in q:
        return "Technical debt is the accumulated cost of shortcuts taken during development. I manage it by: (1) tracking debt items in the backlog, (2) allocating 15-20% of sprint capacity for debt reduction, (3) involving engineering in prioritizing which debt to address, and (4) communicating the business impact of debt (slower velocity, more bugs) to stakeholders to justify investment."
    
    # Scope creep
    if "scope creep" in q:
        return "I prevent scope creep by maintaining a clearly documented scope with explicit in-scope and out-of-scope items. When new requests arise, I evaluate them against sprint goals — if valuable, I add them to the backlog for future prioritization rather than expanding current scope. I communicate trade-offs transparently with stakeholders to maintain alignment and trust."
    
    # PM skills / philosophy
    if "essential skills" in q or "soft skills" in q:
        return "Essential PM skills include: strategic thinking (connecting product work to business outcomes), communication (articulating vision to diverse audiences), empathy (understanding users and team members), analytical thinking (using data to inform decisions), technical literacy (understanding engineering constraints), prioritization (making trade-offs), and leadership (inspiring without authority)."
    if "product philosophy" in q:
        return "My product philosophy centers on solving real problems with evidence-based decisions. I believe in deep user empathy, validating assumptions before building, prioritizing outcomes over outputs, and iterating quickly. A product should simplify the user's life and deliver measurable value. If it doesn't make the user's experience better or the business stronger, it shouldn't be built."
    
    # Product failures / recalls
    if "product recall" in q:
        return "A product recall requires immediate action: (1) halt sales and notify affected customers, (2) assemble a cross-functional response team (engineering, legal, PR, support), (3) diagnose root cause, (4) develop a fix timeline, (5) communicate transparently with users about what happened and what's being done, and (6) implement processes to prevent recurrence. Speed and transparency are critical for maintaining trust."
    
    # Product vision / strategy
    if "product vision" in q and "communicate" in q:
        return "I communicate product vision through storytelling that connects user needs to business outcomes. I use a concise vision statement, reinforce it in meetings and one-on-ones, share user research stories that illustrate the 'why,' and create visual artifacts (roadmaps, prototypes) to make the vision tangible. Repetition and authenticity are key — the vision should be felt, not just stated."
    if "product strategy" in q and "develop" in q:
        return "I develop product strategy by: (1) understanding market trends, user needs, and competitive landscape, (2) defining target segments and value proposition, (3) identifying strategic priorities for the next 6-12 months, (4) defining key results that indicate progress, and (5) socializing and iterating with stakeholders. Strategy answers: where to play and how to win."
    
    # General fallback per level
    if level == "Intern":
        return f"This is a foundational concept in product management. {question} Understanding this helps PMs build better products. I recommend studying the core definition, why it matters, and how it applies in real product scenarios. Relate it to examples from well-known products to demonstrate comprehension."
    elif level == "Fresher":
        return f"In my product management experience, {question} I approach this by combining theoretical knowledge with practical application. I focus on understanding underlying principles, apply relevant frameworks where appropriate, and use real examples to illustrate the concept. Continuous learning through practice and feedback is essential."
    elif level == "Junior":
        return f"Based on my experience, {question} I apply a structured approach: first understanding the context and requirements, then selecting appropriate frameworks or methodologies, executing with cross-functional collaboration, and measuring outcomes to iterate. For example, in a recent project, I used [relevant framework] to solve a similar challenge, which resulted in measurable improvements."
    elif level == "Middle":
        return f"In my role handling complex product challenges, {question} I take a strategic approach that balances immediate needs with long-term vision. I analyze trade-offs using frameworks like RICE or HEART, align decisions with organizational OKRs, and drive cross-functional alignment. For example, when faced with this challenge, I implemented a structured process that improved team outcomes by balancing competing priorities effectively."
    else:  # Senior
        return f"At a senior/leadership level, {question} requires thinking beyond individual products to organizational impact. I establish frameworks and processes that enable teams to make better decisions autonomously. My approach combines strategic vision with operational excellence — defining principles, building team capabilities, and creating accountability systems that scale across the organization."


def generate_ux_answer(question, level):
    """Generate a UX designer interview answer based on question and level."""
    q = question.lower()
    
    # Design Thinking
    if "design thinking" in q or "5 stages" in q or "stages of the design thinking" in q:
        return "Design Thinking is a human-centered problem-solving process with 5 stages: Empathize (understand users through research), Define (articulate the problem clearly), Ideate (brainstorm solutions), Prototype (create low-fidelity representations), and Test (validate with users). It's iterative — insights from testing may send you back to earlier stages. The framework ensures solutions are grounded in real user needs, not assumptions."
    if "empath" in q:
        return "Empathy in design means understanding users' feelings, motivations, and context to create solutions that truly meet their needs. It involves active listening, observation, and setting aside your own assumptions. Methods include user interviews, contextual inquiry, empathy mapping, and journey mapping. Without empathy, designs risk solving the wrong problem or creating solutions users don't actually want."
    if "define stag" in q or "define stage" in q:
        return "The Define stage synthesizes research findings into a clear problem statement. I create a user point-of-view (POV) statement: '[User] needs [need] because [insight].' For example: 'A busy parent needs a quick way to plan meals because they have limited time after work.' A well-defined problem ensures the team solves the right challenge before generating solutions."
    if "ideation" in q:
        return "Ideation is the creative process of generating a broad range of ideas for solving the defined problem. Techniques include brainstorming, brainwriting, worst-possible-idea (to loosen up), SCAMPER (Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse), and How Might We questions. The goal is quantity and variety — ideas are evaluated and narrowed down later."
    if "prototyping" in q and not ("difference" in q or "low" in q or "high" in q):
        return "Prototyping creates a tangible representation of a design idea for testing. Fidelity ranges from low (paper sketches, wireframes) to high (interactive, pixel-perfect). Prototypes help validate concepts early, gather user feedback before development, communicate design intent to stakeholders, and uncover usability issues. I prototype iteratively — starting rough, then refining based on feedback."
    
    # UX vs UI
    if "difference between ux and ui" in q or "ux designer and ui designer" in q or "difference between ux designer and ui" in q:
        return "UX (User Experience) encompasses the entire user journey — how a product feels, how easy it is to use, and whether it solves the user's problem. UI (User Interface) focuses on the visual presentation — colors, typography, buttons, and layout. UX is the structure and strategy; UI is the execution and aesthetics. Good UI supports good UX, but you can have beautiful UI with terrible UX."
    if "role of a ux designer" in q:
        return "A UX designer advocates for the user throughout the product development process. Responsibilities include: conducting user research, creating personas and journey maps, designing wireframes and prototypes, conducting usability testing, collaborating with visual designers and developers, and ensuring the product is intuitive, accessible, and meets user needs. UX designers bridge user needs with business goals."
    
    # Personas / Journey maps
    if "user persona" in q and "create" in q:
        return "I create user personas by synthesizing research data (interviews, surveys, analytics) into representative archetypes. Each persona includes: name, photo, demographics, goals, pain points, behaviors, and a quote capturing their mindset. For example, for a banking app: 'Tech-Savvy Tina — 28, wants mobile deposits and instant transfers, frustrated by slow load times.' Personas keep the team user-focused."
    if "user journey" in q or "journey map" in q:
        return "A user journey map visualizes the steps a user takes to accomplish a goal with a product, including their actions, thoughts, emotions, and touchpoints across time. It reveals pain points and opportunities for improvement. For example, a travel booking journey map might show frustration at the comparison stage, suggesting a better comparison tool is needed."
    if "empathy map" in q:
        return "An empathy map captures what a user says, thinks, does, and feels in a specific context. It helps the team develop deep user understanding and identify needs the user may not explicitly express. The four quadrants are: Says (quotes from research), Thinks (internal thoughts), Does (observable actions), and Feels (emotional state). Empathy maps are used during the Empathize stage of design thinking."
    
    # Wireframes / Prototypes
    if "wireframe" in q and "low-fidelity" in q:
        return "Low-fidelity wireframes are rough, simplified layouts using basic shapes and placeholders to focus on structure, content hierarchy, and user flow without visual details. High-fidelity wireframes include real content, accurate spacing, typography hints, and more detail. Lo-fi is fastest for early ideation; hi-fi is better for usability testing where visual design matters to the test outcome."
    if "wirefram" in q and not "low" in q:
        return "A wireframe is a skeletal layout of a screen showing content structure, hierarchy, and functionality without visual design. It uses simple shapes, lines, and placeholder text to map out where elements go. Wireframes are useful for early alignment on layout and user flow before investing time in visual design. I use Figma for digital wireframes and paper for quick ideation."
    
    # Usability
    if "usability testing" in q and "conduct" in q:
        return "I conduct usability testing by: (1) defining test objectives and tasks, (2) recruiting 5-8 participants matching our target users, (3) preparing a test script with specific tasks and think-aloud prompts, (4) moderating sessions while observing and taking notes, (5) measuring success rate, time on task, and errors, and (6) analyzing findings to prioritize improvements. I use tools like UserTesting and Lookback for remote sessions."
    if "heuristic evaluation" in q:
        return "A heuristic evaluation is an expert review where designers evaluate a product against established usability principles (Nielsen's 10 heuristics). Each evaluator independently identifies violations, rates their severity (0-4), and recommends fixes. It's a fast, low-cost method to catch usability issues before user testing. I typically involve 3-5 evaluators for best coverage."
    if "nielsen" in q and "10" in q:
        return "Nielsen's 10 usability heuristics are: (1) Visibility of system status, (2) Match between system and real world, (3) User control and freedom, (4) Consistency and standards, (5) Error prevention, (6) Recognition rather than recall, (7) Flexibility and efficiency of use, (8) Aesthetic and minimalist design, (9) Help users recognize, diagnose, and recover from errors, and (10) Help and documentation."
    
    # Accessibility
    if "accessibility" in q and "wcag" in q:
        return "WCAG (Web Content Accessibility Guidelines) provides standards for making digital content accessible to people with disabilities. The four principles (POUR): Perceivable (information must be presentable to senses), Operable (interface must be operable), Understandable (content must be comprehensible), and Robust (content must work with assistive technologies). WCAG 2.1 defines three conformance levels: A, AA, and AAA."
    if "accessibility" in q and "design" in q and not "wcag" in q:
        return "Accessibility in design ensures products can be used by people with diverse abilities — visual, auditory, motor, speech, and cognitive. Key practices include: sufficient color contrast (WCAG AA 4.5:1 for text), keyboard navigation, screen reader compatibility (ARIA labels), clear focus indicators, and captions for media. Accessibility benefits all users and is often legally required (ADA, Section 508, EN 301 549)."
    if "color contrast" in q:
        return "Color contrast measures the difference between foreground text and background colors. WCAG 2.1 requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (AA). Adequate contrast ensures readability for users with low vision or color deficiencies. I use tools like Stark in Figma or WebAIM's contrast checker to verify ratios during design."
    
    # Visual design
    if "visual hierarchy" in q:
        return "Visual hierarchy arranges design elements to guide the user's attention in order of importance. It uses techniques: size (larger = more important), color (bright/dark contrast draws attention), spacing (more space around important elements), position (top-left is primary), and typography (headings vs body). Good hierarchy means users can scan and find what they need within seconds."
    if "color theory" in q:
        return "Color theory guides the selection of colors for harmony, contrast, and meaning. Key concepts: hue (color family), saturation (intensity), value (lightness/darkness). Color harmonies include complementary (opposite colors on the wheel), analogous (adjacent colors), and triadic. Color also carries cultural and psychological associations — blue conveys trust, red indicates urgency or error."
    if "typography" in q:
        return "Typography is the art of arranging type to make text readable and visually appealing. Key considerations: font selection (serif vs sans-serif), hierarchy (heading, subheading, body), line height (1.5x for body text), line length (45-75 characters per line), and font pairing (contrast between heading and body fonts). Good typography improves readability, accessibility, and brand identity."
    
    # Information Architecture
    if "information architecture" in q:
        return "Information Architecture (IA) is the structural design of how information is organized, labeled, and navigated in a product. It answers: where am I, what's here, where can I go? Methods include card sorting (users organize content into categories), tree testing (validating the structure), and sitemaps. Good IA reduces cognitive load and helps users find information quickly."
    if "card sorting" in q:
        return "Card sorting is a UX research method where participants organize topics into groups that make sense to them. Open card sorting (users create and name groups) helps discover mental models. Closed card sorting (users sort into predefined categories) validates existing structures. I use card sorting to inform navigation, sitemaps, and content categorization based on users' natural mental models."
    if "sitemap" in q:
        return "A sitemap is a hierarchical diagram showing the pages and content structure of a website or app. It visualizes the IA, showing parent-child relationships and navigation paths. Sitemaps guide UX design by defining the full scope of pages needed and ensuring all content has a clear place in the structure. I create sitemaps after card sorting to validate the proposed IA."
    
    # Design Systems
    if "design system" in q:
        return "A design system is a collection of reusable components, patterns, and guidelines that ensure consistency across a product or organization. It includes: design tokens (colors, spacing, typography), component library (buttons, inputs, cards), pattern library (navigation, forms, search), and usage guidelines. Benefits include faster design, consistent UI, and improved developer handoff. Examples: Material Design, Shopify Polaris."
    if "atomic design" in q:
        return "Atomic design (by Brad Frost) breaks interfaces into a hierarchy: Atoms (basic elements like buttons and inputs), Molecules (simple groups like a search form), Organisms (complex sections like a header), Templates (page-level layouts), and Pages (specific instances with real content). This methodology creates scalable, composable design systems where changes at the atomic level cascade consistently."
    if "design tokens" in q:
        return "Design tokens are the atomic values of a design system — colors, typography scales, spacing units, border radii, and shadows. They are stored as platform-agnostic data (JSON, YAML) and translated into platform-specific variables (CSS custom properties, iOS/Swift constants, Android XML). Tokens ensure visual consistency across platforms and enable systematic theme switching (light/dark mode)."
    
    # Tools
    if "figma" in q:
        return "Figma is a cloud-based design tool for UI/UX design, prototyping, and collaboration. Key features: real-time multi-player editing, auto layout (responsive design), components and variants (reusable design elements), FigJam (whiteboarding), and developer handoff with inspect mode. I prefer Figma for its collaboration capabilities — multiple designers can work simultaneously with version history."
    if "sketch" in q:
        return "Sketch is a macOS-native vector design tool popular for UI design. It pioneered symbols (reusable components) and was the industry standard before Figma emerged. Sketch now offers collaboration via cloud but is less seamless than Figma. It remains popular for icon design and Mac-focused workflows, but the industry has largely shifted to Figma for web-based collaboration."
    if "adobe xd" in q:
        return "Adobe XD is a vector-based UX/UI design and prototyping tool with features like responsive resize, repeat grid, and auto-animate. It integrates with the Adobe ecosystem (Photoshop, Illustrator) and offers voice prototyping. While capable, XD has lost market share to Figma. I'd choose it if the organization already uses Adobe Creative Cloud extensively."
    
    # Design methods
    if "design sprint" in q:
        return "A design sprint (by Google Ventures) is a 5-day process for solving big problems and testing solutions through: Understand (Day 1 — map the problem), Diverge (Day 2 — sketch solutions), Decide (Day 3 — choose the best ideas), Prototype (Day 4 — build a realistic prototype), and Test (Day 5 — test with 5 users). It compresses months of work into a week, reducing risk before building."
    if "double diamond" in q:
        return "The Double Diamond (by Design Council) has four phases: Discover (research and understand the problem — divergent thinking), Define (synthesize and focus — convergent thinking), Develop (generate and test solutions — divergent thinking), and Deliver (finalize and launch — convergent thinking). It illustrates how design thinking alternates between expanding and narrowing possibilities."
    if "lean ux" in q:
        return "Lean UX applies Lean Startup principles to design: focus on the user experience rather than deliverables, collaborate cross-functionally, build minimum viable prototypes, test with users early and often, and iterate based on feedback. It emphasizes outcomes over outputs and reduces waste by validating assumptions quickly with lightweight experiments rather than extensive documentation."
    
    # Research methods
    if "user research" in q and "qualitative" in q and "quantitative" in q:
        return "Qualitative research (interviews, usability tests, diary studies) provides rich insights into user motivations, behaviors, and pain points — answering 'why.' Quantitative research (surveys, analytics, A/B tests) provides statistical data on how many users do what — answering 'how many.' Qualitative generates hypotheses; quantitative validates them. Both are essential throughout the design process."
    if "a/b testing" in q:
        return "A/B testing in UX compares two design variants to determine which performs better on a defined metric (conversion rate, task completion, click-through rate). Users are randomly assigned to variant A or B, and statistical analysis determines the winner. I use A/B testing to validate design decisions at scale after qualitative testing has confirmed the direction."
    if "competitive analysis" in q or "competitive audit" in q or "competitive ux" in q:
        return "A competitive UX analysis evaluates competitor products to identify best practices, gaps, and differentiation opportunities. I examine: navigation patterns, information architecture, visual design, onboarding flow, content strategy, and user reviews. Findings are documented in a competitive matrix with screenshots, observations, and actionable recommendations for our product."
    
    # Portfolio / Career
    if "portfolio" in q:
        return "A UX portfolio showcases your design process, problem-solving skills, and impact. It should include 3-5 case studies that tell a story: the problem, your research, ideation process, design decisions, final solution, and measurable results. Quality over quantity — each case study should demonstrate your specific contribution, design thinking, and how you validated decisions with users."
    if "case study" in q:
        return "A UX case study tells the story of a design project from problem to solution. Structure: Project Overview (context, role, timeline), Research (methods and key findings), Define (problem statement, user needs), Ideate (sketches, concepts), Design (wireframes, prototypes, iterations), Validation (usability testing results), and Outcomes (metrics and impact). Each case study should highlight your role and decision-making process."
    
    # Feedback / Critique
    if "design critique" in q or "critique" in q:
        return "A design critique is a structured session where designers present work-in-progress to receive constructive feedback. Best practices: start with the problem and goals, present what you've tried, ask specific questions, receive feedback without being defensive, and take notes. Feedback should focus on user needs and design principles, not personal preferences. I use the SBI model: Situation-Behavior-Impact."
    if "feedback" in q and "stakeholder" in q:
        return "When receiving stakeholder feedback that contradicts user research, I respectfully present the research findings and explain the rationale behind design decisions. I ask clarifying questions to understand their concerns, look for common ground, and suggest A/B testing if appropriate. The user's voice is my primary guide, but I balance it with business constraints and stakeholder expertise."
    
    # States
    if "loading state" in q:
        return "A loading state indicates that content is being fetched or processed. Good loading states manage user expectations and reduce perceived wait time: use skeleton screens (placeholder shapes that mimic content layout) rather than spinning spinners, show progress indicators for longer waits, and keep users informed. Avoid blank screens — they create anxiety about whether the app is working."
    if "empty state" in q:
        return "An empty state appears when a screen has no data to display (first use, all items cleared, no results found). Good empty states: explain why the content is missing, guide the user on what to do next, and use friendly language with illustrations. For example, an empty inbox might show 'No messages yet' with a 'Start a conversation' CTA rather than a blank screen."
    if "error state" in q:
        return "An error state appears when something goes wrong (network failure, server error, invalid input). Best practices: clearly explain what happened in plain language, avoid technical jargon, provide a solution or next step (e.g., 'Try again' button), and maintain brand tone. Error states should be designed, not left to default browser messages."
    
    # Psychology / Laws
    if "fitts" in q or "fitts's law" in q:
        return "Fitts's Law states that the time to acquire a target depends on its size and distance. Larger targets closer to the user's starting position are faster to click. This means: place important actions (CTAs) in easily reachable areas, make clickable targets large enough (minimum 44px for mobile touch targets), and position destructive actions (delete) away from common actions."
    if "hick" in q or "hick's law" in q:
        return "Hick's Law states that decision time increases logarithmically with the number of choices. More options = slower decisions. I apply this by simplifying navigation, breaking complex choices into steps (progressive disclosure), limiting menu items, and using sensible defaults. For example, a checkout form should show only essential fields first, with optional fields collapsed."
    if "jakob" in q or "jakob's law" in q:
        return "Jakob's Law states that users spend most of their time on other websites, so they expect your site to work the same way. Leveraging existing mental models reduces learning curves. For example, users expect the shopping cart icon in the top-right corner and the logo linking to the homepage. Innovation should be applied to solving problems, not reinventing standard UX patterns."
    if "miller" in q or "miller's law" in q:
        return "Miller's Law states the average person can hold 7 (plus or minus 2) items in their working memory. I apply this by grouping content into manageable chunks (chunking), limiting navigation items to 5-7, breaking long forms into steps, and using progressive disclosure to avoid overwhelming users with too much information at once."
    
    # Forms
    if "form" in q and "design" in q:
        return "Good form design principles: one column (single column is faster to complete), clear labels above input fields, inline validation (validate each field as the user types), useful error messages (explain what's wrong and how to fix it), appropriate input types (use date pickers for dates, dropdowns for limited options), and a clear primary CTA. Reduce friction by pre-filling when possible and showing progress for multi-step forms."
    
    # Micro-interactions
    if "micro-interaction" in q:
        return "Micro-interactions are small, focused moments in a product that accomplish a single task — like a toggle switch animation, a like button bounce, or a pull-to-refresh gesture. They have four parts: Trigger (what starts it), Rules (how it works), Feedback (what the user sees/feels), and Loops/Modes (metaphors and variations). Good micro-interactions provide delight, feedback, and guidance."
    
    # General fallback
    if level == "Intern":
        return f"This is a foundational UX concept. {question} Understanding this helps designers create better user experiences. I recommend studying the core definition, why it matters in practice, and how it applies to real-world products. Referencing examples from well-known apps demonstrates comprehension of the concept."
    elif level == "Fresher":
        return f"In my UX design work, {question} I approach this by combining theory with practice. I focus on understanding the principles, applying appropriate methods, and using real examples to illustrate the concept. Continuous refinement through feedback and iteration is key to mastering this skill."
    elif level == "Junior":
        return f"Based on my experience, {question} I apply a structured design process: first understanding user needs through research, then iterating on solutions through prototyping and testing. For example, in a recent project, I used [relevant method] to address a similar challenge, which led to measurable improvements in usability and user satisfaction."
    elif level == "Middle":
        return f"In my role leading design initiatives, {question} I take a strategic approach that considers both user needs and business goals. I establish processes, mentor junior designers, and drive cross-functional alignment. For example, I've implemented systems and practices that improved design quality, consistency, and team efficiency."
    else:  # Senior
        return f"At a leadership level, {question} requires thinking beyond individual projects to organizational impact. I establish design principles, build team capabilities, create scalable systems, and advocate for user-centered practices at the executive level. My approach balances design excellence with business strategy, ensuring design drives measurable outcomes at scale."


def process_file(filepath, position, answer_generator):
    """Process a JSON file, adding answers for each level."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    levels = ["Intern", "Fresher", "Junior", "Middle", "Senior"]
    data["answers"] = {}
    
    for level in levels:
        questions = data["questions"].get(level, [])
        print(f"  {position} - {level}: {len(questions)} questions")
        
        answers = []
        for question in questions:
            answer = answer_generator(question, level)
            answers.append(answer)
        
        data["answers"][level] = answers
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {filepath}")


def main():
    pm_path = os.path.join(BASE, "product_manager.json")
    ux_path = os.path.join(BASE, "ux_designer.json")
    
    print("Processing Product Manager questions...")
    process_file(pm_path, "PM", generate_pm_answer)
    
    print("Processing UX Designer questions...")
    process_file(ux_path, "UX", generate_ux_answer)
    
    print("\nDone! Both files updated with answers.")

if __name__ == "__main__":
    main()
