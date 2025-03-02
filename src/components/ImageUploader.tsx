import { Upload } from "lucide-react";
import { useRef } from "react";
import sampleImage1 from "../assets/sample-image-1.jpg";
import sampleImage2 from "../assets/sample-image-2.jpg";
import sampleImage3 from "../assets/sample-image-3.jpg";
import { Button } from "./ui/button";

interface ImageUploaderProps {
  onImageSelect: (imageDataUrl: string) => void;
  isDragging: boolean;
}

export function ImageUploader({
  onImageSelect,
  isDragging,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageSelect(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle built-in image selection
  const handleSelectBuiltInImage = (imageSrc: string) => {
    onImageSelect(imageSrc);
  };

  return (
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
  );
}
