#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/optimise-video.sh <input.mp4> <output.mp4>

Optional configuration:
  VIDEO_CRF=24          H.264 constant-rate factor (default: 24)
  VIDEO_SCALE=1920:1080 Explicit output size; omitted preserves source resolution
  VIDEO_FPS=30          Explicit output frame rate; omitted preserves source rate
EOF
}

output_path=""
completed=false

cleanup() {
  if [[ "$completed" != "true" && -n "$output_path" && -f "$output_path" ]]; then
    rm -f -- "$output_path"
  fi
}
trap cleanup EXIT INT TERM

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_tool() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but is not installed or not on PATH."
}

probe_value() {
  local file=$1
  local stream_selector=$2
  local entry=$3
  local value

  if [[ -n "$stream_selector" ]]; then
    if ! value=$(ffprobe -v error -select_streams "$stream_selector" -show_entries "$entry" -of default=noprint_wrappers=1:nokey=1 "$file"); then
      return 1
    fi
  elif ! value=$(ffprobe -v error -show_entries "$entry" -of default=noprint_wrappers=1:nokey=1 "$file"); then
    return 1
  fi
  printf '%s' "$value"
}

format_bytes() {
  awk -v bytes="$1" 'BEGIN { printf "%.2f MiB", bytes / 1048576 }'
}

if [[ ${1:-} == "--help" || ${1:-} == "-h" ]]; then
  usage
  exit 0
fi

