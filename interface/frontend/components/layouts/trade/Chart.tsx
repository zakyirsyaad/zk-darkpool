'use client'
import React, { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Maximize01Icon, Minimize01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

interface ChartProps {
    symbol?: string
    exchange?: string
}

export default function Chart({ symbol = 'BTC', exchange = 'BINANCE' }: ChartProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartWrapperRef = useRef<HTMLDivElement>(null)
    const [widgetId] = useState(() => `tradingview-${Math.random().toString(36).substr(2, 9)}`)
    const widgetInstanceRef = useRef<object | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Fullscreen handlers
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
        }
    }, [])

    const toggleFullscreen = async () => {
        const wrapper = chartWrapperRef.current
        if (!wrapper) return

        try {
            if (!document.fullscreenElement) {
                await wrapper.requestFullscreen()
            } else {
                await document.exitFullscreen()
            }
        } catch (error) {
            console.error('Error toggling fullscreen:', error)
        }
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Ensure the container has the correct ID
        container.id = widgetId

        function initializeWidget() {
            const widgetContainer = document.getElementById(widgetId)

            if (!window.TradingView || !widgetContainer || !widgetContainer.parentElement) {
                return
            }

            // Clear any existing widget content before creating new one
            widgetContainer.innerHTML = ''

            try {
                widgetInstanceRef.current = new window.TradingView.widget({
                    autosize: true,
                    symbol: `${exchange}:${symbol}USDT`,
                    interval: 'D',
                    timezone: 'Etc/UTC',
                    theme: 'dark',
                    style: '1',
                    locale: 'en',
                    toolbar_bg: '#1a1a1a',
                    enable_publishing: false,
                    allow_symbol_change: true,
                    container_id: widgetId,
                    height: '100%',
                    width: '100%',
                })
            } catch (error) {
                console.error('Error initializing TradingView widget:', error)
            }
        }

        // Check if TradingView script is already loaded
        if (window.TradingView) {
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                initializeWidget()
            })
            return
        }

        // Create script element for TradingView widget
        const script = document.createElement('script')
        script.src = 'https://s3.tradingview.com/tv.js'
        script.async = true
        script.onload = () => {
            requestAnimationFrame(() => {
                initializeWidget()
            })
        }

        // Check if script is already in the document
        const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]')
        if (!existingScript) {
            document.head.appendChild(script)
        } else {
            // Script already exists, wait for it to load
            if (window.TradingView) {
                requestAnimationFrame(() => {
                    initializeWidget()
                })
            }
        }

        return () => {
            const widgetContainer = document.getElementById(widgetId)
            if (widgetContainer) {
                widgetContainer.innerHTML = ''
            }
            widgetInstanceRef.current = null
        }
    }, [symbol, exchange, widgetId])

    return (
        <div
            ref={chartWrapperRef}
            className="relative w-full h-full border"
        >
            <div
                id={widgetId}
                ref={containerRef}
                className="w-full h-full"
            />
            <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
                <HugeiconsIcon
                    icon={isFullscreen ? Minimize01Icon : Maximize01Icon}
                    strokeWidth={2}
                    className="size-4"
                />
            </Button>
        </div>
    )
}
