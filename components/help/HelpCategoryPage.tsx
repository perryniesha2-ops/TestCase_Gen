import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FaqAccordion, type FaqItem } from "@/components/help/FaqAccordion"

type Props = {
  title: string
  description?: string
  badge?: string
  items: FaqItem[]
}

export function HelpCategoryPage({ title, description, badge = "Help", items }: Props) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">{badge}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <Separator />

      <FaqAccordion items={items} />
    </div>
  )
}
