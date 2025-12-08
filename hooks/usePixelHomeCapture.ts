import { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';

interface UsePixelHomeCaptureOptions {
    filename?: string;
}

/**
 * Convert a cross-origin image to a data URL by fetching through a proxy
 */
async function imageToDataUrl(imgSrc: string): Promise<string | null> {
    try {
        // Use our proxy endpoint to fetch the image
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) return null;

        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

/**
 * Pre-process all cross-origin images in an element by converting them to data URLs
 */
async function convertCrossOriginImages(element: HTMLElement): Promise<Map<HTMLImageElement, string>> {
    const originalSrcs = new Map<HTMLImageElement, string>();
    const images = element.querySelectorAll('img');

    const conversions = Array.from(images).map(async (img) => {
        const src = img.src;
        // Skip data URLs and blob URLs - they're already local
        if (src.startsWith('data:') || src.startsWith('blob:') || !src) {
            return;
        }

        // Check if it's a cross-origin URL
        try {
            const imgUrl = new URL(src);
            const currentUrl = new URL(window.location.href);
            if (imgUrl.origin === currentUrl.origin) {
                return; // Same origin, no conversion needed
            }
        } catch {
            return; // Invalid URL
        }

        // Convert to data URL
        const dataUrl = await imageToDataUrl(src);
        if (dataUrl) {
            originalSrcs.set(img, src);
            img.src = dataUrl;
        }
    });

    await Promise.all(conversions);
    return originalSrcs;
}

/**
 * Restore original image sources after capture
 */
function restoreImageSources(originalSrcs: Map<HTMLImageElement, string>): void {
    originalSrcs.forEach((src, img) => {
        img.src = src;
    });
}

export function usePixelHomeCapture(options: UsePixelHomeCaptureOptions = {}) {
    const {
        filename = 'my-pixel-home.png'
    } = options;

    const captureRef = useRef<HTMLDivElement>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const takeSnapshot = useCallback(async (): Promise<Blob | null> => {
        if (!captureRef.current) {
            setError('No element to capture');
            return null;
        }

        setIsCapturing(true);
        setError(null);

        let originalSrcs: Map<HTMLImageElement, string> | null = null;

        try {
            // Wait for fonts to load
            await document.fonts.ready;

            // Small delay to ensure all rendering is complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Convert cross-origin images to data URLs
            originalSrcs = await convertCrossOriginImages(captureRef.current);

            // Another small delay after image conversion
            await new Promise(resolve => setTimeout(resolve, 50));

            const dataUrl = await toPng(captureRef.current, {
                cacheBust: true,
                pixelRatio: 2, // High DPI for crisp pixel art
            });

            // Convert data URL to blob (direct conversion, no fetch needed)
            const base64Data = dataUrl.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });

            // Restore original image sources
            if (originalSrcs) {
                restoreImageSources(originalSrcs);
            }

            setIsCapturing(false);
            return blob;
        } catch (err) {
            console.error('Failed to capture pixel home:', err);
            setError(err instanceof Error ? err.message : 'Failed to capture image');

            // Restore original image sources on error
            if (originalSrcs) {
                restoreImageSources(originalSrcs);
            }

            setIsCapturing(false);
            return null;
        }
    }, []);

    const downloadSnapshot = useCallback(async () => {
        const blob = await takeSnapshot();
        if (blob) {
            saveAs(blob, filename);
        }
    }, [takeSnapshot, filename]);

    const shareSnapshot = useCallback(async () => {
        const blob = await takeSnapshot();
        if (!blob) return;

        // Try Web Share API first (mobile-friendly)
        if (navigator.share && navigator.canShare) {
            try {
                const file = new File([blob], filename, { type: 'image/png' });
                const shareData = {
                    files: [file],
                    title: 'My Pixel Home on Threadstead',
                    text: 'Check out my pixel home! 🏠✨'
                };

                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    return;
                }
            } catch (err) {
                console.log('Web Share API failed, falling back to social links');
            }
        }

        // Fallback: Download and open social media share links
        saveAs(blob, filename);

        // Open Twitter/X share dialog
        const tweetText = encodeURIComponent('Check out my pixel home on Threadstead! 🏠✨');
        const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
    }, [takeSnapshot, filename]);

    return {
        captureRef,
        takeSnapshot,
        downloadSnapshot,
        shareSnapshot,
        isCapturing,
        error
    };
}
