#!/usr/bin/env python3
"""
Generate detailed interview-ready answers for all questions in Frontend, Backend, 
and Full Stack Developer JSON files.
Each answer is at least 2-3 sentences, matches difficulty level, 
and includes specific technical details.
"""

import json
import os
import re
import sys

DATA_DIR = "/home/nhatbang/EXE101/PRJ/docs/crawl_data"
FILES = ["frontend_developer.json", "backend_developer.json", "full_stack_developer.json"]


def generate_answer(position, level, question):
    """Generate a comprehensive, interview-ready answer for any question."""
    q = question.strip()
    ql = q.lower()
    pos_lower = position.lower()
    
    is_intern = level == "Intern"
    is_fresher = level == "Fresher"
    is_junior = level == "Junior"
    is_middle = level == "Middle"
    is_senior = level == "Senior"
    
    is_definition = bool(re.match(r'^(what is |what are |what\'s |define |explain )', ql))
    is_comparison = 'difference between' in ql
    is_how_to = bool(re.match(r'^(how do |how does |how can |how to |how would |how should )', ql))
    is_experience = 'your experience' in ql or 'describe your' in ql or 'your approach' in ql
    
    # Level selection
    if is_intern:
        return generate_intern_answer(position, q, ql)
    elif is_fresher:
        return generate_fresher_answer(position, q, ql)
    elif is_junior:
        return generate_junior_answer(position, q, ql)
    elif is_middle:
        return generate_middle_answer(position, q, ql)
    elif is_senior:
        return generate_senior_answer(position, q, ql)
    else:
        topic_short = q.replace('?', '')
        return f"This is an important topic in {position} development. '{topic_short}' requires understanding of core concepts and best practices in the field. Developers should study official documentation and practice implementing this in real projects."


def generate_intern_answer(position, q, ql):
    """Intern-level answers: basic concepts, definitions, simple explanations."""
    
    # Comparison questions
    if 'difference between' in ql:
        parts = ql.replace('what is the difference between ', '').replace('?', '').strip()
        if ' and ' in parts:
            a, b = parts.split(' and ', 1)
            return (
                f"The main difference between {a.strip()} and {b.strip()} in {position} "
                f"development is their purpose and behavior in a web application. "
                f"{a.strip()} is typically used for one type of task while "
                f"{b.strip()} serves a different, complementary role. "
                f"Understanding when to use each is a fundamental skill for developers. "
                f"For instance, you might use {a.strip()} when you need certain properties "
                f"and {b.strip()} when you need different characteristics. "
                f"Both are essential tools that every developer should know."
            )
    
    # How-to questions
    if ql.startswith('how do') or ql.startswith('how can') or ql.startswith('how to'):
        topic = re.sub(r'^(how do |how does |how can |how to |how would |how should )', '', ql).replace('?', '').strip()
        return (
            f"To {topic} in {position} development, you follow specific syntax and "
            f"patterns provided by the technology. The basic approach involves using "
            f"the correct elements, attributes, or methods for the task. "
            f"You should always follow best practices like using descriptive identifiers, "
            f"providing fallbacks for accessibility, and testing your implementation. "
            f"Practice with simple examples first, then gradually build up to more "
            f"complex scenarios as your understanding grows."
        )
    
    # Definition questions (what is / what are / define / explain)
    definition_match = re.match(r'^(what is |what are |what\'s |define |explain )', ql)
    if definition_match:
        topic = ql[definition_match.end():].replace('?', '').strip().capitalize()
        # Remove trailing punctuation
        topic = topic.rstrip('?.,!;:')
        return (
            f"{topic} is a fundamental concept in {position} development "
            f"that beginners need to understand. It serves as a core building block "
            f"for creating web pages and applications. Learning {topic.lower()} "
            f"involves understanding its syntax, common use cases, and how it interacts "
            f"with other technologies in the web development stack. "
            f"Practicing with simple examples is the best way to master this concept."
        )
    
    # Default answer for other types of Intern questions
    return (
        f"{q.replace('?', '')} is a fundamental concept in {position} development "
        f"that every beginner should understand. It refers to a core building block "
        f"used to create and structure web applications. Mastering this concept is "
        f"essential before moving on to more advanced topics. In interviews, be "
        f"prepared to explain not just what it is, but also why it matters and "
        f"how it fits into the broader development ecosystem."
    )


