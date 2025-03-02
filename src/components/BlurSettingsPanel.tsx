import { BlurConfig } from "../hooks/useImageWorker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface BlurSettingsPanelProps {
  blurConfig: BlurConfig;
  setBlurConfig: React.Dispatch<React.SetStateAction<BlurConfig>>;
  availableEasings: string[];
}

export function BlurSettingsPanel({
  blurConfig,
  setBlurConfig,
  availableEasings,
}: BlurSettingsPanelProps) {
  // Check if blur is enabled based on blur type
  const isBlurEnabled = blurConfig.blurType !== "none";

  return (
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
                  if (blurConfig.blurType === "gaussian" && value % 2 === 0) {
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
              <label className="text-sm font-medium opacity-0">Easing:</label>

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
                    <SelectItem key={ease} value={ease} className="rounded-lg">
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
  );
}
