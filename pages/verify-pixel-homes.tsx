import React, { useState } from 'react'
import DecorationSVG, { DECORATION_LIBRARY } from '../components/pixel-homes/DecorationSVG'
import HouseSVG, { HouseTemplate, ColorPalette } from '../components/pixel-homes/HouseSVG'
import DecorationIcon from '../components/pixel-homes/DecorationIcon'

export default function VerifyPixelHomes() {
    const [rerender, setRerender] = useState(0)
    const [selectedPalette, setSelectedPalette] = useState<ColorPalette>('thread_sage')

    const palettes: ColorPalette[] = ['thread_sage', 'charcoal_nights', 'pixel_petals', 'crt_glow', 'classic_linen']
    const templates: HouseTemplate[] = ['cottage_v1', 'townhouse_v1', 'loft_v1', 'cabin_v1']

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-8">Pixel Home Decorations Verification</h1>

            <div className="mb-8 flex gap-4 items-center">
                <button
                    onClick={() => setRerender(prev => prev + 1)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Force Rerender (Check Jitter)
                </button>
                <div className="flex gap-2">
                    <span className="font-medium">Select Palette for Icons:</span>
                    <select
                        value={selectedPalette}
                        onChange={(e) => setSelectedPalette(e.target.value as ColorPalette)}
                        className="border rounded px-2 py-1"
                    >
                        {palettes.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            <h2 className="text-xl font-semibold mb-4">Palette Icons Verification</h2>
            <p className="mb-4 text-gray-600">These icons should change color when you select a different palette above.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {templates.map(template => (
                    <div key={template} className="bg-white p-4 rounded-lg shadow flex flex-col items-center">
                        <div className="mb-2 text-sm font-medium text-gray-500">{template}</div>
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                            <DecorationIcon
                                type="house_template"
                                id={template}
                                size={64}
                                palette={selectedPalette}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="text-xl font-semibold mb-4">House Templates & Themes (Full Size)</h2>
            <div className="space-y-8 mb-12">
                {templates.map(template => (
                    <div key={template}>
                        <h3 className="text-lg font-medium mb-2 capitalize">{template.replace('_v1', '')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {palettes.map(palette => (
                                <div key={palette} className="bg-white p-4 rounded-lg shadow flex flex-col items-center">
                                    <div className="mb-2 text-xs font-medium text-gray-500">{palette}</div>
                                    <div className="w-40 h-40 border border-gray-200 rounded p-2 bg-gray-50 flex items-center justify-center">
                                        <HouseSVG
                                            template={template}
                                            palette={palette}
                                            className="w-full h-full"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="text-xl font-semibold mb-4">Decorations</h2>
            {Object.entries(DECORATION_LIBRARY).map(([category, items]) => (
                <div key={category} className="mb-12">
                    <h3 className="text-lg font-medium mb-4 capitalize">{category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {items.map((item: any) => (
                            <div key={item.id} className="bg-white p-4 rounded-lg shadow flex flex-col items-center">
                                <div className="mb-2 text-sm font-medium text-gray-500">{item.name}</div>
                                <div className="border border-gray-200 rounded p-2 bg-green-50">
                                    <DecorationSVG
                                        decorationType={item.type}
                                        decorationId={item.id}
                                        size="large"
                                    />
                                </div>
                                <div className="mt-2 text-xs text-gray-400">{item.id}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
