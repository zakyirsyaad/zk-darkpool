"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import Link from "next/link";

export function Hook() {
    const words = [
        {
            text: "Trade",
        },
        {
            text: "major",
        },
        {
            text: "cryptocurrencies",
        },
        {
            text: "privately",
        },
        {
            text: "on",
        },
        {
            text: "Arbitrum.",
            className: "text-blue-500 dark:text-blue-500",
        },
    ];
    return (
        <div className="flex flex-col items-center justify-center h-96  ">
            <p className="text-neutral-200 text-xs sm:text-base  ">
                Supported Assets
            </p>
            <TypewriterEffectSmooth words={words} />
            <Link href="/trade/ETH">
                <InteractiveHoverButton>Trade Now!</InteractiveHoverButton>
            </Link>
        </div>
    );
}
