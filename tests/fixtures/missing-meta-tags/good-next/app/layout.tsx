export const metadata = {
  title: 'My App',
  description: 'Does a thing',
  openGraph: { images: ['/og.png'] },
};
export default function RootLayout({ children }) { return <html><body>{children}</body></html>; }
