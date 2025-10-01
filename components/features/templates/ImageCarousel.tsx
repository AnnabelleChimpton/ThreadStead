import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface ImageCarouselProps extends UniversalCSSProps {
  autoplay?: boolean;
  interval?: number;
  showThumbnails?: boolean;
  showDots?: boolean;
  showArrows?: boolean;
  carouselHeight?: 'sm' | 'md' | 'lg' | 'xl';
  transition?: 'slide' | 'fade' | 'zoom';
  loop?: boolean;
  controls?: 'arrows' | 'dots' | 'thumbnails' | 'all';
  children?: React.ReactNode;
  className?: string;
}

interface CarouselImageProps {
  src: string;
  alt?: string;
  caption?: string;
  link?: string;
  children?: React.ReactNode;
}

export function CarouselImage({ src, alt, caption, link }: CarouselImageProps) {
  // This component is rendered by the parent ImageCarousel
  // We use a data attribute approach similar to ProgressTracker
  return (
    <div 
      data-carousel-src={src}
      data-carousel-alt={alt}
      data-carousel-caption={caption}
      data-carousel-link={link}
    >
      {caption && <span>{caption}</span>}
    </div>
  );
}

interface CarouselImageData {
  src: string;
  alt: string;
  caption?: string;
  link?: string;
}

