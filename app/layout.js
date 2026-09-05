import './globals.css';

export const metadata = {
  title: 'Prank Call',
  description: 'Pick a number. Ring someone. See who picks up.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen bg-ink text-white">{children}</body>
    </html>
  );
}
