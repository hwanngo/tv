import { useEffect, useState } from 'react';
import { csx } from '@utils/cssString';
import { tileBox } from '@src/pages/Watch/watchStyles';

export interface ChannelTileProps {
  logo: string;
  name: string;
  size: number;
  radius: string;
}

/**
 * Small square logo tile for the channel list (.dc:193) and the now-playing header.
 * Dark tile by default so light/white channel logos stay visible against it. When
 * the logo URL is missing or fails to load, it falls back to the channel's initial
 * instead of an empty box.
 */
const ChannelTile = ({ logo, name, size, radius }: ChannelTileProps) => {
  const [failed, setFailed] = useState(false);
  // Reset on logo change so a reused tile (e.g. the now-playing header switching
  // channels) re-attempts the new URL instead of staying stuck on the fallback.
  useEffect(() => {
    setFailed(false);
  }, [logo]);

  const initial = name.trim().charAt(0).toUpperCase() || '#';

  return (
    <span style={csx(tileBox(size, radius))}>
      {logo && !failed ? (
        <img
          src={logo}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            width: size * 0.75,
            height: size * 0.75,
            objectFit: 'contain',
            // Faint light halo so a dark logo keeps an edge on the dark tile.
            filter: 'drop-shadow(0 0 1.5px rgba(255,255,255,0.4))',
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            fontSize: size * 0.42,
            fontWeight: 700,
            color: '#8a8a90',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {initial}
        </span>
      )}
    </span>
  );
};

export default ChannelTile;
