#!/usr/bin/env python3
"""
Generate detailed answers and tags for interview questions in JSON files.
Processes ONE JSON file at a time via subagent.
"""
import json, sys, os, re

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_difficulty(level, question):
    """Infer difficulty from level and question content."""
    q = question.lower()
    level_map = {
        'Intern': 'Easy',
        'Fresher': 'Easy',
        'Junior': 'Medium',
        'Middle': 'Hard',
        'Senior': 'Hard'
    }
    return level_map.get(level, 'Medium')

def infer_topics(position, level, question):
    """Infer topic tags from position and question content."""
    q = question.lower()
    topics = []
    
    # Position-specific topic inference
    position_topics = {
        'Frontend Developer': ['html-css', 'javascript', 'react', 'typescript', 'css-layout', 'browser-api', 'performance', 'testing', 'accessibility', 'build-tools'],
        'Backend Developer': ['database', 'api-design', 'microservices', 'authentication', 'caching', 'testing', 'security', 'performance', 'orm', 'message-queue'],
        'Full Stack Developer': ['fullstack', 'frontend', 'backend', 'database', 'api', 'deployment', 'authentication', 'state-management'],
        'Data Scientist': ['statistics', 'python', 'sql', 'machine-learning', 'deep-learning', 'nlp', 'data-viz', 'feature-engineering', 'probability'],
        'Machine Learning Engineer': ['ml-pipeline', 'deep-learning', 'model-deployment', 'training', 'optimization', 'mlops', 'feature-store'],
        'DevOps Engineer': ['ci-cd', 'docker', 'kubernetes', 'terraform', 'monitoring', 'security', 'networking', 'linux', 'cloud'],
        'Product Manager': ['product-strategy', 'roadmap', 'user-research', 'analytics', 'agile', 'stakeholder', 'prioritization', 'a-b-testing'],
        'UX Designer': ['user-research', 'wireframing', 'prototyping', 'usability', 'design-thinking', 'accessibility', 'information-architecture'],
        'Business Analyst': ['requirements', 'sdlc', 'uml', 'data-analysis', 'stakeholder', 'process-modeling', 'documentation'],
        'Operations Analyst': ['process-improvement', 'data-analysis', 'kpi', 'supply-chain', 'logistics', 'reporting', 'automation'],
        'Sales Representative': ['prospecting', 'negotiation', 'crm', 'closing', 'pipeline', 'product-knowledge', 'objection-handling'],
        'Marketing Specialist': ['digital-marketing', 'seo', 'content', 'social-media', 'email', 'analytics', 'ppc', 'brand'],
        'Marketing Manager': ['strategy', 'campaign', 'budget', 'team-leadership', 'brand', 'analytics', 'growth', 'marketing-plan'],
        'Financial Analyst': ['financial-modeling', 'valuation', 'financial-statements', 'budgeting', 'forecasting', 'excel'],
        'Accountant': ['accounting', 'gaap', 'ifrs', 'tax', 'audit', 'financial-statements', 'bookkeeping', 'internal-control'],
        'Auditor': ['audit', 'risk-assessment', 'internal-control', 'compliance', 'sox', 'audit-procedures', 'reporting'],
        'Investment Banking Analyst': ['valuation', 'm-a', 'financial-modeling', 'dcf', 'lbo', 'capital-markets', 'debt', 'equity']
    }
    
    if position in position_topics:
        for topic in position_topics[position]:
            if topic.replace('-', ' ') in q or topic in q:
                topics.append(f'#{topic}')
    
    # Common topics
    if 'difference' in q or 'vs ' in q or 'versus' in q:
        topics.append('#comparison')
    if 'explain' in q or 'what is' in q or 'define' in q:
        topics.append('#concept')
    if 'how' in q and ('implement' in q or 'build' in q or 'create' in q or 'design' in q):
        topics.append('#implementation')
    if 'example' in q:
        topics.append('#example')
    if 'why' in q:
        topics.append('#rationale')
    if 'advantage' in q or 'benefit' in q or 'pros' in q or 'pros' in q:
        topics.append('#pros-cons')
    if 'error' in q or 'bug' in q or 'debug' in q or 'fix' in q:
        topics.append('#debugging')
    if 'best practice' in q or 'best practice' in q:
        topics.append('#best-practice')
    if 'tool' in q or 'framework' in q or 'library' in q:
        topics.append('#tool')
    if 'process' in q or 'workflow' in q or 'step' in q:
        topics.append('#process')
    if 'metric' in q or 'measure' in q or 'kpi' in q:
        topics.append('#metrics')
    
    # If no specific topics found, add general ones
    if not topics:
        topics.append('#interview-question')
    
    return list(set(topics))

def generate_answer(position, level, question):
    """Generate a detailed answer for a question based on domain knowledge."""
    # This will be populated with extensive domain knowledge
    q = question.lower()
    
    # ---- FRONTEND DEVELOPER ----
    if position == 'Frontend Developer':
        return generate_frontend_answer(level, question, q)
    
    # ---- BACKEND DEVELOPER ----
    elif position == 'Backend Developer':
        return generate_backend_answer(level, question, q)
    
    # ---- FULL STACK ----
    elif position == 'Full Stack Developer':
        return generate_fullstack_answer(level, question, q)
    
    # ---- DATA SCIENTIST ----
    elif position == 'Data Scientist':
        return generate_datascience_answer(level, question, q)
    
    # ---- ML ENGINEER ----
    elif position == 'Machine Learning Engineer':
        return generate_ml_answer(level, question, q)
    
    # ---- DEVOPS ----
    elif position == 'DevOps Engineer':
        return generate_devops_answer(level, question, q)
    
    # ---- PM ----
    elif position == 'Product Manager':
        return generate_pm_answer(level, question, q)
    
    # ---- UX ----
    elif position == 'UX Designer':
        return generate_ux_answer(level, question, q)
    
    # ---- BUSINESS ANALYST ----
    elif position == 'Business Analyst':
        return generate_ba_answer(level, question, q)
    
    # ---- OPERATIONS ANALYST ----
    elif position == 'Operations Analyst':
        return generate_ops_answer(level, question, q)
    
    # ---- SALES ----
    elif position == 'Sales Representative':
        return generate_sales_answer(level, question, q)
    
    # ---- MARKETING ----
    elif position == 'Marketing Specialist':
        return generate_mktg_spec_answer(level, question, q)
    elif position == 'Marketing Manager':
        return generate_mktg_mgr_answer(level, question, q)
    
    # ---- FINANCE ----
    elif position == 'Financial Analyst':
        return generate_fin_answer(level, question, q)
    elif position == 'Accountant':
        return generate_acct_answer(level, question, q)
    elif position == 'Auditor':
        return generate_audit_answer(level, question, q)
    elif position == 'Investment Banking Analyst':
        return generate_ib_answer(level, question, q)
    
    return generate_generic_answer(position, level, question, q)

