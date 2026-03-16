'use client'

export default function ScrollArrow() {
  return (
    <button
      onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
      className="animate-bounce-arrow cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
      aria-label="아래로 스크롤"
    >
      <svg
        width="36"
        height="20"
        viewBox="0 0 36 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white"
      >
        <path
          d="M2 2L18 17L34 2"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
