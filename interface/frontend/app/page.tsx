import Hero from "@/components/layouts/home/Hero";
import { Hook } from "@/components/layouts/home/Hook";
import { HowItWork } from "@/components/layouts/home/HowItWork";
import { DotPattern } from "@/components/ui/dot-pattern";
import { SmoothCursor } from "@/components/ui/smooth-cursor"
import { TweetCard } from "@/components/ui/tweet-card"
import { SparklesText } from "@/components/ui/sparkles-text"
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
      <section className="space-y-5 pt-20">
        <SparklesText className="text-center">Darkpool Insights</SparklesText>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <TweetCard id="1994392154509353135" />
            <TweetCard id="1994392159898984775" />
          </div>
          <div className="grid place-content-between">
            <TweetCard id="1994392167935283480" />
            <TweetCard id="1994392171873726517" />
            <TweetCard id="1994392175434781134" />
          </div>

        </div>
      </section>
      <Hook />
    </main>
  );
}
