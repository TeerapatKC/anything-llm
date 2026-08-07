import { Skeleton } from "@/components/ui/skeleton";

export default function ModelTableLoadingSkeleton() {
  return (
    <div className="flex flex-col w-full gap-y-4 pt-4">
      <Skeleton
        height={100}
        width="100%"
        count={7}
        highlightColor="var(--theme-settings-input-active)"
        baseColor="var(--theme-settings-input-bg)"
        enableAnimation={true}
        containerClassName="w-fill flex gap-[8px] flex-col p-0"
      />
    </div>
  );
}
