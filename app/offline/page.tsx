export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="offline-fallback">
      <h1>Você está offline</h1>
      <p>
        Esta página ainda não foi salva no dispositivo. Abra-a uma vez com
        internet e ela ficará disponível offline depois.
      </p>
      <p>As páginas já visitadas continuam acessíveis pelo menu.</p>
    </div>
  );
}
