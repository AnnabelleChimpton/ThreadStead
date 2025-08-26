import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export default function ImageCropper({ 
  imageUrl, 
  onCropComplete, 
  onCancel, 
  aspectRatio = 1 
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const size = Math.min(width, height);
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    
    // Set initial crop to center square
    setCrop({
      unit: 'px',
      width: size * 0.8,
      height: size * 0.8,
      x: x + (size * 0.1),
      y: y + (size * 0.1),
    });
  }, []);

  const getCroppedImg = useCallback(async (
    image: HTMLImageElement,
    crop: PixelCrop
  ): Promise<Blob> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not found');

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not found');

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to crop size
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Draw the cropped image
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg', 0.9);
    });
  }, []);

  const handleApplyCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    setProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      onCropComplete(croppedBlob);
    } catch {
      // Image cropping failed silently
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay-high fixed inset-0 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-thread-pine">Crop Your Profile Photo</h3>
            <button
              onClick={onCancel}
              className="text-thread-sage hover:text-thread-charcoal"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-thread-sage">
              Drag to reposition and resize the crop area. The selected area will be saved as your profile photo.
            </p>
            
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                minWidth={50}
                minHeight={50}
                keepSelection
                className="max-w-full max-h-[400px]"
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imageUrl}
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[400px] object-contain"
                />
              </ReactCrop>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-thread-sage">
              <button
                onClick={onCancel}
                className="thread-button-secondary"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCrop}
                disabled={!completedCrop || processing}
                className="thread-button disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Apply Crop'}
              </button>
            </div>
            
            <div className="text-xs text-thread-sage">
              <p>• Square images work best for profile photos</p>
              <p>• We&apos;ll automatically create thumbnail, medium, and full-size versions</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden canvas for cropping */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
}