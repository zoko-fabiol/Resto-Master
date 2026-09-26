import React, { useState } from 'react';
import { cloudinaryService, ImageTransformOptions } from '../../services/media/cloudinaryService';
import { Image as ImageIcon, AlertCircle } from 'lucide-react';

interface CloudinaryImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  publicId?: string;
  options?: ImageTransformOptions;
  fallbackIcon?: React.ReactNode;
  containerClassName?: string;
}

export const CloudinaryImage: React.FC<CloudinaryImageProps> = ({
  src,
  publicId,
  options = {},
  fallbackIcon,
  className = '',
  containerClassName = '',
  alt = 'RestoMaster Image',
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Compute final URL through Cloudinary transformation engine
  const targetSource = publicId || src || '';
  const optimizedUrl = cloudinaryService.getOptimizedImageUrl(targetSource, {
    format: 'auto',
    quality: 'auto',
    ...options,
  });

  if (!optimizedUrl || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 rounded-xl overflow-hidden ${
          containerClassName || className
        }`}
      >
        {fallbackIcon || <ImageIcon className="w-6 h-6 opacity-60" />}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse rounded-inherit" />
      )}
      <img
        src={optimizedUrl}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        {...props}
      />
    </div>
  );
};
