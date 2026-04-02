import * as ort from "onnxruntime-web";
import { BIRD_LABELS } from "./bird-labels";

// Configure ONNX Runtime to use WASM backend
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

/**
 * Preprocess a base64 data URL image to a [1, 3, 224, 224] float tensor.
 * Uses ImageNet normalization: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
 */
async function preprocessImage(dataUrl: string): Promise<ort.Tensor> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext("2d")!;

      // Center crop: take the largest square from center, then resize
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 224, 224);

      const imageData = ctx.getImageData(0, 0, 224, 224);
      const { data } = imageData;

      // ImageNet normalization
      const mean = [0.485, 0.456, 0.406];
      const std = [0.229, 0.224, 0.225];

      const float32 = new Float32Array(1 * 3 * 224 * 224);
      for (let y = 0; y < 224; y++) {
        for (let x = 0; x < 224; x++) {
          const idx = (y * 224 + x) * 4;
          for (let c = 0; c < 3; c++) {
            float32[c * 224 * 224 + y * 224 + x] =
              (data[idx + c] / 255 - mean[c]) / std[c];
          }
        }
      }

      resolve(new ort.Tensor("float32", float32, [1, 3, 224, 224]));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export interface ClassificationResult {
  label: string;
  confidence: number;
}

export async function classifyBird(imageDataUrl: string): Promise<ClassificationResult> {
  const sess = await getSession();
  const inputTensor = await preprocessImage(imageDataUrl);
  const results = await sess.run({ input: inputTensor });
  const output = results.output.data as Float32Array;
  const probs = softmax(output);

  let maxIdx = 0;
  let maxVal = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > maxVal) {
      maxVal = probs[i];
      maxIdx = i;
    }
  }

  return {
    label: BIRD_LABELS[maxIdx],
    confidence: maxVal,
  };
}
