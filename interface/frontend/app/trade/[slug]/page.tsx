import BboPrice from '@/components/layouts/trade/BboPrice'
import Chart from '@/components/layouts/trade/Chart'
import Orders from '@/components/layouts/trade/Orders'
import OrderBook from '@/components/layouts/trade/OrderBook'
import TradeSidebar from '@/components/layouts/trade/TradeSidebar'
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
      <BboPrice token={token} />
      <section className='grid grid-cols-4'>
        <div className='col-span-3 border-r border-b'>
          <Chart symbol={token} />
          <div className='grid grid-cols-3 gap-4 p-4'>
            <div className='col-span-2'>
              <Orders />
            </div>
            <div>
              <OrderBook token={token} />
            </div>
          </div>
        </div>
        <TradeSidebar token={token} />
      </section>
    </div>
  )
}
