import os from 'os';

export async function GET() {
  const nets = os.networkInterfaces();
  const addresses = [];
  Object.keys(nets).forEach((name) => {
    nets[name].forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) addresses.push(net.address);
    });
  });

  const ip = addresses[0] || 'localhost';
  const port = process.env.PORT || 3000;

  return Response.json({ url: `http://${ip}:${port}/play` });
}
