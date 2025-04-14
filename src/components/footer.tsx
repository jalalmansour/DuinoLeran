import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t bg-background/50 py-6 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <div className="flex flex-col items-center space-y-2 md:items-start">
            <div className="flex items-center space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span className="bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-lg font-bold text-transparent">
                DuinoCourse AI
              </span>
            </div>
            <p className="text-center text-sm text-muted-foreground md:text-left">
              Transform any document into an interactive learning experience
            </p>
          </div>

          <div className="flex space-x-6">
            <Link href="/upload" className="text-sm text-muted-foreground hover:text-foreground">
              Upload
            </Link>
            <Link href="/preview" className="text-sm text-muted-foreground hover:text-foreground">
              Preview
            </Link>
            <Link href="/export" className="text-sm text-muted-foreground hover:text-foreground">
              Export
            </Link>
            <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
              Settings
            </Link>
          </div>

          <div className="text-center text-sm text-muted-foreground md:text-right">
            <p>
              Created by <span className="font-medium">Jalal Mansour & DuinoBot</span>
            </p>
            <p>© {new Date().getFullYear()} All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
