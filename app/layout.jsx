import './globals.css';

export const metadata = {
  title: 'Grid Runner',
  description: 'Le jeu de grille multijoueur',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Michroma&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
