import TextEffect from '@/components/TextEffect'
import { PointerHighlight } from '@/components/ui/pointer-highlight'
import { TextHoverEffect } from '@/components/ui/text-hover-effect'
import React from 'react'

export default function Hero() {
    return (
        <main>
            <div className="h-[40rem] flex items-center justify-center">
                <TextHoverEffect text="DARX" />
            </div>
            <div>
                <p className='text-center text-xl md:text-lg'>Trade any token in size with zero price impact with crypto&apos;s first decentralized crossing network. Live today on Arbitrum Ecosystem.</p>
                <div className="mx-auto max-w-4xl py-20 text-xl font-bold tracking-tight md:text-4xl text-center flex items-center justify-center gap-3 flex-wrap">
                    <span>Private Trading, Powered by</span>
                    <PointerHighlight
                        rectangleClassName="bg-neutral-700 border-neutral-600"
                        pointerClassName="text-white"
                    >
                        <span className="relative z-10">Zero-Knowledge Proofs</span>
                    </PointerHighlight>
                    <TextEffect />

                </div>
            </div>
        </main>
    )
}