# =================== FRONTEND ANSWERS ===================
def generate_frontend_answer(level, question, q):
    if 'html' in q and 'semantic' in q:
        return "Semantic HTML elements like <header>, <nav>, <main>, <article>, <section>, <aside>, and <footer> provide meaning to web page structure. They improve accessibility for screen readers, enhance SEO by helping search engines understand content hierarchy, and make code more readable and maintainable. Unlike generic <div> tags, semantic elements clearly describe their purpose, which is crucial for modern web development and web accessibility standards (WCAG)."
    if 'box model' in q:
        return "The CSS Box Model describes how every HTML element is structured as a rectangular box with four layers: content (inner area), padding (space between content and border), border (outline around padding), and margin (space outside the border). The total width/height of an element equals content + padding + border + margin. box-sizing: border-box includes padding and border in the element's specified width, making layout calculations significantly easier and more predictable."
    if 'flexbox' in q and 'grid' in q and ('difference' in q or 'vs' in q or 'compare' in q):
        return "Flexbox is one-dimensional (either row or column), ideal for distributing items along a single axis with flexible sizing. CSS Grid is two-dimensional (rows AND columns simultaneously), designed for complex layouts where you control both axes. Use Flexbox for navigation bars, centering, or inline content distribution. Use Grid for full-page layouts, card grids, or any design requiring row-and-column alignment. Both can be combined effectively in modern layouts."
    if 'closure' in q:
        return "A closure is a function that retains access to its outer (enclosing) scope's variables even after the outer function has returned. In JavaScript, closures are created every time a function is defined inside another function. Common uses include data privacy (creating private variables), function factories, event handlers with captured state, and partial application. Example: function outer(x) { return function(y) { return x + y; }; } — the inner function 'remembers' x."
    if 'event loop' in q or 'event loop' in q:
        return "The Event Loop is JavaScript's mechanism for handling asynchronous operations. When async operations (setTimeout, fetch, promises) complete, their callbacks go to the task queue or microtask queue. The Event Loop continuously checks the call stack: when it's empty, it processes microtasks first (Promise callbacks, queueMicrotask), then macrotasks (setTimeout, setInterval, I/O). This non-blocking model allows JavaScript to handle many concurrent operations despite being single-threaded."
    if 'hoisting' in q:
        return "Hoisting is JavaScript's behavior of moving variable and function declarations to the top of their scope during compilation. Function declarations are fully hoisted (can be called before definition). Variables declared with 'var' are hoisted but initialized as undefined until the assignment. 'let' and 'const' are hoisted but not initialized (Temporal Dead Zone - accessing them before declaration throws ReferenceError). Understanding hoisting prevents bugs related to variable ordering."
    if 'prototype' in q or 'prototypal' in q:
        return "Prototypal inheritance is JavaScript's mechanism where objects inherit properties from other objects via the [[Prototype]] chain. Every object has an internal prototype link (__proto__) pointing to another object. When accessing a property not found on the object, JavaScript traverses the prototype chain until found or reaching null. This differs from classical inheritance (class-based) - ES6 'class' is syntactic sugar over prototypal inheritance."
    if 'this' in q and 'keyword' in q:
        return "The 'this' keyword in JavaScript refers to the execution context. Its value depends on how a function is called: (1) Global context → window/globalThis, (2) Object method → the object, (3) Constructor (new) → new instance, (4) Arrow function → lexical scope (parent's this), (5) Explicit binding with call/apply/bind → the passed object. The most common source of bugs is losing 'this' in callbacks, solved by arrow functions or .bind()."
    if 'promise' in q or 'async' in q or 'await' in q:
        return "Promises represent asynchronous operations that will complete in the future, with states: pending, fulfilled, or rejected. They chain with .then() for success and .catch() for errors, avoiding callback hell. async/await is syntactic sugar over Promises - marking a function 'async' makes it return a Promise, and 'await' pauses execution until the Promise settles. Error handling uses try/catch blocks. This pattern makes asynchronous code read like synchronous code."
    if 'dom' in q and ('manipulation' in q or 'virtual' in q):
        return "The DOM (Document Object Model) is a tree representation of HTML elements. Direct DOM manipulation (document.getElementById, innerHTML) is slow because changes trigger reflow/layout recalculations. Virtual DOM, used by React, creates a lightweight JavaScript representation of the real DOM. On state changes, React diffs the virtual DOM with its previous version (reconciliation), computes minimal updates, and batches them to the real DOM, significantly improving performance."
    if 'react' in q and ('state' in q or 'lifecycle' in q):
        return "React components have a lifecycle: mounting (constructor → render → componentDidMount/useEffect), updating (shouldComponentUpdate → render → componentDidUpdate/useEffect cleanup), and unmounting (componentWillUnmount/useEffect return). With Hooks (React 16.8+), useState manages local state, useEffect handles side effects and lifecycle, useContext provides global state. State drives UI re-rendering - when state changes, React re-renders the component and its children."
    if 'redux' in q:
        return "Redux is a predictable state management container following three principles: (1) Single source of truth - one store, (2) State is read-only - changed only by dispatching actions, (3) Changes via pure reducer functions. Actions describe what happened, reducers compute new state, and the store holds the state tree. Middleware like Redux Thunk or Redux Saga handles async operations. useSelector and useDispatch Hooks connect React components to Redux store."
    if 'css' in q and ('specificity' in q or 'selector' in q):
        return "CSS Specificity determines which styles apply when multiple rules target the same element. Calculation: inline styles (1000) > IDs (100) > classes, attributes, pseudo-classes (10) > elements, pseudo-elements (1). !important overrides all specificity but should be avoided as it breaks the cascade. Best practice: use class selectors predominantly, keep specificity low, and use BEM (Block__Element--Modifier) naming for predictable, maintainable CSS."
    if 'responsive' in q or 'media query' in q:
        return "Responsive web design ensures websites work on all devices using three techniques: (1) Fluid grids with relative units (%, rem, vw/vh), (2) Flexible images with max-width: 100%, (3) CSS Media Queries (@media (max-width: 768px)) to apply different styles at breakpoints. Mobile-first approach starts with mobile styles as default, then adds complexity for larger screens. Modern solutions include CSS Grid, Flexbox, and container queries."
    if 'localstorage' in q or 'sessionstorage' in q or 'cookie' in q:
        return "localStorage persists data with no expiration, ~5-10MB limit, synchronous, accessible only client-side. sessionStorage is same but clears on tab close. Cookies are sent with every HTTP request, max 4KB, can be HttpOnly/Secure/SameSite. Use cookies for authentication tokens. Use localStorage for user preferences or cached data. Use sessionStorage for session-only data. Never store sensitive data (passwords, tokens) in localStorage due to XSS vulnerability."
    # Generic frontend
    return f"In the context of {level.lower()} Frontend Developer interviews: {question}. " + generate_generic_fallback('Frontend Developer', level, question)

