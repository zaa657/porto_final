import React, { useState } from 'react';

export function SkeletonImage({
  className = '',
  src,
  onLoad,
  onError,
  loading = 'lazy',
  alt = '',
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = (e) => {
    setLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setLoaded(true);
    onError?.(e);
  };

  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      className={`skeleton-image${loaded ? '' : ' is-loading'}${className ? ` ${className}` : ''}`}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
