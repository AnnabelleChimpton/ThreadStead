import React from 'react';
import Modal from '@/components/ui/feedback/Modal';
import PixelHomeSnapshot from './PixelHomeSnapshot';
import { usePixelHomeCapture } from '@/hooks/usePixelHomeCapture';
import { HouseTemplate, ColorPalette } from './HouseSVG';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface SharePixelHomeModalProps {
    isOpen: boolean;
    onClose: () => void;
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
    terrain?: Record<string, string>;
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
}

export default function SharePixelHomeModal({
    isOpen,
    onClose,
    template,
    palette,
    username,
    displayName,
    houseCustomizations,
    decorations = [],
    atmosphere = { sky: 'sunny', weather: 'clear', timeOfDay: 'midday' },
    terrain,
    badges
}: SharePixelHomeModalProps) {
    const { captureRef, downloadSnapshot, shareSnapshot, isCapturing, error } = usePixelHomeCapture({
        filename: `${username}-pixel-home.png`
    });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Share Your Pixel Home"
            bodyClassName="p-3 sm:p-6"
        >
            {/* Preview */}
            <div className="mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm text-nb-ink-mid mb-3 sm:mb-4 text-center">
                    Preview of your shareable image:
                </p>
                <div className="flex justify-center border-2 border-dotted border-nb-ink-mid/40 p-2 sm:p-4 overflow-x-auto">
                    <div ref={captureRef} className="max-w-full">
                        <PixelHomeSnapshot
                            template={template}
                            palette={palette}
                            username={username}
                            displayName={displayName}
                            houseCustomizations={houseCustomizations}
                            decorations={decorations}
                            atmosphere={atmosphere}
                            terrain={terrain}
                            badges={badges}
                            className="max-w-full h-auto"
                        />
                    </div>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-100 border-2 border-red-500 text-red-700">
                    <p className="font-medium text-sm">Error: {error}</p>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                    onClick={downloadSnapshot}
                    disabled={isCapturing}
                    className="btn btn--primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCapturing ? (
                        <>
                            <PixelIcon name="camera" size={20} />
                            <span>Capturing...</span>
                        </>
                    ) : (
                        <>
                            <PixelIcon name="download" size={20} />
                            <span>Download PNG</span>
                        </>
                    )}
                </button>

                <button
                    onClick={shareSnapshot}
                    disabled={isCapturing}
                    className="btn btn--secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCapturing ? (
                        <>
                            <PixelIcon name="camera" size={20} />
                            <span>Capturing...</span>
                        </>
                    ) : (
                        <>
                            <PixelIcon name="external-link" size={20} />
                            <span>Share to Social</span>
                        </>
                    )}
                </button>
            </div>

            {/* Instructions */}
            <div className="mt-3 sm:mt-4 p-2 sm:p-4 border border-dotted border-nb-ink-mid/40 rounded">
                <p className="text-xs sm:text-sm text-nb-ink-mid flex items-start gap-2">
                    <PixelIcon name="lightbulb" size={16} className="flex-shrink-0 mt-0.5" />
                    <span><strong>Tip:</strong> On mobile, use &quot;Share to Social&quot; to share directly to Twitter/Bluesky. On desktop, the image will download and a share dialog will open.</span>
                </p>
            </div>
        </Modal>
    );
}