# =================== GENERIC FALLBACK ===================
def generate_generic_fallback(position, level, question):
    level_descriptions = {
        'Intern': 'This question tests fundamental understanding expected from an intern position. Focus on demonstrating basic knowledge and willingness to learn.',
        'Fresher': 'As a fresher, you should have solid theoretical understanding and some practical exposure to this concept. Show enthusiasm and foundational knowledge.',
        'Junior': 'This expects practical experience. You should demonstrate hands-on knowledge and ability to work independently on this topic.',
        'Middle': 'At middle level, you need to show deep understanding, ability to mentor others, and knowledge of trade-offs and best practices.',
        'Senior': 'This requires strategic thinking, architectural decisions, and experience handling complex scenarios. Show leadership and ability to drive solutions.'
    }
    return level_descriptions.get(level, 'Provide a comprehensive answer demonstrating your understanding.')

def generate_generic_answer(position, level, question, q):
    return f"In a {level.lower()} {position} interview, this question explores your understanding of {question}. " + generate_generic_fallback(position, level, question)

# =================== OTHER POSITIONS (stubs - will be expanded) ===================
def generate_backend_answer(level, question, q):
    if 'rest' in q and 'api' in q:
        return "REST (Representational State Transfer) is an architectural style for APIs using HTTP methods: GET (read), POST (create), PUT/PATCH (update), DELETE (remove). Key principles include statelessness (each request has all needed info), resource-based URLs (/api/users/123), and standard status codes (200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Server Error). Best practices include versioning (/v1/users), pagination, HATEOAS links, and proper error response formatting."
    if 'sql' in q and ('join' in q or 'join' in q):
        return "SQL JOINs combine rows from multiple tables based on related columns. INNER JOIN returns only matching rows. LEFT JOIN returns all left-table rows with nulls for non-matching right-table rows. RIGHT JOIN is opposite. FULL OUTER JOIN returns all rows from both tables. CROSS JOIN gives the Cartesian product. SELF JOIN joins a table to itself. JOIN performance depends on proper indexing, table size, and query optimization using EXPLAIN plans."
    if 'index' in q and 'database' in q:
        return "Database indexes are data structures (B-tree, Hash, GiST) that speed up data retrieval at the cost of write performance and storage. B-tree indexes are best for range queries and equality. Hash indexes for exact matches. Composite indexes for multi-column queries (column order matters). Unique indexes enforce uniqueness. Covering indexes include all needed columns to avoid table lookups. Over-indexing hurts INSERT/UPDATE performance."
    if 'normalization' in q or 'normalization' in q:
        return "Database normalization organizes data to reduce redundancy and dependency. 1NF: atomic values, no repeating groups. 2NF: 1NF + no partial dependency on composite keys. 3NF: 2NF + no transitive dependency (non-key attributes depend only on primary key). Higher forms (BCNF, 4NF) address edge cases. Denormalization intentionally adds redundancy for read performance. Most production databases aim for 3NF with selective denormalization."
    if 'acid' in q:
        return "ACID ensures reliable database transactions: Atomicity (all or nothing - transaction completes fully or not at all), Consistency (data stays valid per constraints), Isolation (concurrent transactions don't interfere, levels: Read Uncommitted → Serializable), Durability (committed data persists even after crash). Different isolation levels trade consistency for performance. PostgreSQL, MySQL InnoDB, and SQL Server support ACID; NoSQL databases often sacrifice ACID for scalability."
    if 'cache' in q or 'caching' in q:
        return "Caching stores frequently accessed data in fast storage (memory) to reduce latency and database load. Common strategies: Cache-Aside (app checks cache first, then DB), Read-Through (cache auto-loads from DB on miss), Write-Through (write to cache and DB simultaneously), Write-Behind (write to cache, async write to DB). Redis and Memcached are popular. Cache invalidation is hard - TTL-based expiration, event-driven invalidation, or version-based approaches."
    if 'microservice' in q:
        return "Microservices architecture splits applications into small, independently deployable services communicating via APIs (REST, gRPC, message queues). Benefits: independent scaling, technology diversity, team autonomy, faster deployments. Challenges: distributed data management, inter-service communication complexity, testing, monitoring, eventual consistency. Patterns: API Gateway, Service Discovery, Circuit Breaker, Saga for distributed transactions, CQRS/Event Sourcing."
    if 'authentication' in q or 'jwt' in q or 'oauth' in q:
        return "Authentication verifies identity; Authorization controls access. JWT (JSON Web Token) is a stateless token with encoded user data and expiry, signed with a secret. OAuth 2.0 is an authorization framework with four grant types: Authorization Code (most secure, for web apps), PKCE (mobile/SPA), Client Credentials (server-to-server), and Implicit (deprecated). Best practices: HTTPS only, short-lived tokens, refresh tokens, HttpOnly cookies, CSRF protection."
    return f"For a {level.lower()} Backend Developer: {question}. " + generate_generic_fallback("Backend Developer", level, question)

def generate_fullstack_answer(level, question, q):
    if 'full stack' in q or 'fullstack' in q:
        return "Full Stack Development means working across the entire technology stack: frontend (HTML/CSS/JavaScript, frameworks like React/Vue/Angular), backend (Node.js/Python/Java, API design), database (SQL/NoSQL, schema design, ORM), and deployment (CI/CD, cloud services, Docker). A good full stack developer understands the complete data flow from user interaction to database persistence and back, enabling end-to-end feature implementation and system design."
    if 'mern' in q or 'mean' in q:
        return "MERN stands for MongoDB (NoSQL database), Express (Node.js web framework), React (frontend library), Node.js (server runtime). MEAN replaces React with Angular. MERN is popular for its full-JavaScript stack, fast prototyping, and rich ecosystem. MongoDB's flexible schema pairs well with JavaScript objects, Express handles routing middleware, React's component model builds reactive UIs, and Node.js provides non-blocking I/O for scalability."
    return generate_generic_answer("Full Stack Developer", level, question, q)