[[ $# -eq 2 ]] || {
  usage >&2
  exit 2
}

require_tool ffmpeg
require_tool ffprobe
require_tool awk
require_tool paste
require_tool tr
require_tool wc

if command -v sha256sum >/dev/null 2>&1; then
  checksum_command=(sha256sum)
elif command -v shasum >/dev/null 2>&1; then
  checksum_command=(shasum -a 256)
else
  fail "sha256sum or shasum is required to produce the SHA-256 checksum."
fi

input=$1
requested_output=$2
crf=${VIDEO_CRF:-24}
scale=${VIDEO_SCALE:-}
fps=${VIDEO_FPS:-}

[[ -f "$input" ]] || fail "Input MP4 does not exist: $input"
[[ "$requested_output" == *.mp4 ]] || fail "Output path must end in .mp4: $requested_output"
[[ "$crf" =~ ^([0-9]|[1-4][0-9]|5[01])$ ]] || fail "VIDEO_CRF must be an integer from 0 to 51."

input_dir=$(cd "$(dirname "$input")" && pwd -P)
input_path="$input_dir/$(basename "$input")"
output_dir=$(dirname "$requested_output")
mkdir -p -- "$output_dir"
output_dir=$(cd "$output_dir" && pwd -P)
output_path="$output_dir/$(basename "$requested_output")"

[[ "$input_path" != "$output_path" ]] || fail "Input and output resolve to the same file; masters are never overwritten."
[[ ! -e "$output_path" ]] || fail "Output already exists; refusing to overwrite any file: $output_path"

input_format=$(probe_value "$input_path" "" "format=format_name") ||
  fail "Input cannot be probed: $input_path"
[[ "$input_format" == *mp4* ]] || fail "Input is not an MP4 container (ffprobe format: $input_format)."

input_duration=$(probe_value "$input_path" "" "format=duration") ||
  fail "Input duration cannot be probed."
input_width=$(probe_value "$input_path" "v:0" "stream=width") ||
  fail "Input video stream cannot be probed."
input_height=$(probe_value "$input_path" "v:0" "stream=height") ||
  fail "Input video stream cannot be probed."
input_fps=$(probe_value "$input_path" "v:0" "stream=avg_frame_rate") ||
  fail "Input frame rate cannot be probed."
input_audio_codecs=$(probe_value "$input_path" "a" "stream=codec_name") ||
  fail "Input audio streams cannot be probed."
[[ -n "$input_audio_codecs" ]] || fail "Input has no audio stream; website output must preserve audio."
input_audio_count=$(printf '%s\n' "$input_audio_codecs" | awk 'NF { count++ } END { print count + 0 }')
input_bytes=$(wc -c < "$input_path" | tr -d '[:space:]')

ffmpeg_args=(
  -hide_banner
  -loglevel warning
  -stats
  -n
  -i "$input_path"
  -map 0:v:0
  -map 0:a
  -map_metadata 0
  -c:v libx264
  -preset slow
  -crf "$crf"
  -pix_fmt yuv420p
  -c:a aac
  -b:a 128k
  -movflags +faststart
)

if [[ -n "$scale" ]]; then
  ffmpeg_args+=(-vf "scale=$scale")
fi
if [[ -n "$fps" ]]; then
  ffmpeg_args+=(-r "$fps")
fi
ffmpeg_args+=("$output_path")

printf 'Optimising %s\n' "$input_path"
ffmpeg "${ffmpeg_args[@]}" || fail "FFmpeg encoding failed."

output_format=$(probe_value "$output_path" "" "format=format_name") ||
  fail "Output cannot be probed."
[[ "$output_format" == *mp4* ]] || fail "Output is not video/mp4 (ffprobe format: $output_format)."

output_duration=$(probe_value "$output_path" "" "format=duration") ||
  fail "Output duration cannot be probed."
output_width=$(probe_value "$output_path" "v:0" "stream=width") ||
  fail "Output video stream cannot be probed."
output_height=$(probe_value "$output_path" "v:0" "stream=height") ||
  fail "Output video stream cannot be probed."
output_fps=$(probe_value "$output_path" "v:0" "stream=avg_frame_rate") ||
  fail "Output frame rate cannot be probed."
output_video_codec=$(probe_value "$output_path" "v:0" "stream=codec_name") ||
  fail "Output video codec cannot be probed."
output_audio_codecs=$(probe_value "$output_path" "a" "stream=codec_name") ||
  fail "Output audio streams cannot be probed."

[[ "$output_video_codec" == "h264" ]] || fail "Output video codec is $output_video_codec, expected h264."
[[ -n "$output_audio_codecs" ]] || fail "Output audio is missing."
if printf '%s\n' "$output_audio_codecs" | awk 'NF && $0 != "aac" { exit 1 }'; then
  :
else
  fail "Every output audio stream must use AAC."
fi

output_audio_count=$(printf '%s\n' "$output_audio_codecs" | awk 'NF { count++ } END { print count + 0 }')
[[ "$output_audio_count" -eq "$input_audio_count" ]] ||
  fail "Output audio stream count ($output_audio_count) differs from input ($input_audio_count)."

if [[ -z "$scale" ]]; then
  [[ "$output_width" == "$input_width" && "$output_height" == "$input_height" ]] ||
    fail "Resolution changed without VIDEO_SCALE: ${input_width}x${input_height} -> ${output_width}x${output_height}."
fi
if [[ -z "$fps" ]]; then
  [[ "$output_fps" == "$input_fps" ]] ||
    fail "Frame rate changed without VIDEO_FPS: $input_fps -> $output_fps."
fi

duration_difference=$(awk -v input="$input_duration" -v output="$output_duration" \
  'BEGIN { difference = input - output; if (difference < 0) difference = -difference; printf "%.6f", difference }')
awk -v difference="$duration_difference" 'BEGIN { exit !(difference <= 0.5) }' ||
  fail "Duration differs by ${duration_difference}s, exceeding the 0.5s limit."

output_bytes=$(wc -c < "$output_path" | tr -d '[:space:]')
[[ "$output_bytes" -le "$input_bytes" ]] ||
  fail "Output is larger than input: $output_bytes bytes > $input_bytes bytes."

compression_percentage=$(awk -v input="$input_bytes" -v output="$output_bytes" \
  'BEGIN { printf "%.2f", ((input - output) / input) * 100 }')
output_bitrate_kbps=$(awk -v bytes="$output_bytes" -v duration="$output_duration" \
  'BEGIN { printf "%.0f", (bytes * 8 / duration) / 1000 }')
checksum=$("${checksum_command[@]}" "$output_path" | awk '{ print $1 }')

completed=true

cat <<EOF

VIDEO_OPTIMISATION_RESULT
Input: $input_path
Output: $output_path
Input size: $input_bytes bytes ($(format_bytes "$input_bytes"))
Output size: $output_bytes bytes ($(format_bytes "$output_bytes"))
Compression: $compression_percentage%
Input duration: ${input_duration}s
Output duration: ${output_duration}s
Duration difference: ${duration_difference}s
Resolution: ${output_width}x${output_height}
Frame rate: $output_fps
Video codec: $output_video_codec
Audio codec(s): $(printf '%s' "$output_audio_codecs" | paste -sd, -)
Output bitrate: ${output_bitrate_kbps} kb/s
SHA-256: $checksum
EOF
