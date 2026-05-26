import { Badge } from '@/components/ui/badge'

export function EditNeededBadge() {
  return (
    <Badge
      variant="outline"
      className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
    >
      Edit needed
    </Badge>
  )
}