def generate_datascience_answer(level, question, q):
    if 'overfitting' in q or 'overfitting' in q:
        return "Overfitting occurs when a model learns training data too well, including noise and random fluctuations, failing to generalize to new data. Signs: high training accuracy but poor validation/test accuracy. Solutions: (1) More training data, (2) Regularization (L1/L2), (3) Cross-validation, (4) Early stopping, (5) Dropout (neural networks), (6) Feature selection/reduction, (7) Ensemble methods (Random Forest reduces overfitting vs single decision tree), (8) Simplify the model."
    if 'bias' in q and 'variance' in q:
        return "Bias-Variance Tradeoff: Bias is error from overly simplistic assumptions (underfitting - missing relevant patterns). Variance is error from excessive sensitivity to training data (overfitting - capturing noise). High bias: model is too simple (linear regression on non-linear data). High variance: model is too complex (deep decision tree). Goal: find the sweet spot that minimizes total error. Techniques: cross-validation for model selection, regularization to control complexity."
    if 'p-value' in q or 'p value' in q:
        return "A p-value measures the probability of obtaining test results at least as extreme as observed, assuming the null hypothesis is true. Common threshold: 0.05. p < 0.05 suggests statistical significance (reject null hypothesis). Important caveats: p-values don't measure effect size or practical significance; they're affected by sample size (large samples can produce tiny p-values for trivial effects); p-hacking (running many tests until p < 0.05) invalidates results."
    if 'regression' in q and ('linear' in q or 'logistic' in q):
        return "Linear Regression predicts continuous values using a linear combination of features: y = β0 + β1x1 + ... + βnxn + ε, minimizing MSE. Assumptions: linearity, independence, homoscedasticity, normality of residuals. Logistic Regression predicts binary outcomes using sigmoid function: P(y=1) = 1/(1+e^(-z)). Output is probability (0-1), decision threshold typically 0.5. Coefficients give log-odds ratios. Both are interpretable, fast, and good baselines."
    if 'decision tree' in q or 'random forest' in q:
        return "Decision Trees recursively split data based on feature values, creating if-then-else rules. Splitting criteria: Gini Impurity (classification) or MSE (regression). Prone to overfitting without pruning (max_depth, min_samples_split). Random Forest builds many trees on bootstrapped data with random feature subsets, averaging predictions. This reduces variance while maintaining low bias. Key hyperparameters: n_estimators (100-1000), max_features (sqrt(n) for classification), max_depth."
    if 'pca' in q or 'principal component' in q:
        return "PCA (Principal Component Analysis) reduces dimensionality by finding orthogonal axes (principal components) that maximize variance. Steps: standardize data → compute covariance matrix → find eigenvectors/values → select top k components. Uses: visualization (2D/3D), noise reduction, feature compression, multicollinearity handling. Limitations: components are hard to interpret (linear combinations of all features), assumes linearity, sensitive to scaling."
    if 'confusion matrix' in q or 'precision' in q or 'recall' in q or 'f1' in q:
        return "Confusion Matrix: TP (correctly predicted positive), TN (correctly predicted negative), FP (Type I error - false alarm), FN (Type II error - miss). Precision = TP/(TP+FP) — how many predicted positives are actually positive. Recall = TP/(TP+FN) — how many actual positives were found. F1 = 2*(Precision*Recall)/(Precision+Recall) — harmonic mean balancing both. Choose based on problem: high precision for spam detection (don't misclassify good emails), high recall for cancer screening (don't miss any cases)."
    return f"For {level.lower()} Data Scientist: {question}. " + generate_generic_fallback("Data Scientist", level, question)

def generate_ml_answer(level, question, q):
    if 'gradient descent' in q or 'gradient descent' in q:
        return "Gradient Descent is an optimization algorithm minimizing loss by iteratively moving in the direction of steepest descent (negative gradient). Types: Batch GD (full dataset - accurate but slow), Stochastic GD (one sample per step - fast but noisy), Mini-batch GD (balanced, most common). Learning rate controls step size: too high → overshoot, too low → slow convergence. Momentum, Adam, RMSprop are adaptive variants that improve convergence."
    if 'cnn' in q or 'convolution' in q:
        return "CNNs (Convolutional Neural Networks) use convolutional layers with learnable filters (kernels) that slide over input, detecting spatial patterns like edges, textures, and shapes. Architecture: Conv layers (feature extraction) → Activation (ReLU) → Pooling (downsampling: max/avg) → Fully Connected (classification). Key concepts: parameter sharing (filters reused across spatial positions), local connectivity (each neuron sees only a local region - receptive field), hierarchical feature learning."
    if 'rnn' in q or 'lstm' in q or 'recurrent' in q:
        return "RNNs process sequential data by maintaining a hidden state that captures information from previous steps. Problem: vanishing/exploding gradients for long sequences. LSTM (Long Short-Term Memory) solves this with gating mechanisms: forget gate (what to discard), input gate (what to store), output gate (what to output), plus a cell state for long-term memory. GRU is a simpler variant. Modern alternatives: Transformers with self-attention (no recurrence, handles long-range dependencies better)."
    if 'transformer' in q or 'attention' in q or 'self-attention' in q:
        return "Transformers process sequences using self-attention instead of recurrence. Self-attention computes weighted sums of all positions: Q (query) × K (key)^T → attention scores → softmax → multiply by V (values). Multi-head attention runs this in parallel across representation subspaces. Architecture: encoder (bidirectional, BERT-style) + decoder (auto-regressive, GPT-style). Positional encoding adds sequence order. Transformers enable parallel computation, capture long-range dependencies, and scale to massive datasets."
    if 'model deployment' in q or 'model deployment' in q:
        return "Model deployment makes ML models available in production. Options: REST API (Flask/FastAPI + Docker), batch inference (scheduled jobs), streaming (Kafka + model serving), edge/on-device (TensorFlow Lite, Core ML). MLOps practices: version control (DVC/MLflow for models + data), containerization (Docker), CI/CD pipelines, A/B testing, canary deployments, monitoring (data drift, model degradation), automated retraining, feature stores (Feast/Tecton)."
    if 'overfitting' in q and 'machine learning' in q:
        return "Overfitting in ML means the model memorizes training data instead of learning generalizable patterns. Diagnosis: large gap between training and validation metrics. Cures: (1) Cross-validation (k-fold), (2) Regularization (L1/L2, weight decay), (3) More data or data augmentation, (4) Early stopping, (5) Dropout (randomly deactivate neurons during training), (6) Ensemble methods, (7) Feature selection, (8) Model pruning/compression, (9) Simpler model architecture."
    return f"For {level.lower()} ML Engineer: {question}. " + generate_generic_fallback("Machine Learning Engineer", level, question)

