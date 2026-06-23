import { useEffect, useRef } from 'react';
import { usePlayer } from '@hooks/usePlayer';

type Props = {
  url: string;
  muted: boolean;
  preferNative?: boolean;
  onVideoEl?: (v: HTMLVideoElement | null) => void;
};

/** Plays a direct http(s) URL via hls.js/native (usePlayer) and reports its
 *  <video> to the parent for overlay/mute wiring. */
const DirectVideo = ({ url, muted, preferNative, onVideoEl }: Props) => {
  const ref = useRef<HTMLVideoElement>(null);
  usePlayer(ref, url, preferNative);

  useEffect(() => {
    onVideoEl?.(ref.current);
    return () => onVideoEl?.(null);
  }, [onVideoEl]);

  return (
    <video
      ref={ref}
      playsInline
      muted={muted}
      autoPlay
      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }}
    />
  );
};

export default DirectVideo;
