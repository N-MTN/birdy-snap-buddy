import { useState, useEffect } from "react";
import { Bird } from "lucide-react";
import { getSightings, deleteSighting, type BirdSighting } from "@/lib/bird-store";
import BirdCard from "@/components/BirdCard";
import heroImg from "@/assets/hero-birds.png";
import logoImg from "@/assets/bird-logo.png";

export default function Gallery() {
  const [birds, setBirds] = useState<BirdSighting[]>([]);

  useEffect(() => {
    setBirds(getSightings());
  }, []);

  const handleDelete = (id: string) => {
    deleteSighting(id);
    setBirds(getSightings());
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="safe-area-top bg-primary">
        <div className="flex items-center gap-3 px-5 py-4">
          <img src={logoImg} alt="BirdSnap" className="w-8 h-8" width={32} height={32} />
          <h1 className="text-xl font-bold text-primary-foreground">BirdSnap</h1>
        </div>
      </div>

      {birds.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 pt-12 text-center">
          <img
            src={heroImg}
            alt="Beautiful birds illustration"
            className="w-64 h-64 object-contain rounded-2xl mb-6"
            width={1024}
            height={1024}
          />
          <Bird className="w-12 h-12 text-primary mb-3" />
          <h2 className="text-lg font-semibold text-foreground">No birds yet!</h2>
          <p className="text-muted-foreground mt-1">
            Tap <strong>Capture</strong> to photograph your first bird
          </p>
        </div>
      ) : (
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-3">
            {birds.length} sighting{birds.length !== 1 && "s"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {birds.map((bird) => (
              <BirdCard key={bird.id} bird={bird} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