def generate_devops_answer(level, question, q):
    if 'docker' in q and 'container' in q:
        return "Docker containers package applications with their dependencies into lightweight, portable units. Unlike VMs (each with full OS), containers share the host OS kernel, making them faster to start and less resource-intensive. Dockerfile defines the build process: FROM (base image), RUN (commands), COPY/ADD (files), EXPOSE (ports), CMD/ENTRYPOINT (start command). Docker Compose defines multi-container applications. Best practices: multi-stage builds, minimal base images (Alpine), .dockerignore, one process per container."
    if 'kubernetes' in q or 'k8s' in q:
        return "Kubernetes orchestrates container deployments across clusters. Core objects: Pod (smallest deployable unit, 1+ containers), Service (stable network endpoint, load balancing), Deployment (desired state for Pods - rolling updates, rollback), ConfigMap/Secret (configuration), Ingress (external HTTP routing), PersistentVolume (storage). kubectl manages the cluster. Key concepts: self-healing (restarts failed containers), horizontal auto-scaling (HPA), service discovery, and declarative configuration (YAML manifests)."
    if 'ci/cd' in q or 'cicd' in q or 'ci/cd' in q:
        return "CI/CD automates building, testing, and deploying code. Continuous Integration: developers merge frequently, automated builds + tests catch issues early. Continuous Delivery: code is always ready for deployment (manual approval). Continuous Deployment: every passing change deploys automatically. Tools: Jenkins, GitHub Actions, GitLab CI, CircleCI. Pipeline stages: lint → test → build → package → deploy. Quality gates: unit tests, integration tests, security scans, performance benchmarks."
    if 'terraform' in q or 'iac' in q or 'infrastructure as code' in q:
        return "Infrastructure as Code (IaC) manages infrastructure through configuration files rather than manual processes. Terraform (HashiCorp) uses declarative HCL syntax to define cloud resources (AWS, GCP, Azure). Key concepts: state file (tracks real-world resources), plan (shows changes before applying), apply (executes changes), modules (reusable components). Best practices: remote state backend (S3/DynamoDB), state locking, version control for .tf files, workspaces for environments."
    if 'monitoring' in q or 'prometheus' in q or 'grafana' in q:
        return "Monitoring provides visibility into system health. Prometheus collects metrics via pull model with time-series database, powerful PromQL query language, and alerting (AlertManager). Grafana visualizes metrics from Prometheus and other sources in dashboards. The Four Golden Signals: Latency (response time), Traffic (requests/sec), Errors (error rate), Saturation (resource usage). USE method for resources: Utilization, Saturation, Errors. RED method for services: Rate, Errors, Duration."
    if 'linux' in q and ('command' in q or 'process' in q):
        return "Essential Linux commands for DevOps: ps aux (process list), top/htop (real-time monitoring), netstat/ss (network connections), df -h (disk space), du -sh (directory size), journalctl (system logs), systemctl (service management), grep/sed/awk (text processing), chmod/chown (permissions), curl (HTTP requests), ssh (remote access), rsync (file sync), cron/systemd timers (scheduling). Understanding process signals (SIGTERM=15 graceful, SIGKILL=9 force) is crucial."
    return f"For {level.lower()} DevOps Engineer: {question}. " + generate_generic_fallback("DevOps Engineer", level, question)

def generate_pm_answer(level, question, q):
    if 'roadmap' in q:
        return "A product roadmap is a strategic document outlining the product's vision, direction, and priorities over time. It communicates what the team will build and why. Effective roadmaps focus on outcomes (problems to solve) rather than features. Common formats: theme-based (grouped by objectives), time-based (quarterly), now-next-later. Stakeholder alignment happens through regular roadmap reviews. Avoid over-committing to dates - roadmaps should be flexible and evolve with new information."
    if 'stakeholder' in q:
        return "Stakeholder management involves identifying, understanding, and balancing needs of everyone invested in product success: executives (strategic alignment), engineering (feasibility), design (user experience), sales (revenue goals), customers (user needs). Key practices: regular sync meetings, transparent communication about trade-offs, managing expectations with data-backed prioritization, and building trust through consistent delivery. RACI matrix helps clarify roles and responsibilities."
    if 'mvp' in q or 'minimum viable product' in q:
        return "MVP (Minimum Viable Product) is the smallest version of a product that delivers value to early customers and provides maximum learning with minimal effort. It's not about building less - it's about learning what matters. Define success metrics before building (activation rate, retention). Build → Measure → Learn cycle. Examples: Dropbox's explainer video MVP validated demand before building. Airbnb's basic rental site proved the model. Common mistake: building a 'minimum viable feature set' instead of testing the riskiest assumption."
    if 'user story' in q or 'user story' in q:
        return "User stories follow the format: 'As a [user type], I want to [action] so that [benefit].' They capture the user's perspective, not technical requirements. INVEST criteria: Independent, Negotiable, Valuable, Estimable, Small, Testable. Acceptance criteria define done. Epics are large stories broken into smaller ones. Story mapping visualizes the user journey. Best practices: focus on value (why), not implementation (how); keep conversations around the story; refine stories before sprints."
    if 'agile' in q and 'scrum' in q:
        return "Agile is an iterative approach emphasizing flexibility, collaboration, and customer feedback. Scrum is the most popular framework: Sprints (2-week iterations), Daily Standup (15-min sync), Sprint Planning (commit to work), Sprint Review (demo to stakeholders), Retrospective (improve process). Roles: Product Owner (prioritizes backlog), Scrum Master (coaches agile practices), Development Team (builds). Key metrics: Velocity (story points/sprint), Burndown charts (remaining work)."
    if 'a/b test' in q or 'ab test' in q or 'experiment' in q:
        return "A/B testing compares two variants (A=control, B=variant) to determine which performs better. Process: (1) Form hypothesis with clear metrics, (2) Randomly assign users to variants, (3) Run test with sufficient sample size, (4) Analyze using statistical significance (p < 0.05, 95% confidence). Common pitfalls: stopping too early (peeking), multiple comparison issues, Simpson's Paradox (segmentation effects), novelty effect (users react differently to new things). Minimum runtime: 1-2 full business cycles."
    return f"For a {level.lower()} Product Manager: {question}. " + generate_generic_fallback("Product Manager", level, question)

def generate_ux_answer(level, question, q):
    if 'design thinking' in q or 'design thinking' in q:
        return "Design Thinking is a human-centered problem-solving approach with five phases: Empathize (understand users through research), Define (articulate the problem), Ideate (brainstorm solutions), Prototype (create low-fidelity versions), Test (validate with users). It's iterative - insights from testing feed back into earlier phases. Key principles: bias toward action, embrace experimentation, fail fast, show don't tell, radical collaboration across disciplines."
    if 'wireframe' in q or 'prototype' in q:
        return "Wireframes are low-fidelity skeletal layouts showing structure, content hierarchy, and functionality without visual design. They focus on layout, information architecture, and user flow. Prototypes are interactive simulations (Figma, Sketch, Axure) ranging from low-fidelity (clickable wireframes) to high-fidelity (near-final visual design). Prototypes validate interactions before development, reducing costly changes. Fidelity should match the testing goal: test flows with low-fi, visual design with hi-fi."
    if 'usability' in q and ('testing' in q or 'test' in q):
        return "Usability testing observes real users completing tasks on a product to identify issues and gather feedback. Types: moderated (researcher guides the session) vs unmoderated (users complete tasks independently), in-person vs remote. Process: (1) Define objectives, (2) Recruit representative users (5-8 participants typically find 80%+ issues), (3) Create task scenarios, (4) Conduct sessions (think-aloud protocol), (5) Analyze findings, (6) Prioritize and fix issues. Nielsen's 10 usability heuristics guide evaluation."
    if 'accessibility' in q or 'a11y' in q or 'wcag' in q:
        return "Accessibility ensures products are usable by people with disabilities. WCAG 2.1 has four principles: Perceivable (content must be presentable to all senses), Operable (interface navigation must work for all), Understandable (content and UI must be comprehensible), Robust (content must work with current/future assistive technologies). Three conformance levels: A (minimum), AA (standard - legal requirement in many countries), AAA (highest). Key practices: semantic HTML, proper ARIA labels, sufficient color contrast (4.5:1 for text), keyboard navigation."
    if 'information architecture' in q or 'ia' in q:
        return "Information Architecture (IA) organizes content to help users find information efficiently. Core components: organization systems (how content is categorized, e.g., hierarchical, chronological, faceted), labeling systems (how content is named), navigation systems (how users browse), search systems (how users find specific content). Card sorting helps understand users' mental models. Tree testing validates IA effectiveness. Good IA reduces cognitive load, improves findability, and increases task completion rates."
    if 'user research' in q or 'user research' in q:
        return "User research systematically investigates user behaviors, needs, and motivations. Quantitative methods: surveys (scale), analytics (what users do), A/B testing (which version performs better). Qualitative methods: interviews (deep insights), contextual inquiry (observe in natural environment), diary studies (longitudinal), focus groups (group dynamics). Generative research (discover what to build) informs strategy. Evaluative research (test designs) validates solutions. Always triangulate multiple research methods."
    return f"For a {level.lower()} UX Designer: {question}. " + generate_generic_fallback("UX Designer", level, question)

