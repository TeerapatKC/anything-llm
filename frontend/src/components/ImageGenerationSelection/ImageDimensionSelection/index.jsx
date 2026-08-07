import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const PROVIDER_DIMENSIONS = {
  "openai-imggen": ["auto", "1024x1024", "1024x1536", "1536x1024"],
  "lemonade-imggen": ["256x256", "512x512", "768x768", "1024x1024"],
};
const DEFAULT_DIMENSIONS = ["512x512", "1024x1024"];

export default function ImageDimensionSelection({ provider, settings }) {
  const dimensions = PROVIDER_DIMENSIONS[provider] || DEFAULT_DIMENSIONS;
  const defaultValue =
    settings?.ImageGenerationDimensions &&
    dimensions.includes(settings.ImageGenerationDimensions)
      ? settings.ImageGenerationDimensions
      : dimensions[0];

  return (
    <div className="flex flex-col w-60">
      <Label variant="settings" className="block mb-3">
        Image Dimensions
      </Label>
      <Select name="ImageGenerationDimensions" defaultValue={defaultValue}>
        <SelectTrigger variant="settings">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {dimensions.map((dim) => (
            <SelectItem key={dim} value={dim}>
              {dim}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
