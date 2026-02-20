declare global {
  interface Window {
    TradingView?: {
      widget: new (options: TradingViewWidgetOptions) => TradingViewWidget
    }
  }
}

export interface TradingViewWidgetOptions {
  autosize?: boolean
  symbol: string
  interval?: string
  timezone?: string
  theme?: 'light' | 'dark'
  style?: string
  locale?: string
  toolbar_bg?: string
  enable_publishing?: boolean
  allow_symbol_change?: boolean
  container_id: string
  height?: string | number
  width?: string | number
}

export type TradingViewWidget = object
