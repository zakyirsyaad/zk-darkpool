'use client'
import { ConnectButtonCustom } from "./ConnectButtonCustom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

export default function Header() {
  return (
    <>
      <DesktopHeader />
    </>
  );
}

function DesktopHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="grid grid-cols-3 w-full p-5">
      <nav><Link href="/" className={`text-2xl font-bold ${isHome ? "cursor-none" : ""}`}>DARX</Link></nav>
      <ol className="flex justify-center gap-10">
        <li className="hover:font-black duration-300 "><Link href={"/trade/ETH"} className={isHome ? "cursor-none" : ""}>Trade</Link></li>
        <li className="hover:font-black duration-300 "><Link href={"/orders"} className={isHome ? "cursor-none" : ""}>Orders</Link></li>
        <li className="hover:font-black duration-300 "><Link href={"/"} className={isHome ? "cursor-none" : ""}>Docs</Link></li>
      </ol>
      <div className="flex justify-end items-center">
        {isHome ? (
          <Button asChild size={"lg"} className="cursor-none">
            <Link
              href="/trade/ETH"
              className="px-5 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors"
            >
              Launch DARX
            </Link>
          </Button>

        ) : (
          <ConnectButtonCustom />
        )}
      </div>
    </div>
  );
}
