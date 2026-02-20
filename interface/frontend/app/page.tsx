import Hero from "@/components/layouts/home/Hero";
import { Hook } from "@/components/layouts/home/Hook";
import { HowItWork } from "@/components/layouts/home/HowItWork";
import { DotPattern } from "@/components/ui/dot-pattern";
import { SmoothCursor } from "@/components/ui/smooth-cursor"
import { cn } from "@/lib/utils";

export default function Page() {
  return (
    <main className="cursor-none bg-background relative flex flex-col size-full items-center justify-center overflow-hidden rounded-lg border p-20">
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        className={cn(
          "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
        )}
      />
      <SmoothCursor />
      <Hero />
      <HowItWork />
      <Hook />
    </main>
  );
}
