import { Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BlurSettingsPanel } from "./components/BlurSettingsPanel";
import { ImageUploader } from "./components/ImageUploader";
import { Button } from "./components/ui/button";
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
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setCurrentImage(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Handle clear image
  const handleClearImage = () => {
    setCurrentImage(null);
  };

  // Handle download image
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    // Create a temporary link element
    const link = document.createElement("a");

    // Set the download filename
    link.download = `fx-blur-image-${new Date().getTime()}.jpg`;

    // Convert canvas to high-quality JPG data URL
    link.href = canvas.toDataURL("image/jpeg", 0.9);

    // Append to the document, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        {/* Action buttons */}
        {currentImage && (
          <>
            {/* Download button */}
            <Button
              onClick={handleDownloadImage}
              className="absolute top-4 left-4 z-20 rounded-full size-11 p-0 bg-neutral-800/80 hover:bg-neutral-700/80 text-white backdrop-blur-md"
              aria-label="Download image"
            >
              <Download size={20} />
            </Button>

            {/* Clear button */}
            <Button
              onClick={handleClearImage}
              className="absolute top-4 right-4 z-20 rounded-full size-11 p-0 bg-neutral-800/80 hover:bg-neutral-700/80 text-white backdrop-blur-md"
              aria-label="Clear image"
            >
              <X size={20} />
            </Button>
          </>
        )}

        {/* Upload interface */}
        {!currentImage && (
          <ImageUploader
            onImageSelect={setCurrentImage}
            isDragging={isDragging}
          />
        )}

        {/* Settings Panel */}
        <BlurSettingsPanel
          blurConfig={blurConfig}
          setBlurConfig={setBlurConfig}
          availableEasings={availableEasings}
        />
      </div>
    </div>
  );
}

export default App;
