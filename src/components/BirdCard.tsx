import { Trash2 } from "lucide-react";
import type { BirdSighting } from "@/lib/bird-store";

interface Props {
  bird: BirdSighting;
  onDelete: (id: string) => void;
}

export default function BirdCard({ bird, onDelete }: Props) {
  return (
    <div className="bg-card rounded-lg overflow-hidden shadow-sm border border-border">
      <div className="aspect-square overflow-hidden">
        <img
          src={bird.photo}
          alt={bird.name || "Bird photo"}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">
              {bird.name || "Unknown Bird"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(bird.date).toLocaleDateString()}
            </p>
            {bird.notes && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {bird.notes}
              </p>
            )}
          </div>
          <button
            onClick={() => onDelete(bird.id)}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors ml-2 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
