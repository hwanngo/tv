package main

import "testing"

// TestFirstCodec covers the multi-line ffprobe output that broke the stream-copy
// guard: the FPT multicast probes as "h264\nh264", which a bare TrimSpace left
// intact, so codec != "h264" and the channel was needlessly hardware-transcoded.
func TestFirstCodec(t *testing.T) {
	cases := map[string]string{
		"h264\n":         "h264",
		"h264\nh264\n":   "h264", // MPTS double-print — the actual bug
		"h264\n\nh264\n": "h264",
		"  hevc  \n":     "hevc",
		"hevc":           "hevc",
		"\nmpeg2video\n": "mpeg2video",
		"":               "",
		"\n\n":           "",
	}
	for in, want := range cases {
		if got := firstCodec(in); got != want {
			t.Errorf("firstCodec(%q) = %q, want %q", in, got, want)
		}
	}
}
