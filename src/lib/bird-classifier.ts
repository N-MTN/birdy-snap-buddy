import * as ort from "onnxruntime-web";
import { BIRD_LABELS } from "./bird-labels";

/** * 1. WASM CONFIGURATION
 * Points to the CDN for necessary binary files. 
 * Ensure your network allows loading .wasm files.
 */
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

let session: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!session) {
    try {
      // Ensure the model is located in your 'public/models' directory
      session = await ort.InferenceSession.create("/models/modele_oiseaux_v3.onnx", {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    } catch (e) {
      console.error("ONNX Session Load Error:", e);
      throw e;
    }
  }
  return session;
}

/**
 * 2. SOFTMAX (Manual implementation to match Python/Numpy logic)
 */
function softmax(logits: Float32Array): Float32Array {
  const maxLogit = Math.max(...logits);
  const scores = logits.map((l) => Math.exp(l - maxLogit));
  const sum = scores.reduce((a, b) => a + b, 0);
  return scores.map((s) => s / sum) as Float32Array;
}

/**
 * 3. IMAGE PREPROCESSING
 * Replicates the PIL.resize(LANCZOS) and ImageNet normalization from Python.
 */
async function preprocess(file: File): Promise<ort.Tensor> {
  const img = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 224;
  canvas.height = 224;
  
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context missing");

  // High quality interpolation [cite: 12]
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high"; 
  ctx.drawImage(img, 0, 0, 224, 224);

  const imageData = ctx.getImageData(0, 0, 224, 224).data;
  const channelSize = 224 * 224;
  const output = new Float32Array(3 * channelSize);

  // ImageNet Stats [cite: 14]
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  /**
   * Converting HWC (RGBA) from Canvas to CHW (RGB) for ONNX [cite: 15, 16, 17]
   * i iterates by 4 (R, G, B, A)
   * j tracks the pixel position (0 to 50175)
   */
  for (let i = 0; i < imageData.length; i += 4) {
    const j = i / 4;
    output[j] = (imageData[i] / 255 - mean[0]) / std[0];               // Red Channel
    output[channelSize + j] = (imageData[i + 1] / 255 - mean[1]) / std[1]; // Green Channel
    output[2 * channelSize + j] = (imageData[i + 2] / 255 - mean[2]) / std[2]; // Blue Channel
  }

  img.close();
  return new ort.Tensor("float32", output, [1, 3, 224, 224]); // [cite: 18]
}

export interface ClassificationResult {
  label: string;
  confidence: number;
}

/**
 * 4. MAIN CLASSIFICATION FUNCTION
 */
export async function classifyBird(file: File): Promise<ClassificationResult[]> {
  try {
    const sess = await getSession();
    const inputTensor = await preprocess(file);

    // Dynamic key assignment: Uses the model's actual input name [cite: 22]
    const inputName = sess.inputNames[0];
    const feeds = { [inputName]: inputTensor };
    
    const results = await sess.run(feeds);
    
    // Dynamic output retrieval
    const outputName = sess.outputNames[0];
    const logits = results[outputName].data as Float32Array;
    const probabilities = softmax(logits);

    // Map probabilities to labels [cite: 23, 24]
    const predictionMap = Array.from(probabilities).map((prob, index) => ({
      label: BIRD_LABELS[index] || `Unknown (${index})`,
      confidence: prob,
    }));

    // Sort and return top 3 (Matches Gradio num_top_classes=3)
    return predictionMap
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(res => ({
        ...res,
        label: res.label.replace(/_/g, ' ') // Clean up underscores for display
      }));

  } catch (error) {
    console.error("Classification failure:", error);
    throw error;
  }
}
