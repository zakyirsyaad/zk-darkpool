import BboPrice from '@/components/layouts/trade/BboPrice'
import Chart from '@/components/layouts/trade/Chart'
import Orders from '@/components/layouts/trade/Orders'
import TradeSidebar from '@/components/layouts/trade/TradeSidebar'
import { StickyBanner } from '@/components/ui/sticky-banner'
import React from 'react'

export default async function page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: token } = await params
  console.log(token)
  return (
    <div className=''>
      <StickyBanner className="bg-gradient-to-b from-accent to-background">
        <p className="mx-0 max-w-[90%] text-white drop-shadow-md">
          Currently on Arbitrum Sepolia testnet. Mainnet launch coming soon.{" "}
        </p>
      </StickyBanner>
      <BboPrice token={token} />
      <section className='grid grid-cols-4'>
        <div className='col-span-3 border-r border-b'>
          <Chart symbol={token} />
          <div>
            <Orders />
          </div>
        </div>
        <TradeSidebar token={token} />
      </section>
    </div>
  )
}
