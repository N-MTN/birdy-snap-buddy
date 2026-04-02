import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, RotateCcw, ArrowLeft } from "lucide-react";
import { addSighting, generateId } from "@/lib/bird-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Capture() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!photo) return;
    addSighting({
      id: generateId(),
      photo,
      name: name.trim() || "Unknown Bird",
      notes: notes.trim(),
      date: new Date().toISOString(),
    });
    navigate("/");
  };

  const handleRetake = () => {
    setPhoto(null);
    setName("");
    setNotes("");
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="safe-area-top bg-primary">
        <div className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => navigate("/")} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-primary-foreground">Capture Bird</h1>
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
            Tap to take a photo or choose from gallery
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="relative rounded-xl overflow-hidden">
            <img src={photo} alt="Captured bird" className="w-full aspect-square object-cover" />
            <button
              onClick={handleRetake}
              className="absolute top-3 right-3 bg-card/80 backdrop-blur-sm p-2 rounded-full"
            >
              <RotateCcw className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Bird name (e.g., Blue Jay)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-card"
            />
            <Textarea
              placeholder="Notes (location, behavior...)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-card"
            />
          </div>

          <Button onClick={handleSave} className="w-full h-12 text-base gap-2">
            <Check className="w-5 h-5" />
            Save Sighting
          </Button>
        </div>
      )}
    </div>
  );
}
