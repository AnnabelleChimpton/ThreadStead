import React from 'react';
import EnhancedHouseCanvas from './EnhancedHouseCanvas';
import { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG';

interface PixelHomeSnapshotProps {
    template: HouseTemplate;
    palette: ColorPalette;
    username: string;
    displayName?: string;
    houseCustomizations?: any;
    decorations?: any[];
    atmosphere?: {
        sky: string;
        weather: string;
        timeOfDay: string;
    };
    badges?: Array<{
        id: string;
        title: string;
        backgroundColor: string;
        textColor: string;
        threadRing: {
            name: string;
            slug: string;
        };
    }>;
    className?: string;
}

/**
 * A clean, shareable version of the Pixel Home - just the canvas itself.
 * Designed to be captured as a PNG for social media sharing.
 */
export default function PixelHomeSnapshot({
    template,
    palette,
    username,
    displayName,
    houseCustomizations,
    decorations = [],
    atmosphere = { sky: 'sunny', weather: 'clear', timeOfDay: 'midday' },
    badges,
    className = ''
}: PixelHomeSnapshotProps) {
    return (
        <div className={className}>
            <EnhancedHouseCanvas
                template={template}
                palette={palette}
                houseCustomizations={houseCustomizations as HouseCustomizations}
                decorations={decorations}
                atmosphere={atmosphere as any}
                className="w-full h-auto"
            />
        </div>
    );
}