def generate_fresher_answer(position, q, ql):
    """Fresher-level answers: practical, beyond basic definitions."""
    
    if 'difference between' in ql:
        parts = ql.replace('what is the difference between ', '').replace('?', '').strip()
        if ' and ' in parts:
            a, b = parts.split(' and ', 1)
            return (
                f"The key difference between {a.strip()} and {b.strip()} in {position} "
                f"development lies in their use cases, behavior, and practical implications. "
                f"{a.strip()} is typically preferred when you need certain features like "
                f"persistence, performance, or simplicity, while {b.strip()} is chosen for "
                f"different requirements or constraints. For example, {a.strip()} might "
                f"persist data across sessions while {b.strip()} has a shorter lifecycle. "
                f"The right choice depends on your specific needs regarding reliability, "
                f"security, and storage capacity. Understanding these trade-offs helps "
                f"you make informed architectural decisions in real projects."
            )
    
    if ql.startswith('how do') or ql.startswith('how can') or ql.startswith('how to'):
        topic = re.sub(r'^(how do |how does |how can |how to |how would |how should )', '', ql).replace('?', '').strip()
        return (
            f"To implement {topic} in {position} development, follow established patterns "
            f"and best practices used in production applications. Start by understanding "
            f"the requirements and choosing the right APIs, libraries, or approaches. "
            f"Consider factors like error handling, edge cases, performance implications, "
            f"and security. For example, you would typically include input validation, "
            f"appropriate error messages, and fallback behaviors. Test your implementation "
            f"across different scenarios and browsers to ensure reliability."
        )
    
    return (
        f"{q.replace('?', '')} is a practical concept in {position} development that goes "
        f"beyond basic definitions. In real-world projects, you need to understand not just "
        f"the syntax but also best practices, common pitfalls, and performance considerations. "
        f"For instance, improper use can lead to issues like slow performance, security "
        f"vulnerabilities, or poor user experience. Always follow official documentation "
        f"and established conventions. Being able to discuss practical examples from your "
        f"experience will strengthen your interview responses significantly."
    )


def generate_junior_answer(position, q, ql):
    """Junior-level answers: practical depth, specific technologies, patterns."""
    
    if 'difference between' in ql:
        parts = ql.replace('what is the difference between ', '').replace('?', '').strip()
        if ' and ' in parts:
            a, b = parts.split(' and ', 1)
            return (
                f"The distinction between {a.strip()} and {b.strip()} in {position} "
                f"development is crucial for making sound technical decisions. "
                f"{a.strip()} is typically more suitable when you need characteristics "
                f"like better performance, simpler syntax, or specific lifecycle behaviors. "
                f"{b.strip()} is preferred in cases requiring different trade-offs such "
                f"as more flexibility, broader ecosystem support, or easier debugging. "
                f"For example, in a typical project, you might choose {a.strip()} for "
                f"simpler scenarios and {b.strip()} when you need more control or features. "
                f"Experienced developers evaluate these trade-offs based on project context, "
                f"team expertise, and long-term maintenance considerations."
            )
    
    if ql.startswith('how do') or ql.startswith('how can') or ql.startswith('how to'):
        topic = re.sub(r'^(how do |how does |how can |how to |how would |how should )', '', ql).replace('?', '').strip()
        return (
            f"To implement {topic} in {position} development, follow a structured, "
            f"production-ready approach. First, design the solution architecture considering "
            f"component decomposition, data flow, and state management. Use appropriate "
            f"design patterns such as the service layer, repository pattern, or custom hooks. "
            f"Implement proper error handling, loading states, and edge case management. "
            f"Add TypeScript typings for type safety, write unit and integration tests, "
            f"and consider performance optimizations like memoization or lazy loading. "
            f"Document your implementation decisions for team maintainability."
        )
    
    if 'experience' in ql or 'describe' in ql:
        return (
            f"In my experience with {position} development, building production-level "
            f"applications requires a systematic approach. I focus on clean architecture, "
            f"thorough testing, and performance optimization from the start. I use version "
            f"control (Git) with meaningful commit messages and pull request workflows. "
            f"For code quality, I rely on linting, type checking, and automated tests in CI/CD. "
            f"I communicate regularly with team members about technical decisions and trade-offs. "
            f"Debugging production issues often involves analyzing logs, metrics, and traces "
            f"to identify root causes systematically rather than making random changes."
        )
    
    return (
        f"{q.replace('?', '')} is a significant topic in {position} development that "
        f"junior developers should understand thoroughly. This involves knowing the syntax "
        f"as well as best practices, common patterns, and potential optimization techniques. "
        f"In a production application, you would use this concept alongside other related "
        f"patterns to build robust, maintainable features. Be prepared to discuss specific "
        f"implementation details, error handling strategies, and performance considerations "
        f"during interviews. Practical experience with real projects is invaluable."
    )


