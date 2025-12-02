import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";

interface DecorationData {
  decorationType: string;
  decorationId: string;
  zone: string;
  positionX: number;
  positionY: number;
  layer?: number;
  variant?: string;
  size?: string;
  data?: any;
}

interface AtmosphereSettings {
  sky: 'sunny' | 'cloudy' | 'sunset' | 'night';
  weather: 'clear' | 'light_rain' | 'light_snow';
  timeOfDay: 'morning' | 'midday' | 'evening' | 'night';
}

interface HouseCustomizations {
  windowStyle?: 'default' | 'round' | 'arched' | 'bay';
  doorStyle?: 'default' | 'arched' | 'double' | 'cottage';
  roofTrim?: 'default' | 'ornate' | 'scalloped' | 'gabled';
  wallColor?: string;
  roofColor?: string;
  trimColor?: string;
  windowColor?: string;
  detailColor?: string;
  houseTitle?: string;
  houseDescription?: string;
  houseBoardText?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const me = await getSessionUser(req);
  if (!me) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { decorations, atmosphere, houseCustomizations, template, palette } = req.body as {
    decorations: DecorationData[],
    atmosphere?: AtmosphereSettings,
    houseCustomizations?: HouseCustomizations,
    template?: string,
    palette?: string
  };

  if (!Array.isArray(decorations)) {
    return res.status(400).json({ error: "Decorations must be an array" });
  }

  try {
    // Ensure UserHomeConfig exists first (required for foreign key relationship)
    const configUpdate: any = {};
    if (atmosphere) {
      configUpdate.atmosphereSky = atmosphere.sky;
      configUpdate.atmosphereWeather = atmosphere.weather;
      configUpdate.atmosphereTimeOfDay = atmosphere.timeOfDay;
    }
    if (template) {
      configUpdate.houseTemplate = template;
    }
    if (palette) {
      configUpdate.palette = palette;
    }
    if (houseCustomizations) {
      configUpdate.windowStyle = houseCustomizations.windowStyle;
      configUpdate.doorStyle = houseCustomizations.doorStyle;
      configUpdate.roofTrim = houseCustomizations.roofTrim;
      configUpdate.wallColor = houseCustomizations.wallColor;
      configUpdate.roofColor = houseCustomizations.roofColor;
      configUpdate.trimColor = houseCustomizations.trimColor;
      configUpdate.windowColor = houseCustomizations.windowColor;
      configUpdate.detailColor = houseCustomizations.detailColor;
      configUpdate.houseTitle = houseCustomizations.houseTitle;
      configUpdate.houseDescription = houseCustomizations.houseDescription;
      configUpdate.houseBoardText = houseCustomizations.houseBoardText;
    }

    await db.userHomeConfig.upsert({
      where: { userId: me.id },
      update: configUpdate, // Update atmosphere if provided
      create: {
        userId: me.id,
        houseTemplate: template || 'cottage_v1',
        palette: palette || 'thread_sage',
        seasonalOptIn: false,
        preferPixelHome: true,
        atmosphereSky: atmosphere?.sky || 'sunny',
        atmosphereWeather: atmosphere?.weather || 'clear',
        atmosphereTimeOfDay: atmosphere?.timeOfDay || 'midday',
        windowStyle: houseCustomizations?.windowStyle || 'default',
        doorStyle: houseCustomizations?.doorStyle || 'default',
        roofTrim: houseCustomizations?.roofTrim || 'default',
        wallColor: houseCustomizations?.wallColor,
        roofColor: houseCustomizations?.roofColor,
        trimColor: houseCustomizations?.trimColor,
        windowColor: houseCustomizations?.windowColor,
        detailColor: houseCustomizations?.detailColor,
        houseTitle: houseCustomizations?.houseTitle,
        houseDescription: houseCustomizations?.houseDescription,
        houseBoardText: houseCustomizations?.houseBoardText
      }
    });

    // Clear existing decorations for this user
    await db.userHomeDecoration.deleteMany({
      where: { userId: me.id }
    });

    // Save new decorations
    if (decorations.length > 0) {
      const decorationRecords = decorations.map(decoration => ({
        userId: me.id,
        decorationType: decoration.decorationType,
        decorationId: decoration.decorationId,
        zone: decoration.zone,
        positionX: decoration.positionX,
        positionY: decoration.positionY,
        layer: decoration.layer || 1,
        variant: decoration.variant || 'default',
        size: decoration.size || 'medium',
        data: decoration.data
      }));

      await db.userHomeDecoration.createMany({
        data: decorationRecords
      });
    }

    return res.status(200).json({
      ok: true,
      saved: decorations.length
    });

  } catch (error) {
    console.error('Error saving decorations:', error);
    return res.status(500).json({ error: "Failed to save decorations" });
  }
}