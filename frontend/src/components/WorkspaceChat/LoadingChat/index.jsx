import { isMobile } from "react-device-detect";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingChat() {
  const highlightColor = "var(--theme-bg-primary)";
  const baseColor = "var(--theme-bg-secondary)";
  return (
    <div className="transition-all duration-500 relative bg-theme-bg-secondary w-full h-full overflow-y-scroll no-scroll p-4">
      <Skeleton
        height="100px"
        width="100%"
        highlightColor={highlightColor}
        baseColor={baseColor}
        count={1}
        className="max-w-full md:max-w-[80%] p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-6"
        containerClassName="flex justify-start"
      />
      <Skeleton
        height="100px"
        width={isMobile ? "70%" : "45%"}
        baseColor={baseColor}
        highlightColor={highlightColor}
        count={1}
        className="max-w-full md:max-w-[80%] p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-6"
        containerClassName="flex justify-end"
      />
      <Skeleton
        height="100px"
        width={isMobile ? "55%" : "30%"}
        baseColor={baseColor}
        highlightColor={highlightColor}
        count={1}
        className="max-w-full md:max-w-[80%] p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-6"
        containerClassName="flex justify-start"
      />
      <Skeleton
        height="100px"
        width={isMobile ? "88%" : "25%"}
        baseColor={baseColor}
        highlightColor={highlightColor}
        count={1}
        className="max-w-full md:max-w-[80%] p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-6"
        containerClassName="flex justify-end"
      />
      <Skeleton
        height="160px"
        width="100%"
        baseColor={baseColor}
        highlightColor={highlightColor}
        count={1}
        className="max-w-full md:max-w-[80%] p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-6"
        containerClassName="flex justify-start"
      />
    </div>
  );
}
