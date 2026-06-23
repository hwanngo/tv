/** Mirrors the Go bridge JSON. `url` is present for client-parsed channels and
 *  for backend http(s) channels; it is absent for backend udp/rtp channels. */
export interface Channel {
  id: string;
  name: string;
  group: string;
  logo: string;
  tvgId: string;
  url?: string;
  featured?: boolean;
  live?: boolean;
}

/** XMLTV programme, times as RFC3339 (from the Go EPG endpoint). */
export interface Programme {
  start: string;
  stop: string;
  title: string;
  desc?: string;
}

/** Persisted source configuration driving channels/EPG/playback. */
export interface Source {
  playlist: string;
  epg: string;
  backend: string; // bridge base URL (channel list + EPG + HLS + CORS proxy); '/bridge' = same-origin
}
