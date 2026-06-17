import QRCode from 'qrcode';

export async function GET(request) {
  const url = new URL(request.url).searchParams.get('url');
  if (!url) return new Response('Missing url', { status: 400 });

  const dataUrl = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const base64 = dataUrl.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
