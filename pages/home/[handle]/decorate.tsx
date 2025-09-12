import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { getSessionUser } from '@/lib/auth/server'
import { PrismaClient } from '@prisma/client'
import Layout from '@/components/ui/layout/Layout'
import DecorationMode from '@/components/pixel-homes/DecorationMode'
import { HouseTemplate, ColorPalette, HouseCustomizations } from '@/components/pixel-homes/HouseSVG'

const prisma = new PrismaClient()

interface DecorationPageProps {
  handle: string
  template: HouseTemplate
  palette: ColorPalette
  initialDecorations?: any[]
  initialHouseCustomizations?: HouseCustomizations
  initialAtmosphere?: any
  isOwnHome: boolean
}

export default function DecoratePage({
  handle,
  template,
  palette,
  initialDecorations = [],
  initialHouseCustomizations,
  initialAtmosphere,
  isOwnHome
}: DecorationPageProps) {
  const router = useRouter()

  // Redirect if not own home
  useEffect(() => {
    if (!isOwnHome) {
      router.push(`/home/${handle}`)
    }
  }, [isOwnHome, router, handle])

  if (!isOwnHome) {
    return <div>Redirecting...</div>
  }

  const handleSave = (data: any) => {
    // Navigate back to home page after save
    router.push(`/home/${handle}`)
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
            layer: true
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
    const transformedDecorations = homeConfig.decorations?.map(decoration => ({
      id: `${decoration.decorationId}_${Date.now()}`,
      type: decoration.decorationType,
      zone: 'front_yard' as const,
      position: {
        x: decoration.positionX || 0,
        y: decoration.positionY || 0,
        layer: decoration.layer || 1
      },
      variant: decoration.variant || 'default',
      size: decoration.size || 'medium'
    })) || []

    return {
      props: {
        handle: cleanHandle,
        template: homeConfig.houseTemplate || 'cottage_v1',
        palette: homeConfig.palette || 'thread_sage',
        initialDecorations: transformedDecorations,
        initialHouseCustomizations: {
          windowStyle: homeConfig.windowStyle,
          doorStyle: homeConfig.doorStyle,
          roofTrim: homeConfig.roofTrim,
          wallColor: homeConfig.wallColor,
          roofColor: homeConfig.roofColor,
          trimColor: homeConfig.trimColor,
          windowColor: homeConfig.windowColor,
          detailColor: homeConfig.detailColor,
          houseTitle: homeConfig.houseTitle,
          houseDescription: homeConfig.houseDescription,
          houseBoardText: homeConfig.houseBoardText
        },
        initialAtmosphere: {
          sky: homeConfig.atmosphereSky || 'sunny',
          weather: homeConfig.atmosphereWeather || 'clear',
          timeOfDay: homeConfig.atmosphereTimeOfDay || 'midday'
        },
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