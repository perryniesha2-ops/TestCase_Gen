// section-cards.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SectionCard = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  kpi?: string;
  badge?: string;
  icon?: React.ReactNode;
};

type Props = {
  items?: SectionCard[];                  
  className?: string;
  onClick?: (id: string) => void;
};

export function SectionCards({ items = [], className, onClick }: Props) {  
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {items.map((it) => (
        <Card
          key={it.id}
          className="group cursor-pointer transition hover:shadow-md"
          onClick={() => onClick?.(it.id)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">{it.title}</CardTitle>
            {it.badge && <Badge variant="secondary">{it.badge}</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            {it.kpi && <div className="text-2xl font-semibold tracking-tight">{it.kpi}</div>}
            {it.description && <p className="line-clamp-2 text-sm text-muted-foreground">{it.description}</p>}
            {it.icon && <div className="text-muted-foreground/80">{it.icon}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