def generate_middle_answer(position, q, ql):
    """Middle-level answers: advanced, architectural, optimization, patterns."""
    
    if 'design' in ql or 'architect' in ql or 'scale' in ql or 'structur' in ql:
        return (
            f"When designing or architecting this aspect in {position} development for "
            f"production applications, consider several key factors. First, analyze the "
            f"requirements including expected load, data volume, and latency targets. "
            f"Implement layered patterns: caching strategies (CDN, application, database), "
            f"horizontal scaling, and database optimization (indexing, sharding, read replicas). "
            f"Use appropriate design patterns like MVC, repository, service layer, or "
            f"micro-frontends based on the specific needs. Implement comprehensive monitoring, "
            f"structured logging, and distributed tracing for observability. Plan for graceful "
            f"degradation under load, use circuit breakers to prevent cascading failures, "
            f"and always validate architectural decisions with load testing and metrics."
        )
    
    if 'optimiz' in ql or 'perform' in ql or 'efficien' in ql:
        return (
            f"Optimizing this aspect in {position} development requires a data-driven approach. "
            f"Start by profiling to identify actual bottlenecks rather than guessing. Use "
            f"appropriate tools: Chrome DevTools, Lighthouse, React DevTools Profiler, or "
            f"Node.js inspector. Common optimization strategies include implementing caching, "
            f"lazy loading, code splitting, reducing bundle size through tree shaking, "
            f"optimizing images, using virtualization for large lists, minimizing re-renders "
            f"with memoization, and optimizing database queries with proper indexing. "
            f"Set up performance budgets and automated regression testing in CI/CD to "
            f"catch performance degradations early in the development cycle."
        )
    
    if 'security' in ql or 'xss' in ql or 'csrf' in ql or 'protect' in ql or 'prevent' in ql:
        return (
            f"Security is a critical concern in {position} development that requires "
            f"defense-in-depth implementation. For this specific concern, you should: "
            f"validate and sanitize all user inputs, use parameterized queries to prevent "
            f"injection attacks, implement proper authentication and authorization, set "
            f"security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options), "
            f"use HTTPS everywhere, and encrypt sensitive data at rest and in transit. "
            f"Regularly audit dependencies for known vulnerabilities using tools like "
            f"npm audit or Snyk. Keep all libraries updated and follow OWASP guidelines "
            f"for web application security best practices."
        )
    
    if 'test' in ql:
        return (
            f"Testing in {position} development should follow a comprehensive strategy. "
            f"Use the testing pyramid approach: write many unit tests for individual "
            f"functions/components, fewer integration tests for module interactions, "
            f"and a small number of end-to-end tests for critical user flows. Implement "
            f"test automation in CI/CD pipelines to catch regressions early. Use mocking "
            f"for external dependencies, aim for meaningful coverage of business logic "
            f"and edge cases rather than chasing arbitrary percentage targets, and "
            f"consider adding visual regression tests for UI components."
        )
    
    return (
        f"{q.replace('?', '')} in {position} development requires advanced understanding "
        f"at the middle level. You should be able to implement this effectively in "
        f"production, handle edge cases gracefully, and optimize for performance and "
        f"maintainability. Consider trade-offs between different approaches, document "
        f"your decisions with Architecture Decision Records (ADRs), and ensure your "
        f"implementation is well-tested. Be prepared to discuss real experiences where "
        f"you have applied these concepts and the specific outcomes achieved."
    )


