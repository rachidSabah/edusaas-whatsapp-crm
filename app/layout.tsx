export const metadata = {
  title: 'EduSaaS WhatsApp CRM',
  description: 'WhatsApp CRM built with Next.js and Cloudflare',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}