type Props = {
  onClose: () => void
}

export function ICloudOffModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-[440px] px-8 py-9 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-5">
          <CloudGlyph />
        </div>
        <div className="text-[20px] font-semibold text-foreground mb-3">iCloud Drive</div>
        <div className="text-[13px] leading-relaxed text-muted-foreground mb-2">
          Turn on iCloud Drive to store your files in iCloud and access them anytime on all your devices.
        </div>
        <a
          href="https://support.apple.com/en-us/HT204025"
          onClick={(e) => { e.preventDefault(); window.open('https://support.apple.com/en-us/HT204025', '_blank') }}
          className="text-[13px] text-primary hover:underline"
        >
          Learn More…
        </a>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-2 border border-border/60 text-foreground text-[13px] hover:bg-surface-3 transition"
          >
            Not Now
          </button>
          <button
            onClick={() => { window.fs.openAppleIdSettings(); onClose() }}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-primary to-[hsl(232_90%_65%)] text-white text-[13px] hover:brightness-110 transition shadow-sm"
          >
            Open Apple Account Settings…
          </button>
        </div>
      </div>
    </div>
  )
}

function CloudGlyph() {
  return (
    <div className="w-20 h-20 rounded-2xl bg-white shadow-md flex items-center justify-center">
      <svg viewBox="0 0 64 64" width="56" height="56">
        <defs>
          <linearGradient id="icloud-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A8D9FF" />
            <stop offset="100%" stopColor="#3FA0FF" />
          </linearGradient>
        </defs>
        <path
          fill="url(#icloud-grad)"
          d="M48 36c0-7-5-13-12-13-1 0-3 0-4 1-2-4-7-7-12-7-7 0-13 6-13 13 0 1 0 2 1 3-4 1-7 5-7 9 0 6 5 11 11 11h32c6 0 11-5 11-11 0-3-2-5-7-6z"
        />
      </svg>
    </div>
  )
}
