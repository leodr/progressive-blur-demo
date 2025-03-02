import { useEffect, useRef, useState } from "react";
import reactLogo from "./assets/sample-image.jpg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Slider } from "./components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { BlurConfig, useImageWorker } from "./hooks/useImageWorker";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [pixelRatio, setPixelRatio] = useState(window.devicePixelRatio || 1);
  const [blurConfig, setBlurConfig] = useState<BlurConfig>({
    enabled: true,
    startPoint: 0.3,
    endPoint: 1,
    maxKernelSize: 299,
    easing: "easeInOut",
    blurType: "gaussian",
  });

  const { availableEasings, processImage } = useImageWorker(blurConfig);

  // Handle window resize and pixel ratio changes
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setPixelRatio(window.devicePixelRatio || 1);
    };

    window.addEventListener("resize", handleResize);
    // Also listen for changes in pixel ratio (e.g., when moving between displays)
    window
      .matchMedia("(resolution: 1dppx)")
      .addEventListener("change", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window
        .matchMedia("(resolution: 1dppx)")
        .removeEventListener("change", handleResize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Set canvas dimensions accounting for pixel ratio
    const displayWidth = windowSize.width;
    const displayHeight = windowSize.height;

    // Set the canvas size in CSS pixels
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Set the canvas internal dimensions accounting for pixel ratio
    canvas.width = Math.floor(displayWidth * pixelRatio);
    canvas.height = Math.floor(displayHeight * pixelRatio);

    // Clear any previous scaling
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Apply high-quality image rendering settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Scale the context to ensure correct drawing operations
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const img = new Image();
    img.src = reactLogo;
    img.onload = async () => {
      // Clear the canvas before drawing
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // Calculate dimensions to cover the entire canvas while maintaining aspect ratio
      const imgRatio = img.width / img.height;
      const canvasRatio = displayWidth / displayHeight;

      let drawWidth,
        drawHeight,
        offsetX = 0,
        offsetY = 0;

      if (canvasRatio > imgRatio) {
        // Canvas is wider than the image aspect ratio
        drawWidth = displayWidth;
        drawHeight = displayWidth / imgRatio;
        offsetY = (displayHeight - drawHeight) / 2;
      } else {
        // Canvas is taller than the image aspect ratio
        drawHeight = displayHeight;
        drawWidth = displayHeight * imgRatio;
        offsetX = (displayWidth - drawWidth) / 2;
      }

      // Draw the image at the calculated dimensions
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Process the image with the current blur settings
      await processImage(ctx, canvas);
    };
  }, [blurConfig, processImage, windowSize, pixelRatio]);

  // Check if blur is enabled based on blur type
  const isBlurEnabled = blurConfig.blurType !== "none";

  return (
    <div className="w-full h-full overflow-hidden select-none">
      <div className="relative w-screen h-screen overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full object-cover z-10"
        />

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[460px] w-[92%]">
          <div className="bg-gray-800/80 text-white p-4 pt-[17px] rounded-3xl shadow-settings backdrop-blur-lg backdrop-saturate-180">
            <div className="flex flex-col">
              <div className="space-y-2">
                <Tabs
                  value={blurConfig.blurType}
                  onValueChange={(value) => {
                    const newBlurType = value as "none" | "linear" | "gaussian";
                    setBlurConfig((prev) => ({
                      ...prev,
                      blurType: newBlurType,
                      enabled: newBlurType !== "none",
                    }));
                  }}
                >
                  <TabsList className="w-full grid grid-cols-3 bg-white/6 text-white/75 rounded-xl">
                    <TabsTrigger
                      value="none"
                      className="rounded-lg data-[state=active]:bg-white/90 data-[state=active]:text-gray-700"
                    >
                      No blur
                    </TabsTrigger>
                    <TabsTrigger
                      value="linear"
                      className="rounded-lg data-[state=active]:bg-white/90 data-[state=active]:text-gray-700"
                    >
                      Linear blur
                    </TabsTrigger>
                    <TabsTrigger
                      value="gaussian"
                      className="rounded-lg data-[state=active]:bg-white/90 data-[state=active]:text-gray-700"
                    >
                      Gaussian blur
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="h-4"></div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white/90">
                    Max Kernel Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="499"
                    step={blurConfig.blurType === "gaussian" ? "2" : "1"}
                    value={blurConfig.maxKernelSize}
                    onChange={(e) => {
                      let value = parseInt(e.target.value);
                      if (
                        blurConfig.blurType === "gaussian" &&
                        value % 2 === 0
                      ) {
                        value = value - 1;
                      }
                      setBlurConfig((prev) => ({
                        ...prev,
                        maxKernelSize: value,
                      }));
                    }}
                    className="w-16 h-8 px-2 text-sm rounded-lg bg-white/6 text-white"
                    disabled={!isBlurEnabled}
                  />
                </div>
                <Slider
                  min={1}
                  max={499}
                  step={blurConfig.blurType === "gaussian" ? 2 : 1}
                  value={[blurConfig.maxKernelSize]}
                  onValueChange={(values) => {
                    let value = values[0];
                    if (blurConfig.blurType === "gaussian" && value % 2 === 0) {
                      value = value - 1;
                    }
                    setBlurConfig((prev) => ({
                      ...prev,
                      maxKernelSize: value,
                    }));
                  }}
                  disabled={!isBlurEnabled}
                />
              </div>
              <div className="h-5"></div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0 items-center">
                  <label className="text-sm font-medium text-white/90">
                    Blur Range: {blurConfig.startPoint.toFixed(1)} -{" "}
                    {blurConfig.endPoint.toFixed(1)}
                  </label>
                  <label className="text-sm font-medium opacity-0">
                    Easing:
                  </label>

                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={[blurConfig.startPoint, blurConfig.endPoint]}
                    onValueChange={(values) =>
                      setBlurConfig((prev) => ({
                        ...prev,
                        startPoint: values[0],
                        endPoint: values[1],
                      }))
                    }
                    disabled={!isBlurEnabled}
                  />

                  <Select
                    value={blurConfig.easing}
                    onValueChange={(value) =>
                      setBlurConfig((prev) => ({
                        ...prev,
                        easing: value,
                      }))
                    }
                    disabled={!isBlurEnabled}
                  >
                    <SelectTrigger className="w-[120px] bg-white/6 border-none text-white rounded-lg h-8">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800/80 text-white backdrop-blur-lg rounded-xl border-none p-.5 shadow-sm">
                      {availableEasings.map((ease) => (
                        <SelectItem
                          key={ease}
                          value={ease}
                          className="rounded-lg"
                        >
                          {ease.replace(/([A-Z])/g, " $1").toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