def generate_ba_answer(level, question, q):
    if 'requirement' in q and ('gathering' in q or 'elicitation' in q):
        return "Requirement elicitation gathers stakeholder needs through: interviews (one-on-one deep dives), workshops (collaborative group sessions), surveys (broad quantitative data), document analysis (existing process documentation), observation (shadowing users), prototyping (visualizing requirements). MoSCoW prioritization: Must-have, Should-have, Could-have, Won't-have. Requirements should follow INVEST: Independent, Negotiable, Valuable, Estimable, Small, Testable."
    if 'sdlc' in q or 'waterfall' in q or 'agile' in q:
        return "SDLC (Software Development Life Cycle): Waterfall (sequential: requirements → design → implementation → verification → maintenance) works for well-defined projects with stable requirements. Agile (iterative: sprints with continuous feedback) suits evolving requirements. V-Model pairs testing phases with development phases. Spiral combines prototyping with risk analysis. As a BA, adapt your approach: use Waterfall artifacts (BRD, FSD) for regulated industries, Agile user stories for fast-moving products."
    if 'uml' in q or 'use case' in q or 'diagram' in q:
        return "UML diagrams visualize system design. Structural diagrams: Class Diagram (system entities and relationships), Component Diagram (system architecture). Behavioral diagrams: Use Case Diagram (user-system interactions), Activity Diagram (process flows), Sequence Diagram (interaction over time). As a BA, you frequently create: Use Case diagrams (scope and actors), Activity diagrams (business processes), and Sequence diagrams (system interactions). Tools: Lucidchart, Draw.io, Visio."
    return f"For a {level.lower()} Business Analyst: {question}. " + generate_generic_fallback("Business Analyst", level, question)

def generate_ops_answer(level, question, q):
    if 'kpi' in q or 'kpi' in q or 'metric' in q:
        return "KPIs (Key Performance Indicators) are quantifiable measures of business performance. Operations key KPIs: Cycle Time (time to complete a process), Throughput (units produced per time), First Pass Yield (percentage without rework), OEE (Overall Equipment Effectiveness), On-Time Delivery Rate, Inventory Turnover, Customer Satisfaction (CSAT/NPS), Cost per Unit. SMART: Specific, Measurable, Achievable, Relevant, Time-bound. Dashboard tools: Tableau, Power BI, Excel."
    if 'process improvement' in q or 'lean' in q or 'six sigma' in q:
        return "Process improvement methodologies: Lean focuses on eliminating waste (MUDA - 7 wastes: defects, overproduction, waiting, non-utilized talent, transportation, inventory, motion, extra-processing). Six Sigma reduces variation using DMAIC: Define (problem), Measure (baseline), Analyze (root cause), Improve (solutions), Control (sustain). Kaizen is continuous small improvements. Value Stream Mapping visualizes the entire process to identify bottlenecks and waste."
    if 'supply chain' in q:
        return "Supply chain management coordinates production, shipment, and distribution of products. Key concepts: upstream (suppliers) → internal (manufacturing) → downstream (distributors, retailers, customers). Logistics handles transportation (ocean, air, truck, rail) and warehousing. Inventory management methods: Just-in-Time (minimize inventory), EOQ (Economic Order Quantity), ABC analysis (segment by value). Modern trends: supply chain digitization, blockchain for traceability, predictive analytics for demand forecasting."
    return f"For a {level.lower()} Operations Analyst: {question}. " + generate_generic_fallback("Operations Analyst", level, question)

def generate_sales_answer(level, question, q):
    if 'prospecting' in q:
        return "Prospecting is identifying and qualifying potential customers. Methods: cold calling/emailing, social selling (LinkedIn), networking events, referrals, content marketing (blogs/webinars), and inbound lead generation. BANT framework: Budget (can they afford?), Authority (decision maker?), Need (problem to solve?), Timeline (when buying?). Modern approach prioritizes value-first relationship building over aggressive pitching. Tools: Salesforce/HubSpot CRM, LinkedIn Sales Navigator."
    if 'negotiation' in q:
        return "Negotiation is reaching mutually beneficial agreements. Key principles: (1) Know your BATNA (Best Alternative to Negotiated Agreement), (2) Focus on interests not positions, (3) Aim for win-win outcomes for long-term relationships, (4) Listen more than you talk, (5) Use silence strategically, (6) Justify value before discussing price. Common techniques: anchoring (first offer sets expectations), mirroring, labeling emotions, asking calibrated questions (how/what instead of why)."
    if 'objection' in q:
        return "Handling objections is responding to customer concerns. Common objections: price ('too expensive'), timing ('not now'), product ('not a fit'), competition ('using competitor'). LAER model: Listen (understand fully), Acknowledge (validate their concern), Explore (ask probing questions), Respond (address with evidence). Always uncover the real objection behind the stated one. Turn objections into opportunities to demonstrate value. Preparation with objection handling scripts helps."
    return f"For a {level.lower()} Sales Representative: {question}. " + generate_generic_fallback("Sales Representative", level, question)

def generate_mktg_spec_answer(level, question, q):
    if 'seo' in q or 'seo' in q:
        return "SEO (Search Engine Optimization) improves organic search rankings. On-page SEO: keyword research (tools: Ahrefs, SEMrush), meta tags (title, description), header hierarchy (H1-H6), content quality (E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness), internal linking, image optimization (alt text, compression). Off-page SEO: backlinks (quality over quantity), guest posting, influencer outreach. Technical SEO: site speed (Core Web Vitals), mobile-friendliness, sitemap.xml, robots.txt, schema markup."
    if 'content marketing' in q or 'content marketing' in q:
        return "Content marketing creates valuable, relevant content to attract and retain customers. Formats: blog posts, videos, podcasts, infographics, whitepapers, case studies, email newsletters. Strategy: (1) Define audience personas, (2) Map content to buyer's journey (Awareness → Consideration → Decision), (3) Create content pillar + cluster model, (4) Distribute across channels (organic social, email, paid), (5) Measure (traffic, engagement, leads, conversions). Repurpose high-performing content across formats."
    if 'social media' in q or 'social media' in q:
        return "Social media marketing uses platforms (LinkedIn, Instagram, TikTok, Twitter/X, Facebook) to connect with audiences. Platform strategy depends on audience and goals: LinkedIn for B2B/professional, Instagram/TikTok for visual brands and Gen Z, Twitter for real-time engagement. Key metrics: reach, engagement rate, click-through rate, conversion rate. Content mix: 80% value/entertainment, 20% promotional. Community management: respond to comments, engage with followers, monitor brand mentions."
    if 'email marketing' in q:
        return "Email marketing delivers targeted messages to subscribers. Types: newsletters (regular updates), promotional (offers/launches), transactional (order confirmations, password resets), drip campaigns (automated sequences based on behavior). Metrics: open rate (subject line effectiveness), click-through rate (content relevance), conversion rate (goal completion), unsubscribe rate. Best practices: permission-based lists (GDPR/CAN-SPAM compliant), segmentation (demographics, behavior, lifecycle stage), personalization (name, preferences), A/B test subject lines."
    return f"For a {level.lower()} Marketing Specialist: {question}. " + generate_generic_fallback("Marketing Specialist", level, question)

