import * as ort from "onnxruntime-web";
import { BIRD_LABELS } from "./bird-labels";

ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

let session: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!session) {
    session = await ort.InferenceSession.create("/models/modele_oiseaux_v3.onnx", {
      executionProviders: ["wasm"],
    });
  }
  return session;
}

function softmax(arr: Float32Array): Float32Array {
  const max = Math.max(...arr);
  const exps = arr.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum) as Float32Array;
}

async function loadImageSource(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fallback below for browsers with partial support.
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
    img.src = objectUrl;
  });
}

async function preprocessImage(file: File): Promise<ort.Tensor> {
  const source = await loadImageSource(file);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 224;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Canvas context unavailable");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, 224, 224);

    const { data } = ctx.getImageData(0, 0, 224, 224);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    const channelSize = 224 * 224;
    const float32 = new Float32Array(3 * channelSize);

    for (let i = 0, pixelIndex = 0; i < data.length; i += 4, pixelIndex++) {
      float32[pixelIndex] = (data[i] / 255 - mean[0]) / std[0];
      float32[channelSize + pixelIndex] = (data[i + 1] / 255 - mean[1]) / std[1];
      float32[channelSize * 2 + pixelIndex] = (data[i + 2] / 255 - mean[2]) / std[2];
    }

    return new ort.Tensor("float32", float32, [1, 3, 224, 224]);
  } finally {
    if (source instanceof ImageBitmap) {
      source.close();
    }
  }
}

export interface ClassificationResult {
  label: string;
  confidence: number;
}

export async function classifyBird(file: File): Promise<ClassificationResult[]> {
  const sess = await getSession();
  const inputTensor = await preprocessImage(file);
  const results = await sess.run({ input: inputTensor });
  const output = results.output.data as Float32Array;
  const probs = softmax(output);

  const indexed = Array.from(probs).map((val, idx) => ({ idx, val }));
  indexed.sort((a, b) => b.val - a.val);

  return indexed.slice(0, 2).map((item) => ({
    label: BIRD_LABELS[item.idx],
    confidence: item.val,
  }));
}
