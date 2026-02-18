import { PointerHighlight } from "@/components/ui/pointer-highlight";

export function HowItWork() {
    return (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-md p-6">
                <div className="h-40 w-full rounded-lg bg-linear-to-r from-blue-200 to-sky-200" />
                <div className="mx-auto mt-4 max-w-lg text-base font-bold tracking-tight md:text-base">
                    <PointerHighlight
                        rectangleClassName="bg-neutral-700 border-neutral-600 leading-loose"
                        pointerClassName="text-yellow-500 h-3 w-3"
                        containerClassName="inline-block mr-1"
                    >
                        <span className="relative z-10"> Zero-Knowledge</span>
                    </PointerHighlight>
                    Proofs
                </div>
                <p className="mt-4 text-sm text-neutral-500">
                    Every trade is verified by a Groth16 ZK proof before settlement. The circuit validates balances, amounts, and price tolerance -- all without exposing sensitive data on-chain.
                </p>
            </div>
            <div className="rounded-md p-6">
                <div className="h-40 w-full rounded-lg bg-linear-to-r from-blue-200 to-purple-200" />
                <div className="mx-auto mt-4 max-w-lg text-base font-bold tracking-tight md:text-base">
                    <PointerHighlight
                        rectangleClassName="bg-blue-900 border-blue-700 leading-loose"
                        pointerClassName="text-blue-500 h-3 w-3"
                        containerClassName="inline-block mx-1"
                    >
                        <span className="relative z-10">Dark Pool</span>
                    </PointerHighlight>
                    Matching
                </div>
                <p className="mt-4 text-sm text-neutral-500">
                    Orders live in a private off-chain book. No public mempool exposure means no front-running, no sandwich attacks, and no information leakage.
                </p>
            </div>

            <div className="rounded-md p-6">
                <div className="h-40 w-full rounded-lg bg-linear-45 from-green-200 to-yellow-200" />
                <div className="mx-auto mt-4 max-w-lg text-base font-bold tracking-tight md:text-base">
                    <PointerHighlight
                        rectangleClassName="bg-green-900 border-green-700 leading-loose"
                        pointerClassName="text-green-500 h-3 w-3"
                        containerClassName="inline-block ml-1"
                    >
                        <span className="relative z-10">Midpoint </span>
                    </PointerHighlight>
                    Pricing
                </div>
                <p className="mt-4 text-sm text-neutral-500">
                    Trades settle at the real-time Binance midpoint price. Both buyer and seller save on spread compared to trading on a public order book.
                </p>
            </div>

            <div className="rounded-md p-6">
                <div className="h-40 w-full rounded-lg bg-linear-to-r from-blue-200 to-purple-200" />
                <div className="mx-auto mt-4 max-w-lg text-base font-bold tracking-tight md:text-base">
                    <PointerHighlight
                        rectangleClassName="bg-blue-900 border-blue-700 leading-loose"
                        pointerClassName="text-blue-500 h-3 w-3"
                        containerClassName="inline-block mx-1"
                    >
                        <span className="relative z-10">On-Chain </span>
                    </PointerHighlight>
                    Settlement
                </div>
                <p className="mt-4 text-sm text-neutral-500">
                    Final settlement happens on Arbitrum through a verified smart contract. Fully trustless -- no custodian, no intermediary.                </p>
            </div>
        </div>
    );
}
