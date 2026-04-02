import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, RotateCcw, ArrowLeft, Bird, Loader2 } from "lucide-react";
import { addSighting, generateId } from "@/lib/bird-store";
import { classifyBird, type ClassificationResult } from "@/lib/bird-classifier";
import { addPoints } from "@/lib/points-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

export default function Capture() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [results, setResults] = useState<ClassificationResult[]>([]);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl);
      setIsIdentifying(true);
      setResults([]);

      try {
        const top2 = await classifyBird(file);
        setResults(top2);

        if (top2[0].label === "Pas un oiseau") {
          setName("");
          toast({
            title: "Aucun oiseau détecté",
            description: "L'image ne semble pas contenir un oiseau. Vous pouvez entrer le nom manuellement.",
          });
        } else {
          setName(top2[0].label);
          addPoints(10);
          toast({
            title: "Oiseau identifié ! +10 🐦",
            description: `${top2[0].label} (${(top2[0].confidence * 100).toFixed(1)}%)`,
          });
        }
      } catch (err) {
        console.error("Classification failed:", err);
        toast({
          title: "Erreur d'identification",
          description: "Impossible d'identifier l'oiseau. Entrez le nom manuellement.",
        });
      } finally {
        setIsIdentifying(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectResult = (label: string) => {
    setName(label);
  };

  const handleSave = () => {
    if (!photo) return;
    addSighting({
      id: generateId(),
      photo,
      name: name.trim() || "Oiseau inconnu",
      notes: notes.trim(),
      date: new Date().toISOString(),
    });
    navigate("/");
  };

  const handleRetake = () => {
    setPhoto(null);
    setName("");
    setNotes("");
    setResults([]);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="safe-area-top bg-primary">
        <div className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => navigate("/")} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-primary-foreground">Capturer un oiseau</h1>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {!photo ? (
        <div className="flex flex-col items-center justify-center px-8 pt-20">
          <button
            onClick={handleCapture}
            className="w-32 h-32 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Camera className="w-14 h-14 text-primary-foreground" />
          </button>
          <p className="text-muted-foreground mt-6 text-center">
            Prenez une photo ou choisissez dans la galerie
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="relative rounded-xl overflow-hidden">
            <img src={photo} alt="Photo capturée" className="w-full aspect-square object-cover" />
            <button
              onClick={handleRetake}
              className="absolute top-3 right-3 bg-card/80 backdrop-blur-sm p-2 rounded-full"
            >
              <RotateCcw className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* AI identification status */}
          {isIdentifying && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm text-primary font-medium">Identification en cours…</span>
            </div>
          )}

          {/* Top 2 results */}
          {results.length > 0 && !isIdentifying && (
            <div className="space-y-2">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(r.label)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    name === r.label
                      ? "bg-primary/10 border-primary"
                      : "bg-accent border-border hover:border-primary/50"
                  }`}
                >
                  <Bird className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {i === 0 ? "🥇 " : "🥈 "}{r.label}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={r.confidence * 100} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(r.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <Input
              placeholder="Nom de l'oiseau (ex: Merle noir)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-card"
            />
            <Textarea
              placeholder="Notes (lieu, comportement…)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-card"
            />
          </div>

          <Button onClick={handleSave} disabled={isIdentifying} className="w-full h-12 text-base gap-2">
            <Check className="w-5 h-5" />
            Enregistrer l'observation
          </Button>
        </div>
      )}
    </div>
  );
}