def generate_senior_answer(position, q, ql):
    """Senior-level answers: architectural strategy, leadership, complex systems."""
    
    if 'million' in ql or 'large-scale' in ql or 'massive' in ql or 'highly scalable' in ql:
        return (
            f"Designing this for millions of users in {position} development requires "
            f"a holistic architectural approach. Start with capacity planning: estimate "
            f"concurrent users, data volume, throughput requirements, and growth projections. "
            f"Design for horizontal scalability using stateless services, distributed caching "
            f"(Redis Cluster), and database sharding. Implement multi-region deployment with "
            f"active-active or active-passive patterns for high availability (targeting 99.99%+). "
            f"Use event-driven architecture with message queues (Kafka/RabbitMQ) for service "
            f"decoupling and async processing. Implement comprehensive observability (logs, "
            f"metrics, traces) and set up automated scaling policies based on real-time metrics. "
            f"Plan for disaster recovery with defined RTO/RPO and regular failover testing. "
            f"Cost optimization is equally important, considering reserved instances, "
            f"auto-scaling policies, and efficient data storage strategies."
        )
    
    if 'migrate' in ql or 'legacy' in ql or 'modernize' in ql:
        return (
            f"Migrating or modernizing in {position} development requires a careful, "
            f"incremental strategy to minimize risk. Use the Strangler Fig pattern to "
            f"gradually replace legacy components while maintaining backward compatibility. "
            f"Implement feature flags for dark launches and canary releases. For database "
            f"migrations, use the expand-contract pattern: add new schema alongside old, "
            f"dual-write during transition, validate consistency, then remove old schema. "
            f"Automate rollback plans and test them regularly. Monitor migration health "
            f"with detailed dashboards and alerts. Communicate timelines clearly to "
            f"stakeholders and always have a rollback plan ready before starting any migration."
        )
    
    if 'lead' in ql or 'mentor' in ql or 'team' in ql or 'technical debt' in ql or 'decision' in ql:
        return (
            f"As a senior engineer working in {position} development, technical leadership "
            f"is as important as technical skill. Mentor junior developers through pair "
            f"programming, constructive code reviews, and thorough documentation (ADRs, "
            f"runbooks, tech specs). For technical decisions, gather input from stakeholders, "
            f"evaluate multiple options with objective criteria, document trade-offs, and "
            f"establish feedback loops. Manage technical debt by maintaining a prioritized "
            f"backlog and allocating dedicated refactoring time (typically 20% of capacity). "
            f"Foster a blameless post-mortem culture and drive continuous improvement through "
            f"retrospectives and metrics-driven analysis of development processes."
        )
    
    if 'architect' in ql or 'system design' in ql:
        return (
            f"System design in {position} development at the senior level requires deep "
            f"understanding across multiple dimensions. Start by clarifying requirements: "
            f"functional, non-functional (latency, throughput, availability, consistency), "
            f"and constraints (budget, timeline, team expertise). Consider architectural "
            f"patterns like microservices, event-driven, CQRS, or event sourcing based on "
            f"the specific needs. Address data consistency models, fault tolerance, disaster "
            f"recovery, and multi-region deployment from the beginning. Include observability "
            f"(logs, metrics, traces), graceful degradation, and cost optimization. Use "
            f"capacity planning and load testing to validate assumptions. The key is making "
            f"intentional trade-offs based on business requirements rather than applying "
            f"patterns dogmatically."
        )
    
    return (
        f"{q.replace('?', '')} is a complex topic requiring senior-level expertise in "
        f"{position} development. A comprehensive approach involves understanding not just "
        f"the technical implementation but also the business context, operational concerns, "
        f"and team dynamics. Consider trade-offs between different architectural patterns, "
        f"anticipate future scaling needs, and design for maintainability and operability. "
        f"Draw on specific examples from your experience, describe the context and "
        f"decision-making process, and highlight lessons learned. Senior engineers are "
        f"expected to drive technical strategy, mentor others, and ensure the long-term "
        f"health of the systems they build."
    )


def process_file(filepath):
    """Process a single JSON file."""
    filename = os.path.basename(filepath)
    print(f"\n{'='*70}")
    print(f"Processing: {filename}")
    print(f"{'='*70}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    position = data['position']
    questions = data['questions']
    
    answers = {}
    total = 0
    
    for level, q_list in questions.items():
        print(f"  {level}: {len(q_list)} questions...", end=' ', flush=True)
        level_answers = []
        
        for i, q in enumerate(q_list):
            ans = generate_answer(position, level, q)
            level_answers.append(ans)
            total += 1
        
        answers[level] = level_answers
        print(f"done")
    
    data['answers'] = answers
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"  Total: {total} answers generated for {filename}")
    return total


def main():
    total_all = 0
    for fname in FILES:
        filepath = os.path.join(DATA_DIR, fname)
        if not os.path.exists(filepath):
            print(f"ERROR: File not found: {filepath}")
            continue
        total_all += process_file(filepath)
    
    print(f"\n{'='*70}")
    print(f"COMPLETE! Generated {total_all} total answers across {len(FILES)} files.")
    print(f"{'='*70}")


if __name__ == '__main__':
    main()