def generate_mktg_mgr_answer(level, question, q):
    if 'marketing strategy' in q or 'marketing strategy' in q:
        return "A marketing strategy is a comprehensive plan aligning business goals with market opportunities. Components: (1) Situation Analysis (SWOT, PESTLE, competitive analysis), (2) Target Audience (segmentation, personas), (3) Value Proposition (unique differentiation), (4) Marketing Mix (Product, Price, Place, Promotion - the 4Ps), (5) Channel Strategy (owned, earned, paid media), (6) Budget Allocation (ROI-based), (7) KPIs and Measurement Framework. Annual planning cycle with quarterly reviews."
    if 'brand' in q:
        return "Brand management builds and maintains a brand's identity and reputation. Elements: brand purpose (why you exist), positioning (how you're different), personality (human characteristics), visual identity (logo, colors, typography), voice/tone (how you communicate). Brand equity measures the value derived from consumer perception. Building strong brands requires consistency across all touchpoints, emotional connection with customers, and delivering on promises. NPS (Net Promoter Score) measures brand loyalty."
    if 'budget' in q or 'budget' in q:
        return "Marketing budget planning allocates resources across channels and initiatives. Common allocation models: percentage of revenue (typically 5-15%), competitive parity (match competitors), objective-and-task (budget based on goals). Key considerations: balance between brand building (long-term) and performance marketing (short-term), seasonal variation, test-and-learn budget (10-15% for experimentation). Track ROAS (Return on Ad Spend), CAC (Customer Acquisition Cost), and blended CAC across channels."
    return f"For a {level.lower()} Marketing Manager: {question}. " + generate_generic_fallback("Marketing Manager", level, question)

def generate_fin_answer(level, question, q):
    if 'financial statement' in q or 'balance sheet' in q or 'income statement' in q or 'cash flow' in q:
        return "The three financial statements: (1) Balance Sheet shows Assets = Liabilities + Equity at a point in time - what the company owns vs owes. (2) Income Statement shows revenue minus expenses over a period - profitability. (3) Cash Flow Statement shows actual cash inflows/outflows from operations, investing, and financing activities. Together they provide a complete financial picture: the balance sheet connects the income statement (net income flows to retained earnings) and cash flow statement explains changes in cash."
    if 'dcf' in q or 'discounted cash flow' in q:
        return "DCF (Discounted Cash Flow) valuation projects future cash flows and discounts them to present value. Formula: PV = CF1/(1+r)^1 + CF2/(1+r)^2 + ... + TV/(1+r)^n. Steps: (1) Project FCF (Free Cash Flow) for 5-10 years, (2) Calculate Terminal Value (Gordon Growth Model or Exit Multiple), (3) Discount using WACC, (4) Add to get Enterprise Value, (5) Subtract net debt to get Equity Value. WACC = E/(E+D)*Ke + D/(E+D)*Kd*(1-t). Strengths: intrinsic valuation. Weaknesses: heavily dependent on assumptions."
    if 'ratio' in q and ('financial' in q or 'liquidity' in q or 'profitability' in q):
        return "Financial ratios analyze company performance: Liquidity ratios: Current Ratio (CA/CL > 1.5), Quick Ratio ((CA-Inventory)/CL > 1.0). Profitability ratios: Gross Margin (Gross Profit/Revenue), Net Margin (Net Income/Revenue), ROE (Net Income/Equity), ROA (Net Income/Assets). Leverage ratios: Debt-to-Equity (Total Debt/Equity < 2), Interest Coverage (EBIT/Interest > 3). Efficiency ratios: Inventory Turnover (COGS/Avg Inventory), Receivables Turnover (Revenue/Avg AR). Always compare to industry benchmarks and historical trends."
    if 'valuation' in q:
        return "Valuation approaches: (1) Market Approach - Comps (EV/EBITDA, P/E, P/S multiples of comparable companies), Precedent Transactions (what acquirers paid for similar companies). (2) Income Approach - DCF (intrinsic value based on future cash flows). (3) Cost Approach - Book Value, Replacement Cost. The football field chart visualizes valuation ranges from different methods. No single method is perfect - triangulate across methods for a reasonable range."
    return f"For a {level.lower()} Financial Analyst: {question}. " + generate_generic_fallback("Financial Analyst", level, question)

def generate_acct_answer(level, question, q):
    if 'debit' in q and 'credit' in q:
        return "Double-entry accounting: every transaction affects at least two accounts with equal debits and credits. Debit (Dr) = left side: increases assets and expenses, decreases liabilities and equity. Credit (Cr) = right side: increases liabilities, equity, and revenue, decreases assets and expenses. Accounting equation: Assets = Liabilities + Equity. Journal entries always balance: Debits = Credits. Example: buying equipment with cash: Dr Equipment (asset up), Cr Cash (asset down)."
    if 'gaap' in q or 'ifrs' in q or 'gaap' in q:
        return "GAAP (Generally Accepted Accounting Principles, US) and IFRS (International Financial Reporting Standards, 140+ countries) are accounting frameworks. Key differences: (1) LIFO inventory is allowed under GAAP, prohibited under IFRS, (2) Development costs are expensed under GAAP, capitalized under IFRS, (3) Revenue recognition: GAAP is more rules-based, IFRS more principles-based, (4) Lease accounting classification differs. Convergence efforts continue but differences remain. IFRS tends to be simpler and more flexible."
    if 'depreciation' in q:
        return "Depreciation allocates the cost of a fixed asset over its useful life. Methods: (1) Straight-Line: (Cost - Salvage Value) / Useful Life - simplest, equal expense each year. (2) Double-Declining Balance: 2 × Straight-Line Rate × Book Value - accelerated, higher expense early. (3) Units of Production: based on actual usage. Journal entry: Dr Depreciation Expense (P&L), Cr Accumulated Depreciation (contra-asset). Asset book value = Cost - Accumulated Depreciation."
    if 'accrual' in q or 'accrual' in q:
        return "Accrual accounting records revenues when earned and expenses when incurred, regardless of cash flow. Revenue Recognition Principle: recognize when earned (product delivered/service performed). Matching Principle: match expenses to related revenues. Accrued Revenue (asset): earned but not yet billed. Accrued Expenses (liability): incurred but not yet paid. Prepaid Expenses (asset): paid in advance. Deferred Revenue (liability): cash received before earning. Accrual accounting gives a more accurate picture than cash basis."
    return f"For a {level.lower()} Accountant: {question}. " + generate_generic_fallback("Accountant", level, question)

