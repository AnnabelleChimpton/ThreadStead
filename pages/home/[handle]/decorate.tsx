import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { getSessionUser } from '@/lib/auth/server'
import { PrismaClient } from '@prisma/client'
import Layout from '@/components/ui/layout/Layout'
import DecorationMode from '@/components/pixel-homes/DecorationMode'
import { HouseTemplate, ColorPalette, HouseCustomizations, AtmosphereSettings } from '@/components/pixel-homes/HouseSVG'

const prisma = new PrismaClient()

interface DecorationPageProps {
  handle: string
  template: HouseTemplate
  palette: ColorPalette
  initialDecorations?: any[]
  initialHouseCustomizations?: HouseCustomizations
  initialAtmosphere?: AtmosphereSettings
  initialTerrain?: Record<string, string>
  isOwnHome: boolean
}

export default function DecoratePage({
  handle,
  template,
  palette,
  initialDecorations = [],
  initialHouseCustomizations,
  initialAtmosphere,
  initialTerrain,
  isOwnHome
}: DecorationPageProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  // Redirect if not own home
  useEffect(() => {
    if (!isOwnHome) {
      router.push(`/home/${handle}`)
    }
  }, [isOwnHome, router, handle])

  if (!isOwnHome) {
    return <div>Redirecting...</div>
  }

  const handleSave = async (data: any) => {
    try {
      setIsSaving(true)

      // Transform decorations to match API expected format
      const formattedDecorations = data.decorations.map((d: any) => {
        // Extract base ID from complex ID (e.g. tree_pine_123 -> tree_pine)
        // If d.decorationId exists (from DB), use it. Otherwise strip suffix from d.id
        const baseId = d.decorationId || d.id.replace(/_(\d+)_[a-z0-9]+$|_\d+$/, '')

        return {
          decorationType: d.type,
          decorationId: baseId,
          zone: d.zone || 'front_yard',
          positionX: Math.round(d.position.x),
          positionY: Math.round(d.position.y),
          layer: d.position.layer || 1,
          variant: d.variant || 'default',
          size: d.size || 'medium',
          data: d.data
        }
      })

      const payload = {
        decorations: formattedDecorations,
        houseCustomizations: data.houseCustomizations,
        atmosphere: data.atmosphere,
        template: data.template,
        palette: data.palette,
        terrain: data.terrain
      }

      const response = await fetch('/api/home/decorations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to save decorations')
      }

      // Navigate back to home page after successful save
      router.push(`/home/${handle}`)
    } catch (error) {
      console.error('Error saving decorations:', error)
      alert('Failed to save decorations. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Navigate back to home page without saving
    router.push(`/home/${handle}`)
  }

  return (
    <>
      <Head>
        <title>Decorate Home - ThreadStead</title>
        <meta name="description" content={`Customize and decorate @${handle}'s pixel home`} />
        <meta name="robots" content="noindex" />
      </Head>

      <Layout>
        <div className="bg-thread-paper">
          <DecorationMode
            template={template}
            palette={palette}
            username={handle}
            onSave={handleSave}
            onCancel={handleCancel}
            initialDecorations={initialDecorations}
            initialHouseCustomizations={initialHouseCustomizations}
            initialAtmosphere={initialAtmosphere}
            initialTerrain={initialTerrain}
          />
        </div>
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { handle } = context.params!
  const viewer = await getSessionUser(context.req as any)

  try {
    // Remove @ prefix if present
    const cleanHandle = (handle as string).startsWith('@') ? (handle as string).slice(1) : (handle as string)

    // Find user by handle
    const userHandle = await prisma.handle.findFirst({
      where: { handle: cleanHandle.toLowerCase() },
      include: {
        user: true
      }
    })

    if (!userHandle?.user) {
      return {
        notFound: true
      }
    }

    const user = userHandle.user

    // Check if this is the user's own home
    const isOwnHome = viewer?.id === user.id

    // Get home configuration
    const homeConfig = await prisma.userHomeConfig.findUnique({
      where: { userId: user.id },
      include: {
        decorations: {
          select: {
            id: true,
            decorationType: true,
            decorationId: true,
            variant: true,
            size: true,
            positionX: true,
            positionY: true,
            layer: true,
            data: true
          }
        }
      }
    })

    if (!homeConfig) {
      return {
        notFound: true
      }
    }

    // Transform decorations to match component interface
    const transformedDecorations = homeConfig.decorations?.map((decoration, i) => {
      const baseDecoration = {
        id: `${decoration.decorationId}_${Date.now()}_${i}`,
        decorationId: decoration.decorationId,
        name: 'Decoration', // Placeholder name as we don't fetch it yet
        type: decoration.decorationType,
        zone: 'front_yard' as const,
        position: {
          x: decoration.positionX || 0,
          y: decoration.positionY || 0,
          layer: decoration.layer || 1
        },
        variant: decoration.variant || 'default',
        size: decoration.size || 'medium',
        data: decoration.data
      }

      // For custom type decorations, extract customAssetUrl and slot from data
      if (decoration.decorationType === 'custom' && decoration.data) {
        const data = decoration.data as { customAssetUrl?: string; slot?: number }
        return {
          ...baseDecoration,
          customAssetUrl: data.customAssetUrl || null,
          slot: typeof data.slot === 'number' ? data.slot : null
        }
      }

      return baseDecoration
    }) || []

    return {
      props: {
        handle: cleanHandle,
        template: homeConfig.houseTemplate || 'cottage_v1',
        palette: homeConfig.palette || 'thread_sage',
        initialDecorations: transformedDecorations,
        initialHouseCustomizations: {
          windowStyle: homeConfig.windowStyle || null,
          doorStyle: homeConfig.doorStyle || null,
          roofTrim: homeConfig.roofTrim || null,
          wallColor: homeConfig.wallColor || null,
          roofColor: homeConfig.roofColor || null,
          trimColor: homeConfig.trimColor || null,
          windowColor: homeConfig.windowColor || null,
          detailColor: homeConfig.detailColor || null,
          houseTitle: homeConfig.houseTitle || null,
          houseDescription: homeConfig.houseDescription || null,
          houseBoardText: homeConfig.houseBoardText || null
        },
        initialAtmosphere: {
          sky: homeConfig.atmosphereSky || 'sunny',
          weather: homeConfig.atmosphereWeather || 'clear',
          timeOfDay: homeConfig.atmosphereTimeOfDay || 'midday'
        },
        initialTerrain: (homeConfig.terrain as Record<string, string>) || {},
        isOwnHome
      }
    }
  } catch (error) {
    console.error('Error fetching home data:', error)
    return {
      notFound: true
    }
  }
}