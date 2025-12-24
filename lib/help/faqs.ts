import type { FaqItem } from "@/components/help/FaqAccordion"

export const testCasesFaq: FaqItem[] = [
  {
    id: "what-is-regular",
    q: "What is a Regular Test Case?",
    a: "A structured test case created for a specific requirement or feature, typically with title, steps, and expected results.",
    tags: ["regular", "test case"],
  },
  {
    id: "execution-status",
    q: "How do execution statuses get stored (Passed/Failed/Blocked/Skipped)?",
    a: "They’re stored as execution records tied to the test case (and optionally session/suite), including notes, failed steps, and environment metadata.",
    tags: ["execution", "status", "passed", "failed"],
  },
  {
    id: "improve-quality",
    q: "How do I get higher-quality generated cases?",
    a: "Include acceptance criteria, user roles, constraints, validations, data states, and key negative scenarios (timeouts, permissions, errors).",
    tags: ["generation", "quality"],
  },
]

export const automationFaq: FaqItem[] = [
  {
    id: "what-is-automated",
    q: "What does “Automated” mean in the UI?",
    a: "It means an automation script exists and is linked to the test case ID. If no script exists, it remains Manual.",
    tags: ["automation", "scripts"],
  },
  {
    id: "suite-coverage",
    q: "What is partial automation for a suite?",
    a: "Some eligible test cases have scripts, but not all. Eligibility is usually having valid test steps.",
    tags: ["suite", "coverage"],
  },

  {
    id: "suite-coverage",
    q: "What is partial automation for a suite?",
    a: "Some eligible test cases have scripts, but not all. Eligibility is usually having valid test steps.",
    tags: ["suite", "coverage"],
  },
]
