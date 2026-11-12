export default function HeyGenVideo() {
  return (
    <iframe
      className="w-full max-w-3xl my-7 aspect-video rounded-lg border border-gray-700 shadow-lg"
      width="560"
      height="315"
      src="https://app.heygen.com/embeds/c4a09e5250f34641885ebd6f84f3ff3d"
      title="Check out a new AI Video I just made!"
      frameBorder="0"
      allow="encrypted-media; fullscreen;"
      allowFullScreen
    />
  );
}
