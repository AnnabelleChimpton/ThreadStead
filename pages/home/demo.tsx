import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Layout from '../../components/ui/layout/Layout'
import EnhancedHouseCanvas from '../../components/pixel-homes/EnhancedHouseCanvas'
import { HouseTemplate, ColorPalette, HouseCustomizations } from '../../components/pixel-homes/HouseSVG'
import { PixelIcon } from '@/components/ui/PixelIcon'

/**
 * Demo Pixel Home Landing Page
 *
 * Shows visitors what a pixel home looks like with:
 * - Hard-coded cottage demo house
 * - 2 sample decorations
 * - Day/night atmosphere toggle
 * - Clear CTAs for creating their own
 */
export default function DemoPixelHome() {
  // Day/night toggle state
  const [isNight, setIsNight] = useState(false)

  // Hard-coded demo configuration
  const demoConfig: {
    template: HouseTemplate
    palette: ColorPalette
    customizations: HouseCustomizations
  } = {
    template: 'cottage_v1',
    palette: 'thread_sage',
    customizations: {
      windowStyle: 'default',
      doorStyle: 'default',
      roofTrim: 'scalloped',
      houseTitle: 'Demo Pixel Home',
      houseDescription: 'A sample pixel home. Poke around, then go build your own.',
      houseBoardText: '~demo~'
    }
  }

  // Hard-coded sample decorations
  // IDs are structured as: decorationType_timestamp
  // The system extracts the base ID by removing the last segment
  const demoDecorations = [
    {
      id: 'roses_red_1',
      name: 'roses_red',
      type: 'plant' as const,
      zone: 'front_yard' as const,
      position: { x: 80, y: 280, layer: 8 },
      variant: 'red',
      size: 'medium' as const
    },
    {
      id: 'garden_gnome_1',
      name: 'garden_gnome',
      type: 'feature' as const,
      zone: 'front_yard' as const,
      position: { x: 380, y: 290, layer: 8 },
      variant: 'classic',
      size: 'small' as const
    }
  ]

  // Demo terrain - sample path leading to the house
  const demoTerrain: Record<string, string> = {
    '3,9': 'path_stone',
    '4,9': 'path_stone',
    '5,9': 'path_stone',
    '6,9': 'path_stone',
  }

  // Atmosphere settings based on day/night toggle
  const atmosphere = {
    sky: isNight ? ('night' as const) : ('sunny' as const),
    weather: 'clear' as const,
    timeOfDay: isNight ? ('night' as const) : ('midday' as const)
  }

  const pageTitle = 'Demo Pixel Home | ThreadStead'
  const pageDescription = 'A sample pixel home showing what you can build on ThreadStead: house styles, colors, decorations, and atmosphere.'

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/home/demo`} />
      </Head>

      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-thread-paper via-thread-cream to-thread-sky bg-opacity-10">
          <div className="container mx-auto px-4 py-8 max-w-5xl">

            {/* Header Banner */}
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-r from-thread-sage to-thread-pine text-thread-paper px-6 py-3 rounded-full shadow-cozy mb-4">
                <span className="text-lg font-headline font-bold inline-flex items-center gap-2">
                  <PixelIcon name="paint-bucket" size={18} /> Demo Pixel Home — look around, then build your own
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-headline font-bold text-thread-pine mb-3">
                A Peek at a Pixel Home
              </h1>
              <p className="text-thread-sage text-lg max-w-2xl mx-auto leading-relaxed">
                This is a sample of what you can build on ThreadStead. Every detail here —
                the house style, the colors, even the garden gnome — is up to you.
              </p>
            </div>

            {/* Main Demo House Display */}
            <div className="bg-gradient-to-br from-thread-sky from-opacity-10 to-thread-cream rounded-3xl p-8 shadow-2xl border-4 border-thread-sage border-opacity-30 mb-8">
              <div className="flex justify-center">
                <EnhancedHouseCanvas
                  template={demoConfig.template}
                  palette={demoConfig.palette}
                  decorations={demoDecorations}
                  houseCustomizations={demoConfig.customizations}
                  atmosphere={atmosphere}
                  terrain={demoTerrain}
                  className="mx-auto drop-shadow-2xl"
                />
              </div>

              {/* House Description */}
              <div className="text-center mt-6 space-y-2">
                <div className="text-xl font-headline font-semibold text-thread-pine">
                  {demoConfig.customizations.houseTitle}
                </div>
                <div className="text-thread-sage max-w-lg mx-auto leading-relaxed">
                  {demoConfig.customizations.houseDescription}
                </div>
              </div>

              {/* Day/Night Toggle */}
              <div className="mt-6 flex justify-center">
                <div className="bg-thread-paper border-2 border-thread-sage rounded-lg p-4 shadow-cozySm">
                  <div className="text-sm font-medium text-thread-pine mb-3 text-center">
                    Try the atmosphere toggle:
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsNight(false)}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${!isNight
                          ? 'bg-thread-sage text-thread-paper shadow-cozy transform -translate-y-0.5'
                          : 'bg-thread-cream text-thread-sage border border-thread-sage hover:bg-thread-sage hover:text-thread-paper'
                        }`}
                    >
                      <PixelIcon name="sun" size={20} />
                      Day
                    </button>
                    <button
                      onClick={() => setIsNight(true)}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${isNight
                          ? 'bg-thread-pine text-thread-paper shadow-cozy transform -translate-y-0.5'
                          : 'bg-thread-cream text-thread-sage border border-thread-sage hover:bg-thread-pine hover:text-thread-paper'
                        }`}
                    >
                      <PixelIcon name="moon" size={20} />
                      Night
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* What are Pixel Homes? */}
            <div className="bg-thread-paper border-2 border-thread-sage rounded-xl p-8 shadow-cozy mb-8">
              <h2 className="text-2xl font-headline font-bold text-thread-pine mb-6 text-center">
                <PixelIcon name="home" size={20} className="inline-block align-middle" /> What are Pixel Homes?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0"><PixelIcon name="home" size={24} /></span>
                  <div>
                    <div className="font-semibold text-thread-pine mb-1">Choose Your House Style</div>
                    <div className="text-sm text-thread-sage leading-relaxed">
                      Pick from cottages, townhouses, lofts, or cabins — each with unique character
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0"><PixelIcon name="paint-bucket" size={24} /></span>
                  <div>
                    <div className="font-semibold text-thread-pine mb-1">Customize Everything</div>
                    <div className="text-sm text-thread-sage leading-relaxed">
                      Change colors, add decorations, customize windows, doors, and roof styles
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0"><PixelIcon name="cloud-sun" size={24} /></span>
                  <div>
                    <div className="font-semibold text-thread-pine mb-1">Set the Atmosphere</div>
                    <div className="text-sm text-thread-sage leading-relaxed">
                      Pick sunny days, cloudy skies, sunsets, or quiet nights
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0"><PixelIcon name="mail" size={24} /></span>
                  <div>
                    <div className="font-semibold text-thread-pine mb-1">Interactive Features</div>
                    <div className="text-sm text-thread-sage leading-relaxed">
                      Mailbox, guestbook, visitor tracking, and connections to your profile
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action Buttons */}
            <div className="space-y-4">
              <div className="bg-thread-paper border-2 border-thread-sage rounded-xl p-6 shadow-cozy text-center">
                <h3 className="text-xl font-headline font-semibold text-thread-pine mb-3">
                  Ready to Build Your Own?
                </h3>
                <p className="text-thread-sage mb-6 max-w-lg mx-auto">
                  Join ThreadStead and set up a pixel home of your own — a little corner
                  of the web to decorate, with neighbors right down the street.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/signup"
                    className="px-8 py-4 bg-gradient-to-r from-thread-sage to-thread-pine text-thread-paper hover:from-thread-pine hover:to-thread-sage transition-all duration-300 rounded-lg font-medium shadow-cozy hover:shadow-thread transform hover:-translate-y-1 text-center"
                  >
                    <span className="inline-flex items-center justify-center gap-2"><PixelIcon name="home" size={16} /> Create Your Home</span>
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-4 bg-thread-cream hover:bg-thread-sky hover:bg-opacity-20 text-thread-pine transition-all duration-300 rounded-lg font-medium border-2 border-thread-sage shadow-cozySm hover:shadow-cozy transform hover:-translate-y-1 text-center"
                  >
                    Sign In
                  </Link>
                </div>
              </div>

              {/* Explore More Homes */}
              <div className="bg-thread-paper border-2 border-thread-sage rounded-xl p-6 shadow-cozy text-center">
                <h3 className="text-xl font-headline font-semibold text-thread-pine mb-3">
                  Explore the Neighborhood
                </h3>
                <p className="text-thread-sage mb-6 max-w-lg mx-auto">
                  See what other folks have built — there are hundreds of pixel homes
                  across ThreadStead to wander past.
                </p>
                <Link
                  href="/neighborhood/explore/all"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-thread-cream hover:bg-thread-sky hover:bg-opacity-20 text-thread-pine transition-all duration-300 rounded-lg font-medium border-2 border-thread-sage shadow-cozySm hover:shadow-cozy transform hover:-translate-y-1"
                >
                  <PixelIcon name="buildings" size={16} /> Explore More Homes
                </Link>
              </div>
            </div>

            {/* Demo Note */}
            <div className="mt-8 text-center">
              <div className="inline-block bg-thread-cream border border-thread-sage rounded-lg px-6 py-3 shadow-cozySm">
                <p className="text-sm text-thread-sage">
                  <span className="font-medium text-thread-pine">Note:</span> This is a static demo.
                  Sign up to create your own fully customizable pixel home with saved decorations,
                  visitor tracking, and interactive features.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}
