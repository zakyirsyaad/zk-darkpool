'use client'
import { ConnectButtonCustom } from "./ConnectButtonCustom";
import Link from "next/link";

export default function Header() {
  return (
    <>
      <DesktopHeader />
    </>
  );
}

function DesktopHeader() {
  return (
    <div className="grid grid-cols-3 w-full p-5">
      <nav>ZK-Darkpool</nav>
      <ol className="flex justify-center gap-10">
        <li className="hover:font-black duration-300"><Link href={"/trade/BTC"}>Trade</Link></li>
        <li className="hover:font-black duration-300"><Link href={"/"}>Orders</Link></li>
        <li className="hover:font-black duration-300"><Link href={"/"}>Vault</Link></li>
      </ol>
      <div className="place-items-end">
        <ConnectButtonCustom />
      </div>
    </div>
  );
}
