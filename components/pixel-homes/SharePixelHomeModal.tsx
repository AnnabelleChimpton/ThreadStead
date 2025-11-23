import React, { useEffect } from 'react';
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
    badges
}: SharePixelHomeModalProps) {
    const { captureRef, downloadSnapshot, shareSnapshot, isCapturing, error } = usePixelHomeCapture({
        filename: `${username}-pixel-home.png`
    });

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white border-2 border-black shadow-[8px_8px_0_#000] w-full max-w-2xl max-h-[80vh] mt-16 overflow-y-auto">
                {/* Header */}
                <div className="border-b-2 border-black p-3 sm:p-4 flex items-center justify-between bg-thread-butter">
                    <h2 className="text-lg sm:text-2xl font-bold">Share Your Pixel Home</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl sm:text-3xl hover:text-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-6">
                    {/* Preview */}
                    <div className="mb-4 sm:mb-6">
                        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 text-center">
                            Preview of your shareable image:
                        </p>
                        <div className="flex justify-center border-2 border-gray-300 bg-gray-50 p-2 sm:p-4 overflow-x-auto">
                            <div ref={captureRef} className="max-w-full">
                                <PixelHomeSnapshot
                                    template={template}
                                    palette={palette}
                                    username={username}
                                    displayName={displayName}
                                    houseCustomizations={houseCustomizations}
                                    decorations={decorations}
                                    atmosphere={atmosphere}
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
                            className="flex-1 bg-blue-200 hover:bg-blue-100 disabled:bg-gray-200 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[1px_1px_0_#000] active:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] px-4 sm:px-6 py-2 sm:py-3 font-bold text-sm sm:text-base transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                            className="flex-1 bg-green-200 hover:bg-green-100 disabled:bg-gray-200 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[1px_1px_0_#000] active:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] px-4 sm:px-6 py-2 sm:py-3 font-bold text-sm sm:text-base transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    <div className="mt-3 sm:mt-4 p-2 sm:p-4 bg-gray-50 border border-gray-300 rounded">
                        <p className="text-xs sm:text-sm text-gray-700 flex items-start gap-2">
                            <PixelIcon name="lightbulb" size={16} className="flex-shrink-0 mt-0.5" />
                            <span><strong>Tip:</strong> On mobile, use &quot;Share to Social&quot; to share directly to Twitter/Bluesky. On desktop, the image will download and a share dialog will open.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