export default function ImageCarousel(props: ImageCarouselProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    autoplay = false,
    interval = 5,
    showThumbnails = true,
    showDots = true,
    showArrows = true,
    carouselHeight = 'md',
    transition = 'slide',
    loop = true,
    controls = 'all',
    children,
    className: customClassName
  } = componentProps;

  const { images } = useResidentData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Extract image data from children or use resident data
  const getCarouselImages = (): CarouselImageData[] => {
    const childArray = React.Children.toArray(children);
    const customImages = childArray.map((child) => {
      if (React.isValidElement(child)) {
        const props = child.props as any;
        
        // Check if it's a CarouselImage component
        if (child.type === CarouselImage) {
          return {
            src: props.src,
            alt: props.alt || '',
            caption: props.caption,
            link: props.link
          };
        }
        // Check for data attributes (from template rendering)
        if (props['data-carousel-src']) {
          return {
            src: props['data-carousel-src'],
            alt: props['data-carousel-alt'] || '',
            caption: props['data-carousel-caption'],
            link: props['data-carousel-link']
          };
        }
      }
      return null;
    }).filter(Boolean) as CarouselImageData[];

    // Use custom images if provided, otherwise fall back to resident data
    if (customImages.length > 0) {
      return customImages;
    }

    // Convert resident data images to carousel format
    return (images || []).map(image => ({
      src: image.url,
      alt: image.alt || image.caption || 'User image',
      caption: image.caption,
      link: undefined
    }));
  };

  const carouselImages = getCarouselImages();

  // Reset current index if images change
  useEffect(() => {
    if (currentIndex >= carouselImages.length && carouselImages.length > 0) {
      setCurrentIndex(0);
    }
  }, [carouselImages.length, currentIndex]);

  // Autoplay functionality
  useEffect(() => {
    if (isPlaying && carouselImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => 
          loop ? (prev + 1) % carouselImages.length : 
          prev + 1 < carouselImages.length ? prev + 1 : prev
        );
      }, interval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, interval, carouselImages.length, loop]);

  // Navigation functions
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(false); // Pause autoplay on manual navigation
  }, []);

  const goToPrevious = useCallback(() => {
    if (carouselImages.length === 0) return;
    setCurrentIndex(prev => 
      loop ? (prev - 1 + carouselImages.length) % carouselImages.length :
      prev > 0 ? prev - 1 : prev
    );
    setIsPlaying(false);
  }, [carouselImages.length, loop]);

  const goToNext = useCallback(() => {
    if (carouselImages.length === 0) return;
    setCurrentIndex(prev => 
      loop ? (prev + 1) % carouselImages.length :
      prev + 1 < carouselImages.length ? prev + 1 : prev
    );
    setIsPlaying(false);
  }, [carouselImages.length, loop]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!carouselRef.current?.contains(document.activeElement)) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
        case ' ':
          event.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'Home':
          event.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          event.preventDefault();
          goToSlide(carouselImages.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, goToSlide, carouselImages.length]);

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Height classes
  const heightClasses = {
    sm: 'h-48',
    md: 'h-64',
    lg: 'h-96',
    xl: 'h-[32rem]'
  };

  // Transition classes
  const getTransitionClass = (index: number) => {
    if (transition === 'fade') {
      return index === currentIndex ? 'opacity-100' : 'opacity-0';
    } else if (transition === 'zoom') {
      return index === currentIndex ? 'scale-100 opacity-100' : 'scale-95 opacity-0';
    }
    // Default slide transition handled by transform
    return '';
  };

  // Determine which controls to show
  const shouldShowArrows = controls === 'all' || controls === 'arrows';
  const shouldShowDots = (controls === 'all' || controls === 'dots') && showDots;
  const shouldShowThumbnails = (controls === 'all' || controls === 'thumbnails') && showThumbnails;

  if (carouselImages.length === 0) {
    const emptyBaseClasses = "ts-image-carousel-empty bg-gray-100 rounded-lg p-8 text-center text-gray-500";
    const emptyFilteredClasses = removeTailwindConflicts(emptyBaseClasses, cssProps);
    const emptyStyle = applyCSSProps(cssProps);

    return (
      <div className={emptyFilteredClasses} style={emptyStyle}>
        <div className="text-4xl mb-2">🖼️</div>
        <div className="font-medium">No images to display</div>
        <div className="text-sm">Upload some images to create a carousel</div>
      </div>
    );
  }

  const currentImage = carouselImages[currentIndex];

  const baseClasses = [
    'ts-image-carousel',
    'relative',
    'bg-gray-100',
    'rounded-lg',
    'overflow-hidden',
    'focus-within:ring-2',
    'focus-within:ring-blue-500'
  ].filter(Boolean).join(' ');

  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const containerClassName = normalizedCustomClassName
    ? `${filteredClasses} ${normalizedCustomClassName}`
    : filteredClasses;

  return (
    <div
      ref={carouselRef}
      style={style}
      className={containerClassName}
      role="region"
      aria-label="Image carousel"
      tabIndex={0}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Main carousel display */}
      <div className={`ts-carousel-main relative ${heightClasses[carouselHeight]} overflow-hidden`}>
        {/* Image slides */}
        <div className="relative w-full h-full">
          {carouselImages.map((image, index) => {
            const slideContent = (
              <img
                src={image.src}
                alt={image.alt}
                className={`w-full h-full object-cover ${getTransitionClass(index)}`}
                style={{
                  transition: transition === 'slide' 
                    ? 'transform 0.5s ease-in-out' 
                    : 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out'
                }}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            );

            return (
              <div
                key={index}
                className={`ts-carousel-slide absolute inset-0 transition-all duration-500 ${getTransitionClass(index)}`}
                style={{
                  transform: transition === 'slide' 
                    ? `translateX(${(index - currentIndex) * 100}%)` 
                    : undefined
                }}
                aria-hidden={index !== currentIndex}
              >
                {image.link ? (
                  <a href={image.link} target="_blank" rel="noopener noreferrer">
                    {slideContent}
                  </a>
                ) : (
                  slideContent
                )}
                
                {/* Caption overlay */}
                {image.caption && (
                  <div className="ts-carousel-caption absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white text-sm font-medium">{image.caption}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation arrows */}
        {shouldShowArrows && showArrows && carouselImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="ts-carousel-arrow ts-carousel-arrow-prev absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Previous image"
              disabled={!loop && currentIndex === 0}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"></polyline>
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="ts-carousel-arrow ts-carousel-arrow-next absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Next image"
              disabled={!loop && currentIndex === carouselImages.length - 1}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </button>
          </>
        )}

        {/* Play/pause button */}
        {autoplay && carouselImages.length > 1 && (
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="ts-carousel-play-pause absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"></polygon>
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Thumbnail navigation */}
      {shouldShowThumbnails && carouselImages.length > 1 && (
        <div className="ts-carousel-thumbnails flex gap-2 p-3 bg-gray-50 overflow-x-auto">
          {carouselImages.map((image, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`ts-carousel-thumbnail flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                index === currentIndex 
                  ? 'border-blue-500 opacity-100' 
                  : 'border-gray-300 opacity-70 hover:opacity-100'
              }`}
              aria-label={`Go to image ${index + 1}: ${image.alt}`}
            >
              <img
                src={image.src}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Dot indicators */}
      {shouldShowDots && carouselImages.length > 1 && (
        <div className="ts-carousel-dots flex justify-center gap-2 p-3">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`ts-carousel-dot w-3 h-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                index === currentIndex 
                  ? 'bg-blue-500' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        Image {currentIndex + 1} of {carouselImages.length}: {currentImage.alt}
      </div>
    </div>
  );
}