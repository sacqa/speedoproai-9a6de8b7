import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function SectionHeader({ title, viewAllTo }: { title: string; viewAllTo?: string }) {
  return (
    <div className="flex items-center justify-between mb-3 px-4 lg:px-0">
      <h2 className="text-lg lg:text-xl font-bold text-foreground">{title}</h2>
      {viewAllTo && (
        <Link
          to={viewAllTo}
          className="text-sm font-semibold text-primary flex items-center gap-1"
        >
          View All <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}