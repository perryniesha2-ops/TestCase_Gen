import { HelpCategoryPage } from "@/components/help/HelpCategoryPage"
import { testCasesFaq } from "@/lib/help/faqs"

export default function TestCasesHelpPage() {
  return (
    <HelpCategoryPage
      title="Test Cases"
      description="How regular test cases work, how to execute them, and how to get better generation output."
      badge="FAQs"
      items={testCasesFaq}
    />
  )
}
