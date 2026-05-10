import { cn } from "@/lib/utils";

type Variant = "card" | "row" | "circle";

interface DataSkeletonProps {
  variant?: Variant;
  count?: number;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  card: "h-24 w-full rounded-xl",
  row: "h-10 w-full rounded-md",
  circle: "h-10 w-10 rounded-full",
};

export function DataSkeleton({
  variant = "card",
  count = 1,
  className,
}: DataSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("animate-pulse bg-muted/70", variantClasses[variant])}
        />
      ))}
    </div>
  );
}
