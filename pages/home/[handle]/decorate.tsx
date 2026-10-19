import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import DecorationMode from '@/components/pixel-homes/DecorationMode'
import { useToast } from '@/contexts/ToastContext'
import { HouseTemplate, ColorPalette, HouseCustomizations, AtmosphereSettings } from '@/components/pixel-homes/HouseSVG'
import { normalizeDecorationRow, normalizeHomeConfig } from '@/lib/pixel-homes/decoration-save-rules'
import type { SavePayload } from '@/lib/pixel-homes/editor-doc'

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
  const { showError, showSuccess } = useToast()
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

  // Resolves true once the home is saved; DecorationMode then leaves the editor.
  const handleSave = async (payload: SavePayload): Promise<boolean> => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/home/decorations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const reason = typeof body?.error === 'string' ? body.error : 'Something went wrong.'
        showError(`Couldn't save: ${reason} Your changes are still here.`)
        return false
      }

      showSuccess('Saved.')
      return true
    } catch (error) {
      console.error('Error saving decorations:', error)
      showError("Couldn't reach the server. Your changes are still here, so try again.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleExit = () => {
    router.push(`/home/${handle}`)
  }

  return (
    <>
      <Head>
        <title>Decorate Home - ThreadStead</title>
        <meta name="description" content={`Customize and decorate @${handle}'s pixel home`} />
        <meta name="robots" content="noindex" />
      </Head>

      {/* No site layout: the editor has its own slim header, so the site's
          nav can't be clicked by accident or tabbed through underneath */}
      <main id="main-content">
        <DecorationMode
          template={template}
          palette={palette}
          username={handle}
          onSave={handleSave}
          onExit={handleExit}
          initialDecorations={initialDecorations}
          initialHouseCustomizations={initialHouseCustomizations}
          initialAtmosphere={initialAtmosphere}
          initialTerrain={initialTerrain}
          isSaving={isSaving}
        />
      </main>
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
    const userHandle = await db.handle.findFirst({
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

    // Send everyone else to the home page before loading anything: the props
    // would otherwise carry the whole home, private or not.
    if (!isOwnHome) {
      return { redirect: { destination: `/home/${encodeURIComponent(cleanHandle)}`, permanent: false } }
    }

    // Get home configuration
    const homeConfig = await db.userHomeConfig.findUnique({
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

    // Get pngUrls for all decorations from DecorationItem table
    const decorationIds = homeConfig?.decorations?.map(d => d.decorationId) || []
    const decorationItems = decorationIds.length > 0
      ? await db.decorationItem.findMany({
          where: { itemId: { in: decorationIds } },
          select: { itemId: true, pngUrl: true, renderSvg: true }
        })
      : []

    // Create lookup map for pngUrls
    const pngUrlMap = new Map<string, { pngUrl: string | null; renderSvg: string | null }>(
      decorationItems.map(d => [d.itemId, { pngUrl: d.pngUrl, renderSvg: d.renderSvg }])
    )

    if (!homeConfig) {
      return {
        notFound: true
      }
    }

    // Transform decorations to match component interface
    const transformedDecorations = homeConfig.decorations?.map((decoration) => {
      // Get pngUrl and renderSvg from lookup map
      const decorationData = pngUrlMap.get(decoration.decorationId)

      const baseDecoration = {
        id: `${decoration.decorationId}_${decoration.id}`,
        decorationId: decoration.decorationId,
        name: 'Decoration', // Placeholder name as we don't fetch it yet
        type: decoration.decorationType,
        zone: 'front_yard' as const,
        ...normalizeDecorationRow(decoration),
        pngUrl: decorationData?.pngUrl || null,
        renderSvg: decorationData?.renderSvg || null
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

    // Older rows can hold values the save API now refuses (a colour with no
    // #, an unknown style); clean them here so the home opens and re-saves.
    const home = normalizeHomeConfig(homeConfig)

    return {
      props: {
        handle: cleanHandle,
        template: home.template,
        palette: home.palette,
        initialDecorations: transformedDecorations,
        initialHouseCustomizations: home.houseCustomizations,
        initialAtmosphere: home.atmosphere,
        initialTerrain: home.terrain,
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