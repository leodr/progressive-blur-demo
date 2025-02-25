import { useEffect, useRef, useState } from "react";

// Configuration type for blur filter
export interface BlurConfig {
  enabled: boolean;
  startPoint: number;
  endPoint: number;
  maxKernelSize: number;
  easing: string;
  blurType: 'none' | 'linear' | 'gaussian';
  sigma?: number;
}

export function useImageWorker(blurConfig: BlurConfig) {
  const workerRef = useRef<Worker | null>(null);
  const [availableEasings, setAvailableEasings] = useState<string[]>([]);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL("../worker.ts", import.meta.url), {
      type: "module",
    });

    // Get available easings
    workerRef.current.postMessage({ type: "getEasings" });

    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === "easings") {
        setAvailableEasings(e.data.easings);
      }
    };

    workerRef.current.addEventListener("message", handleMessage);

    return () => {
      workerRef.current?.removeEventListener("message", handleMessage);
      workerRef.current?.terminate();
    };
  }, []);

  const processImage = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    if (blurConfig.enabled && blurConfig.blurType !== "none" && workerRef.current) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      return new Promise<void>((resolve) => {
        // Set up worker message handler
        const messageHandler = (e: MessageEvent) => {
          if (e.data.type === "processed") {
            const { processedData } = e.data;
            const newImageData = new ImageData(
              processedData,
              canvas.width,
              canvas.height
            );
            ctx.putImageData(newImageData, 0, 0);
            // Remove the message handler after processing
            workerRef.current?.removeEventListener("message", messageHandler);
            resolve();
          }
        };

        workerRef.current?.addEventListener("message", messageHandler);

        // Send data to worker
        workerRef.current?.postMessage({
          type: "process",
          imageData: imageData.data,
          width: canvas.width,
          height: canvas.height,
          config: blurConfig,
        });
      });
    } else {
      // If blur is not enabled or blur type is none, resolve immediately
      return Promise.resolve();
    }
  };

  return {
    availableEasings,
    processImage,
  };
} 