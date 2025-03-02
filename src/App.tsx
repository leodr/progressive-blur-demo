import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import sampleImage1 from "./assets/sample-image-1.jpg";
import sampleImage2 from "./assets/sample-image-2.jpg";
import sampleImage3 from "./assets/sample-image-3.jpg";
import { Button } from "./components/ui/button";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

    // If no image is selected, fill with dark gray
    if (!currentImage) {
      ctx.fillStyle = "#1f2937"; // dark gray
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      return;
    }

    const img = new Image();
    img.src = currentImage;
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
  }, [blurConfig, processImage, windowSize, pixelRatio, currentImage]);

  // Check if blur is enabled based on blur type
  const isBlurEnabled = blurConfig.blurType !== "none";

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setCurrentImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle clear image
  const handleClearImage = () => {
    setCurrentImage(null);
  };

  // Handle built-in image selection
  const handleSelectBuiltInImage = (imageSrc: string) => {
    setCurrentImage(imageSrc);
  };

  return (
    <div className="w-full h-full overflow-hidden select-none">
      <div
        className="relative w-screen h-screen overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full object-cover z-10"
        />

        {/* Clear button */}
        {currentImage && (
          <Button
            onClick={handleClearImage}
            className="absolute top-4 right-4 z-20 rounded-full w-10 h-10 p-0 bg-neutral-800/80 hover:bg-neutral-700/80 text-white backdrop-blur-lg"
            aria-label="Clear image"
          >
            <X size={20} />
          </Button>
        )}

        {/* Upload interface */}
        {!currentImage && (
          <div
            className={`backdrop-blur-md absolute inset-0 z-20 flex flex-col items-center justify-center p-6 ${
              isDragging ? "bg-neutral-900/60" : "bg-neutral-950/80"
            }`}
          >
            <div className="text-white p-8 rounded-3xl max-w-md w-full text-center">
              <div className="mb-6">
                <div className="mx-auto size-15 bg-neutral-700/80 rounded-full flex items-center justify-center mb-4">
                  <Upload size={24} className="text-white/80" />
                </div>
                <h2 className="text-xl font-bold mb-2">Upload an image</h2>
                <p className="text-white/70 text-sm">
                  Drag and drop an image here, or click to select a file
                </p>
              </div>

              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-white/10 hover:bg-white/20 text-white mb-6 rounded-xl"
              >
                Select image
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div className="text-sm text-white/70 mb-4">
                Or try with a sample image:
              </div>

              <div className="flex grid-cols-1 gap-2">
                <button
                  onClick={() => handleSelectBuiltInImage(sampleImage1)}
                  className="rounded-xl overflow-hidden flex-1"
                >
                  <img src={sampleImage1} alt="" />
                </button>
                <button
                  onClick={() => handleSelectBuiltInImage(sampleImage2)}
                  className="rounded-xl overflow-hidden flex-1"
                >
                  <img src={sampleImage2} alt="" />
                </button>
                <button
                  onClick={() => handleSelectBuiltInImage(sampleImage3)}
                  className="rounded-xl overflow-hidden flex-1"
                >
                  <img src={sampleImage3} alt="" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[460px] w-[92%]">
          <div className="bg-neutral-800/80 text-white p-4 pt-[17px] rounded-3xl shadow-settings backdrop-blur-lg backdrop-saturate-180">
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
                      className="rounded-lg data-[state=active]:bg-white/90 data-[state=active]:text-neutral-700"
                    >
                      No blur
                    </TabsTrigger>
                    <TabsTrigger
                      value="linear"
                      className="rounded-lg data-[state=active]:bg-white/90 data-[state=active]:text-neutral-700"
                    >
                      Linear blur
                    </TabsTrigger>
                    <TabsTrigger
                      value="gaussian"
                      className="rounded-lg data-[state=active]:bg-white/90 data-[state=active]:text-neutral-700"
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
                    <SelectContent className="bg-neutral-800/80 text-white backdrop-blur-lg rounded-xl border-none p-.5 shadow-sm">
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
