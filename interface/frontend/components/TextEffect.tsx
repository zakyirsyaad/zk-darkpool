'use client'

import { TextGenerateEffect } from "./ui/text-generate-effect";

const words = `Trade large orders without exposing your intent. ZK-Darkpool matches orders off-chain and settles on-chain at the fair midpoint price, no front-running, no spread markup.
`;
export default function TextEffect() {
    return <TextGenerateEffect words={words} />;
}