def generate_audit_answer(level, question, q):
    if 'audit' in q and ('process' in q or 'procedure' in q or 'phase' in q):
        return "The audit process has four phases: (1) Planning - understand business, assess risk, materiality determination, audit strategy, (2) Risk Assessment - identify (F:S)P of material misstatement (inherent risk × control risk), design audit procedures, (3) Substantive Procedures - test account balances, transactions, and disclosures through inspection, confirmation, recalculation, analytical procedures, (4) Reporting - audit opinion (unqualified, qualified, adverse, disclaimer), management letter with internal control recommendations."
    if 'internal control' in q or 'internal control' in q:
        return "Internal controls are processes ensuring reliable financial reporting, operational effectiveness, and regulatory compliance. COSO framework: five components - Control Environment (tone at the top, integrity), Risk Assessment (identify fraud/error risks), Control Activities (segregation of duties, approvals, reconciliations), Information & Communication (financial reporting), Monitoring (ongoing evaluations). Segregation of Duties is critical: authorization, custody, and record-keeping should be separated."
    if 'materiality' in q:
        return "Materiality determines the threshold for misstatements that could influence user decisions. Quantitative: typically 5% of net income or 0.5-1% of revenue/assets. Qualitative: even small amounts can be material if they conceal illegal activities, affect compliance, or change earnings trends. Performance materiality is lower (50-75% of overall materiality) to allow for uncorrected aggregate misstatements. Clearly Trivial Threshold is even lower (1-5% of materiality) - amounts below this are deemed immaterial regardless."
    if 'sox' in q or 'sarbanes' in q:
        return "SOX (Sarbanes-Oxley Act 2002) was enacted after Enron/WorldCom scandals. Key provisions: Section 302 - management certification of financial statements (CEO/CFO personal liability). Section 404 - management assessment and auditor attestation of internal controls over financial reporting (most expensive section to implement). Section 409 - real-time issuer disclosures. SOX created the PCAOB (Public Company Accounting Oversight Board) to oversee auditors. Compliance requires extensive documentation and testing of controls."
    return f"For a {level.lower()} Auditor: {question}. " + generate_generic_fallback('Auditor', level, question)

def generate_ib_answer(level, question, q):
    if 'valuation' in q and ('method' in q or 'approach' in q):
        return "Three main valuation methodologies: (1) Comparable Company Analysis (Comps): value based on trading multiples (EV/EBITDA, P/E, P/S) of similar public companies. (2) Precedent Transactions: value based on multiples paid in similar M&A deals (includes control premium). (3) DCF: intrinsic value based on projected free cash flows discounted to present. Football field chart compiles all three. WACC is the discount rate: cost of equity (CAPM) × weight + after-tax cost of debt × weight."
    if 'lbo' in q or 'leveraged buyout' in q:
        return "LBO (Leveraged Buyout) uses significant debt to acquire a company. Key metric: IRR (Internal Rate of Return) target typically 20%+. Debt typically 60-70% of purchase price. Sources of repayment: operational cash flow, debt paydown, multiple expansion, EBITDA growth. Important metrics: Debt/EBITDA leverage ratio (entry usually 4-6x), Interest Coverage (EBITDA/Interest > 2x). Exit after 5-7 years via sale, IPO, or dividend recapitalization."
    if 'm&a' in q or 'merger' in q or 'acquisition' in q:
        return "M&A process: (1) Strategy & Targeting - identify acquisition criteria, (2) Valuation & Screening - financial analysis, target identification, (3) Negotiation - LOI (Letter of Intent) with indicative price, exclusivity, (4) Due Diligence - financial, legal, commercial, operational, tax, (5) Definitive Agreement - SPA (Stock Purchase Agreement) or APA (Asset Purchase Agreement), (6) Closing & Integration. Accretion/Dilution analysis determines if EPS increases (accretive) or decreases (dilutive). Synergies: cost savings + revenue enhancement."
    if 'dcf' in q or 'discounted cash' in q:
        return "DCF steps for IB interviews: (1) Project FCF = EBIT × (1-t) + D&A - CapEx - Δ Working Capital, (2) Project 5-10 years, (3) Calculate Terminal Value: Gordon Growth (FCF × (1+g)/(WACC-g)) or Exit Multiple (EBITDA × EBITDA multiple), (4) Discount FCFs and TV to present using WACC, (5) Enterprise Value = PV of FCFs + PV of TV, (6) Equity Value = EV - Net Debt - Preferred Stock - Non-controlling Interest. Check your assumptions are realistic and justifiable."
    if 'three statements' in q or 'three financial' in q or '3 statements' in q:
        return "The three financial statements in IB: Income Statement (revenue - expenses = net income), Balance Sheet (assets = liabilities + equity), Cash Flow Statement (operating + investing + financing = net cash change). Linkages: Net Income flows from IS to CFS (operating) and BS (retained earnings). Depreciation adds back in CFS (non-cash expense) and reduces PP&E on BS. Changes in WC on CFS explains difference between net income and cash from operations. Debt issuance/repayment on CFS connects to BS debt."
    return f"For a {level.lower()} Investment Banking Analyst: {question}. " + generate_generic_fallback('Investment Banking Analyst', level, question)

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_answers.py <json_file>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    print(f"Processing: {filepath}")
    
    data = load_json(filepath)
    position = data.get('position', 'Unknown')
    questions = data.get('questions', {})
    
    # Generate answers
    answers = {}
    all_tags = {}
    for level, qs in questions.items():
        level_answers = []
        level_tags = []
        for i, q in enumerate(qs):
            answer = generate_answer(position, level, q)
            level_answers.append(answer)
            
            # Generate tags
            difficulty = get_difficulty(level, q)
            topics = infer_topics(position, level, q)
            tags = [f'#{position.lower().replace(" ", "-")}', f'#{level.lower()}', f'#{difficulty.lower()}'] + topics
            level_tags.append(tags)
        
        answers[level] = level_answers
        all_tags[level] = level_tags
    
    data['answers'] = answers
    data['tags'] = all_tags
    
    save_json(filepath, data)
    
    # Print stats
    total_q = sum(len(v) for v in questions.values())
    print(f"Position: {position}")
    for level in questions:
        print(f"  {level}: {len(questions[level])} questions + answers + tags")
    print(f"  Total: {total_q} questions with answers and tags")
    print(f"  File: {filepath}")
    print("DONE")

if __name__ == '__main__':
    main()
